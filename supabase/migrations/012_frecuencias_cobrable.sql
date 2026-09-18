-- Migración 012: "Frecuencias" — pestaña "Cobrable vs No".
--
-- Guarda RAW.cobrable[year][mes] = {si:{uf:count}, no:{uf:count},
-- valor_si, valor_no} del motor de Pedro. Una fila con uf=null trae
-- los totales (si/no sumando todas las UF, más valor_si/valor_no en
-- pesos); las filas con uf poblado traen el desglose por UF (sin
-- valor, el motor no lo desglosa por UF).

create table if not exists frecuencias_cobrable_mensual (
  id bigserial primary key,
  year int not null,
  month_num int not null,
  month_name text not null,
  uf text,
  si int not null default 0,
  no int not null default 0,
  valor_si numeric,
  valor_no numeric,
  source_snapshot text not null,
  synced_at timestamptz not null default now(),
  unique (year, month_num, uf)
);

create index if not exists idx_frecuencias_cobrable_year_month on frecuencias_cobrable_mensual(year, month_num);

alter table frecuencias_cobrable_mensual enable row level security;
