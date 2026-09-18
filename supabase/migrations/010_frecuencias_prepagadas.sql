-- Migración 010: "Frecuencias" — pestaña "Prepagadas" (parcial).
--
-- Guarda RAW.prepagadas_mens (evolución mensual, todas las prepagadas
-- combinadas) y RAW.prepagadas_top (ranking por contrato/entidad) del
-- motor de Pedro. Deliberadamente NO incluye el embudo de paciente
-- nuevo (RAW.ordenes_funnel/ordenes_prep), el buscador de tarifas
-- (RAW.tarifas_prep) ni el ranking "por Empresa" (RAW.prepagadas_entidad)
-- porque esos campos vienen vacíos (null) en el export automático
-- actual del tablero de Pedro — no es un dato que nos falte sincronizar,
-- el motor no los está calculando en la corrida de GitHub Actions.

create table if not exists frecuencias_prepagadas_mensual (
  id bigserial primary key,
  year int not null,
  month_num int not null,
  month_name text not null,
  freq int not null default 0,
  valor numeric not null default 0,
  source_snapshot text not null,
  synced_at timestamptz not null default now(),
  unique (year, month_num)
);

create table if not exists frecuencias_prepagadas_ranking (
  id bigserial primary key,
  year int not null,
  contrato text not null,
  freq int not null default 0,
  valor numeric not null default 0,
  source_snapshot text not null,
  synced_at timestamptz not null default now(),
  unique (year, contrato)
);

create index if not exists idx_frecuencias_prep_mensual_year on frecuencias_prepagadas_mensual(year);
create index if not exists idx_frecuencias_prep_ranking_year on frecuencias_prepagadas_ranking(year);

alter table frecuencias_prepagadas_mensual enable row level security;
alter table frecuencias_prepagadas_ranking enable row level security;
