-- 025 · Sincronización de afiliados MutualSer desde Google Sheets
-- La hoja de cálculo es la fuente (otras personas la actualizan); un script de la hoja
-- empuja los datos a esta tabla. Cada sincronización lleva un sync_id: al terminar,
-- se eliminan los afiliados que ya no están en la hoja.
-- Mínimo de datos: el bot no usa el celular, así que se descarta.

alter table public.mutualser_afiliados add column if not exists sync_id text;
alter table public.mutualser_afiliados drop column if exists celular;
create index if not exists mutualser_afiliados_sync_idx on public.mutualser_afiliados (sync_id);

-- Bitácora de sincronizaciones (quién/cuándo/cuántos).
create table if not exists public.mutualser_sincronizaciones (
  id          bigserial primary key,
  sync_id     text not null,
  recibidas   integer,
  eliminadas  integer,
  created_at  timestamptz not null default now()
);
alter table public.mutualser_sincronizaciones enable row level security;

select count(*) as afiliados_en_tabla from public.mutualser_afiliados;
