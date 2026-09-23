-- Migración 013: "Frecuencias" — detalle DÍA A DÍA.
--
-- Por qué existe:
-- Hasta ahora el módulo solo guardaba agregados por mes
-- (frecuencias_conteos). Con eso no se puede comparar "a la fecha":
-- al sumar el año, 2026 entra con 9 meses (el último a medias) y 2025
-- con 12, y la resta da un rojo enorme que no corresponde a la realidad.
-- El 18-09-2026 la tarjeta "Diferencia" mostraba -24.927 cuando el dato
-- correcto, cortando ambos años al mismo día, era +368.
--
-- El dato fino YA viaja en el RAW del motor (bloque RAW.dias, fecha por
-- fecha desde 2024-01-02); simplemente se descartaba al cargar. Esta
-- tabla lo conserva. Son ~10.300 filas, no ~600.000: el motor ya viene
-- agregado por día/UF/empresa, no trae registros de pacientes.
--
-- Habilita:
--   * corte "a la fecha" real (mismo día de corte en todos los años)
--   * filtro por rango de días y por día de la semana
--   * tarjeta de cierre del día y aviso de datos atrasados
--
-- Alimentada por scripts/frecuencias/ingest.mjs (sección "días"), que a
-- su vez recibe scripts/frecuencias/sync_from_tablero.mjs.

create table if not exists frecuencias_dias (
  id bigserial primary key,
  fecha date not null,
  uf text not null,
  grupo text not null,             -- empresa/contrato; puede contener "MUTUAL"
  cantidad int not null default 0, -- frecuencia (peso W del motor)
  valor numeric not null default 0,-- pesos
  source_snapshot text not null,
  synced_at timestamptz not null default now(),
  unique (fecha, uf, grupo)
);

create index if not exists idx_frecuencias_dias_fecha on frecuencias_dias(fecha);
create index if not exists idx_frecuencias_dias_uf on frecuencias_dias(uf);
create index if not exists idx_frecuencias_dias_grupo on frecuencias_dias(grupo);

alter table frecuencias_dias enable row level security;
