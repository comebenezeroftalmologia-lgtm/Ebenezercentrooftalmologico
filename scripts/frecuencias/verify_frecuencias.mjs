import fs from "fs";
import { Client } from "pg";

const envPath = process.argv[2];
const env = {};
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const client = new Client({ connectionString: env.SUPABASE_DB_POOLER_URL });
await client.connect();

async function q(label, sql) {
  console.log(`\n=== ${label} ===`);
  const res = await client.query(sql);
  console.log(JSON.stringify(res.rows, null, 2));
}

await q("total rows", "select count(*) from frecuencias_mensual");
await q("granularity breakdown", `
  select
    (uf is null and grupo is null) as es_total,
    (uf is not null and grupo is null) as es_por_uf,
    (uf is null and grupo is not null) as es_por_grupo,
    (uf is not null and grupo is not null) as es_uf_grupo,
    count(*)
  from frecuencias_mensual
  group by 1,2,3,4
`);
await q("total 2026 agosto (should match meta.2026.agosto)", `
  select year, month_name, real, meta, base_prev, is_mtd, dias_calendario, dias_habiles
  from frecuencias_mensual where uf is null and grupo is null and year=2026 and month_name='agosto'
`);
await q("por UF 2026 agosto", `
  select uf, real, meta from frecuencias_mensual
  where grupo is null and uf is not null and year=2026 and month_name='agosto' order by uf
`);
await q("por grupo 2026 agosto", `
  select grupo, real, meta from frecuencias_mensual
  where uf is null and grupo is not null and year=2026 and month_name='agosto' order by grupo
`);
await q("source snapshot distinct", `select distinct source_snapshot from frecuencias_mensual`);

await client.end();
