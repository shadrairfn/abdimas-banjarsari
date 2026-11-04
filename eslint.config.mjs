import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import simpleImportSort from "eslint-plugin-simple-import-sort";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    files: ["src/**/*.{ts,tsx}", "scripts/**/*.mjs"],
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      curly: ["error", "all"],
      "max-statements-per-line": ["error", { max: 1 }],
      "no-nested-ternary": "error",
      "padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "*", next: ["return", "throw", "try", "function"] },
        { blankLine: "always", prev: ["if", "for", "while", "try"], next: "*" },
        { blankLine: "always", prev: "directive", next: "*" },
        { blankLine: "always", prev: "import", next: "*" },
        { blankLine: "any", prev: "import", next: "import" },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Copied from node_modules by scripts/copy-maplibre-worker.mjs.
    "public/maplibre/**",
    ".hallmark/**",
  ]),
]);

export default eslintConfig;
