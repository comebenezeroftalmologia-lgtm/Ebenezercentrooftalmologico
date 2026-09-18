-- Migración 009: "Frecuencias" — módulo nativo, fase 2 (Resumen Comparativo).
--
-- Guarda la matriz completa año/mes/UF/empresa (RAW.mens_year_uf_grp y
-- RAW.valor_year_uf_grp del motor de Pedro), sin filtrar Mutual: el
-- incluir/excluir Mutual es un filtro de aplicación (se excluye cualquier
-- "grupo" cuyo nombre contenga "MUTUAL"), igual que hace el tablero
-- original en el cliente. Alimentada por scripts/frecuencias/ingest.mjs
-- (sección nueva), que a su vez recibe scripts/frecuencias/sync_from_tablero.mjs.

create table if not exists frecuencias_conteos (
  id bigserial primary key,
  year int not null,
  month_num int not null,          -- 1-12
  month_name text not null,        -- 'enero', 'febrero', ...
  uf text not null,
  grupo text not null,             -- empresa/contrato; el nombre puede contener "MUTUAL"
  cantidad int not null default 0, -- frecuencia (RAW.mens_year_uf_grp)
  valor numeric not null default 0,-- pesos (RAW.valor_year_uf_grp)
  dias_calendario int,
  dias_habiles int,
  source_snapshot text not null,
  synced_at timestamptz not null default now(),
  unique (year, month_num, uf, grupo)
);

create index if not exists idx_frecuencias_conteos_year_month on frecuencias_conteos(year, month_num);
create index if not exists idx_frecuencias_conteos_uf on frecuencias_conteos(uf);
create index if not exists idx_frecuencias_conteos_grupo on frecuencias_conteos(grupo);

alter table frecuencias_conteos enable row level security;
