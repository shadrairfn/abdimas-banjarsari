import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { createClient } from "@supabase/supabase-js";

const envFile = existsSync(".env.local") ? ".env.local" : existsSync(".env") ? ".env" : null;
if (envFile) loadEnvFile(envFile);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const fullName = process.env.ADMIN_FULL_NAME?.trim() || "Administrator UMKM";

if (!url || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local or .env.");
}
if (!email || !email.includes("@")) throw new Error("ADMIN_EMAIL must contain a valid email address.");
if (!password || password.length < 8) throw new Error("ADMIN_PASSWORD must contain at least 8 characters.");
if (fullName.length < 2 || fullName.length > 120) throw new Error("ADMIN_FULL_NAME must contain 2-120 characters.");

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(targetEmail) {
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === targetEmail);
    if (user) return user;
    if (data.users.length < 100) return null;
  }
}

let user = await findUserByEmail(email);
if (user) {
  const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
    email,
    password,
    email_confirm: true,
    app_metadata: { ...user.app_metadata, role: "admin" },
    user_metadata: { ...user.user_metadata, full_name: fullName },
  });
  if (error) throw error;
  user = data.user;
} else {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "admin" },
    user_metadata: { full_name: fullName },
  });
  if (error) throw error;
  user = data.user;
}

const { error: profileError } = await supabase.from("admins").upsert({
  user_id: user.id,
  email,
  full_name: fullName,
  is_active: true,
}, { onConflict: "user_id" });
if (profileError) throw profileError;

console.log(`Admin account is ready: ${email} (${user.id})`);
