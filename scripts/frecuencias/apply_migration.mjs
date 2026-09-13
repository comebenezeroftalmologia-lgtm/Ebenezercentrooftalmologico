import fs from "fs";
import { Client } from "pg";

const envPath = process.argv[2];
const sqlPath = process.argv[3];

const env = {};
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const sql = fs.readFileSync(sqlPath, "utf8");

const client = new Client({ connectionString: env.SUPABASE_DB_POOLER_URL });
await client.connect();
try {
  await client.query(sql);
  console.log("Migración aplicada OK.");
} finally {
  await client.end();
}
