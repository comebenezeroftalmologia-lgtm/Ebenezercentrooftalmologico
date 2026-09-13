-- Migración 004: módulo "Frecuencias" — utilización real vs. meta mensual,
-- por unidad funcional (UF) y por empresa/contrato (grupo). El dato de
-- origen es SISMA, pero pasa por un proceso de validación/clasificación
-- (persona + IA) antes de esta carga — no es una sincronización automática
-- todavía. Para (re)cargar un nuevo export, ver
-- scripts/frecuencias/ingest.mjs.

create table if not exists frecuencias_mensual (
  id bigserial primary key,
  year int not null,
  month_num int not null,            -- 1-12
  month_name text not null,          -- 'enero', 'febrero', ...
  uf text,                            -- null = todas las UF (total)
  grupo text,                         -- null = todos los grupos/empresas (total)
  real int not null default 0,
  meta int not null default 0,
  base_prev int not null default 0,  -- real del mismo mes, año anterior (comparación)
  dias_calendario int,
  dias_habiles int,
  is_mtd boolean not null default false, -- true = mes en curso, corte parcial (no comparable 1:1 con meses cerrados)
  source_snapshot text not null,     -- ej. "BASE_CLASIFICADA (motor nuevo) - 2026-08-24 08:23"
  synced_at timestamptz not null default now(),
  unique (year, month_num, uf, grupo)
);

create index if not exists idx_frecuencias_year_month on frecuencias_mensual(year, month_num);
create index if not exists idx_frecuencias_uf on frecuencias_mensual(uf) where uf is not null;
create index if not exists idx_frecuencias_grupo on frecuencias_mensual(grupo) where grupo is not null;

alter table frecuencias_mensual enable row level security;
