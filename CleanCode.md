---
name: "js-backend-clean-code"
description: "Use when writing or refactoring a JavaScript/TypeScript backend (Express, Fastify, NestJS, Hono, etc.): enforces asyncHandler, ApiResponse, SuccessResponse, token generator, and junior-readable formatting."
---

# JS/TS Backend Clean Code Standard

Goal: every backend file must be understandable by a **junior developer** on first read. Readability beats cleverness.

> The examples below are written for **Express + Prisma (ESM)**. They are a reference, not a template to copy blindly. **Always adapt them to the framework, ORM, and language actually used in the project** (Fastify `reply`, NestJS exception filters/interceptors, Hono `c.json`, TypeORM/Drizzle/Mongoose, TS types, etc.). Keep the *concepts* identical: one async wrapper, one error shape, one success shape, one token generator.

## 1. Project layout

```
src/
  controllers/   # one file per resource: userController.js, campaignController.js
  routes/        # one file per resource, only wires URL -> middleware -> controller
  middlewares/   # auth, upload, validation
  utils/         # asyncHandler, ApiResponse, SuccessResponse, generateToken, prismaClient
  config/
```

Before creating utils, check whether the project already has them (often `src/utils`). Reuse and extend; never create a second version.

## 2. Mandatory utilities

### 2.1 `asyncHandler` — no try/catch in controllers

```js
// utils/asyncHandler.js
const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise
            .resolve(requestHandler(req, res, next))
            .catch((error) => next(error))
    }
}

export { asyncHandler }
```

Every controller is wrapped in `asyncHandler`. Errors are **thrown**, never sent manually with `res.status(4xx)` inside the controller.

### 2.2 `ApiResponse` — the error class (one shape for all errors)

```js
// utils/ApiResponse.js
class ApiResponse extends Error {
    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],
        stack = ""
    ) {
        super(message)
        this.statusCode = statusCode
        this.message = message
        this.data = null
        this.success = false
        this.errors = errors

        if (stack) {
            this.stack = stack
        } else {
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

export { ApiResponse }
```

Usage: `throw new ApiResponse(404, "User not found")`.
(If the project already calls this `apiError`/`ApiError`, keep the existing name — consistency inside a project matters more than the name.)

There must be ONE global error middleware that turns it into JSON:

```js
// middlewares/errorHandler.js
const errorHandler = (error, req, res, next) => {
    const statusCode = error.statusCode || 500

    return res.status(statusCode).json({
        success: false,
        message: error.message || "Internal server error",
        errors: error.errors || [],
        data: null,
    })
}

export { errorHandler }
```

### 2.3 `SuccessResponse` — one shape for all successes

```js
// utils/SuccessResponse.js
class SuccessResponse {
    constructor(statusCode, message = "Success", data = null) {
        this.statusCode = statusCode
        this.message = message
        this.data = data
        this.success = statusCode < 400
    }
}

export { SuccessResponse }
```

Usage:

```js
return res
    .status(200)
    .json(new SuccessResponse(200, "Bank account created successfully", bankAccount))
```

Every response (success or error) therefore has the same keys: `success`, `message`, `data` (+ `errors` on failure). Never hand-write `{ message, data, success }` objects in controllers.

### 2.4 `generateToken` — login token generator

```js
// utils/generateToken.js
import jwt from "jsonwebtoken"
import prisma from "./prismaClient.js"

/**
 * Create an access token and a refresh token for a user,
 * then store the refresh token in the database.
 * @param {string} userId
 * @returns {Promise<{ accessToken: string, refreshToken: string }>}
 */
const generateAccessAndRefreshToken = async (userId) => {
    const payload = { id: userId }

    const accessToken = jwt.sign(
        payload,
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m" }
    )

    const refreshToken = jwt.sign(
        payload,
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d" }
    )

    await prisma.user.update({
        where: { id: userId },
        data: { refreshToken },
    })

    return { accessToken, refreshToken }
}

export { generateAccessAndRefreshToken }
```

