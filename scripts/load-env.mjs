import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

const ENV_FILES = [".env.local", ".env"];

/** Load the first env file that exists, and return the Supabase settings the scripts need. */
export function loadSupabaseEnv() {
  const envFile = ENV_FILES.find((file) => existsSync(file));

  if (envFile) {
    loadEnvFile(envFile);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local or .env.");
  }

  return { url, serviceRoleKey };
}
