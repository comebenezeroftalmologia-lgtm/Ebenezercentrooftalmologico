import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envPath = process.argv[2];
const usuario = process.argv[3];
const nombreCompleto = process.argv[4];
const password = process.argv[5];

if (!envPath || !usuario || !nombreCompleto || !password) {
  console.error("Uso: node bootstrap_admin.mjs <.env.local> <usuario> <\"Nombre Completo\"> <password>");
  process.exit(1);
}

const env = {};
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const email = `${usuario.toLowerCase()}@procesos.ebenezer.local`;
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: created, error: createError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (createError) {
  console.error("Error creando usuario de auth:", createError.message);
  process.exit(1);
}

const { error: profileError } = await supabase.from("app_users").insert({
  id: created.user.id,
  nombre_completo: nombreCompleto,
  email,
  is_admin: true,
});

if (profileError) {
  console.error("Usuario de auth creado pero falló el perfil:", profileError.message);
  process.exit(1);
}

console.log(`Administrador creado. Usuario: ${usuario} — id: ${created.user.id}`);
