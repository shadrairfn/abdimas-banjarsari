import { createClient } from "@supabase/supabase-js";
import { loadSupabaseEnv } from "./load-env.mjs";

const { url, serviceRoleKey } = loadSupabaseEnv();
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const fullName = process.env.ADMIN_FULL_NAME?.trim() || "Administrator UMKM";

if (!email || !email.includes("@")) {
  throw new Error("ADMIN_EMAIL must contain a valid email address.");
}

if (!password || password.length < 8) {
  throw new Error("ADMIN_PASSWORD must contain at least 8 characters.");
}

if (fullName.length < 2 || fullName.length > 120) {
  throw new Error("ADMIN_FULL_NAME must contain 2-120 characters.");
}

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