Rules: the generator returns **plain tokens only** (no `message`/`success` wrapper — that is the controller's job). Secrets and expiry come from env, never hard-coded. Login, refresh, and logout all use this one util.

## 3. Controller pattern

Each controller follows the same order, separated by blank lines:

1. Read input (`req.user`, `req.params`, `req.body`, `req.query`) with destructuring
2. Validate input → `throw new ApiResponse(400, ...)`
3. Check existence / permission → `throw new ApiResponse(404 | 403, ...)`
4. Do the work (DB, service call)
5. Return `SuccessResponse`

```js
/**
 * Create a new bank account for the logged-in user.
 * @route POST /api/bank-accounts
 * @throws {ApiResponse} 400 if a field is empty or the account already exists
 */
const createBankAccount = asyncHandler(async (req, res) => {
    const userId = req.user.id
    const { bankCode, accountNumber, accountName, isPrimary } = req.body

    const requiredFields = [bankCode, accountNumber, accountName]
    const hasEmptyField = requiredFields.some((field) => !field || String(field).trim() === "")

    if (hasEmptyField) {
        throw new ApiResponse(400, "All fields are required")
    }

    const duplicateAccount = await prisma.bankAccount.findFirst({
        where: {
            userId,
            bankCode,
            accountNumber,
        },
    })

    if (duplicateAccount) {
        throw new ApiResponse(400, "Bank account with same details already exists")
    }

    if (isPrimary) {
        await prisma.bankAccount.updateMany({
            where: { userId, isPrimary: true },
            data: { isPrimary: false },
        })
    }

    const bankAccount = await prisma.bankAccount.create({
        data: {
            userId,
            bankCode: String(bankCode).trim(),
            accountNumber: String(accountNumber).trim(),
            accountName: String(accountName).trim(),
            isPrimary: Boolean(isPrimary),
        },
    })

    return res
        .status(201)
        .json(new SuccessResponse(201, "Bank account created successfully", bankAccount))
})
```

Login example:

```js
const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body

    if (!email || !password) {
        throw new ApiResponse(400, "Email and password are required")
    }

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
        throw new ApiResponse(404, "User not found")
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password)

    if (!isPasswordCorrect) {
        throw new ApiResponse(401, "Invalid credentials")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user.id)

    const responseData = {
        user: {
            id: user.id,
            email: user.email,
            fullname: user.fullname,
        },
        accessToken,
        refreshToken,
    }

    return res
        .status(200)
        .json(new SuccessResponse(200, "Login successful", responseData))
})
```

Export all controllers at the bottom in one statement:
`export { createBankAccount, getBankAccounts, editBankAccount, deleteBankAccount }`

## 4. Formatting rules (human-readable)

- **One statement per line.** Never chain several actions on one line.
- Max ~100 characters per line. If a call has more than 2 arguments or an object argument, break it over multiple lines (one property per line, trailing comma).
- Always use braces for `if`, even single-line: no `if (!x) throw ...` on one line.
- Blank line between logical steps (input → validate → query → respond).
- Complex conditions get a named variable first: `const hasEmptyField = ...; if (hasEmptyField) {...}`.
- No nested ternaries. No ternary longer than one short line.
- Max 2–3 levels of nesting; use early `throw`/`return` instead of `else` pyramids.
- Long templates (email HTML, etc.) go into their own util/template file, not inside the controller.
- Magic numbers become named constants: `const OTP_EXPIRY_MS = 5 * 60 * 1000`.
- Consistent indentation within a project (follow existing Prettier/ESLint config; default 4 spaces or the project's value). Consistent semicolon style.

## 5. Naming

- Variables/functions: `camelCase`, descriptive (`bankAccounts`, `isPasswordCorrect`, not `data`, `res2`, `x`). Do not mix `user_id` and `userId`.
- Booleans start with `is/has/can/should`.
- Controllers are verbs + resource: `createCampaign`, `getCampaignById`, `updateCampaign`, `deleteCampaign`.
- Classes/utility classes: `PascalCase` (`ApiResponse`, `SuccessResponse`).
- Constants: `UPPER_SNAKE_CASE`.

## 6. Documentation

- Every exported controller/util gets a short JSDoc: what it does, `@route`, important `@throws`.
- Write comments explaining **why**, not repeating **what** the code says.
- In TypeScript, type request bodies with an interface/DTO instead of long JSDoc `@param` lists.

## 7. Do / Don't

Don't:
- `try/catch` inside every controller (asyncHandler handles it)
- `res.status(400).json({...})` for errors inside controllers — throw `ApiResponse`
- Hand-built success objects — use `SuccessResponse`
- `console.log` left in controllers / logging secrets (API keys, tokens, configs)
- `new PrismaClient()` in multiple files — import the single client from `utils/prismaClient`
- Meaningless conditions like `isPrimary: true || false`
- Looping over all rows in JS to check duplicates — query the DB (`findFirst`/`findUnique`)
- Returning `200` for a creation — use `201`; use `401` for wrong credentials, `403` for forbidden, `404` for not found
- Returning password, OTP, refresh token hash, or other secrets in response data — use `select`

Do:
- Wrap every handler with `asyncHandler`
- Validate first, fail early
- Keep controllers thin; move reusable or external-service logic (payment, email, upload) to `utils/` or `services/`
- Keep the response shape identical across the entire API

## 8. Framework adaptation notes

- **Express**: as shown.
- **Fastify**: async handlers already propagate errors; asyncHandler optional, keep `ApiResponse` + a `setErrorHandler`, use `reply.code(x).send(new SuccessResponse(...))`.
- **NestJS**: replace asyncHandler with built-in exception handling; make `ApiResponse` extend `HttpException` or map it in an exception filter; wrap success with an interceptor producing the `SuccessResponse` shape.
- **Hono / Next.js route handlers**: use `app.onError` / a wrapper function, return `c.json(new SuccessResponse(...), status)`.
- **TypeScript**: make `SuccessResponse<T>` generic, type `asyncHandler` with `RequestHandler`, and enable `strict`.

## 9. Checklist before finishing

- [ ] Every handler wrapped in asyncHandler (or framework equivalent)
- [ ] All errors thrown as `ApiResponse`, handled by one global error middleware
- [ ] All successes returned via `SuccessResponse`
- [ ] Login/refresh use the single token generator
- [ ] No line doing more than one thing; long calls broken over lines
- [ ] Clear names, no leftover `console.log`, no secrets in responses
- [ ] A junior could explain each function after one read