import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envPath = process.argv[2];
const oldEmail = process.argv[3];
const newEmail = process.argv[4];

if (!envPath || !oldEmail || !newEmail) {
  console.error("Uso: node migrate_admin_email.mjs <.env.local> <email-actual> <email-nuevo>");
  process.exit(1);
}

const env = {};
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: profile, error: findError } = await supabase
  .from("app_users")
  .select("id, email")
  .eq("email", oldEmail)
  .single();

if (findError || !profile) {
  console.error("No se encontró app_users con ese email:", findError?.message ?? "sin datos");
  process.exit(1);
}

const { error: authError } = await supabase.auth.admin.updateUserById(profile.id, {
  email: newEmail,
  email_confirm: true,
});
if (authError) {
  console.error("Error actualizando el email en Auth:", authError.message);
  process.exit(1);
}

const { error: profileError } = await supabase
  .from("app_users")
  .update({ email: newEmail })
  .eq("id", profile.id);
if (profileError) {
  console.error("Email de Auth actualizado, pero falló app_users:", profileError.message);
  process.exit(1);
}

console.log(`OK: ${oldEmail} -> ${newEmail} (id ${profile.id})`);
