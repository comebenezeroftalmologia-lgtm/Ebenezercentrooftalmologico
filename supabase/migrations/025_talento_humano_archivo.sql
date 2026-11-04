-- ---------------------------------------------------------------------
-- 025 · El archivo de trabajo de Talento Humano
--
-- Hasta ahora el tablero no guardaba nada: cada quien arrastraba su Excel.
-- Ahora hay UN archivo de trabajo: se sube una vez y todos los que tengan
-- el modulo ven lo mismo, sin volver a cargarlo.
--
-- DONDE VIVE Y POR QUE:
-- En un bucket PRIVADO de Supabase, igual que las fotos de perfil. NO en
-- el repositorio: el repositorio de la plataforma es publico, y este
-- archivo trae nombres completos, salarios, estado civil, hijos, dias de
-- incapacidad y evaluaciones de desempeno. Subirlo ahi seria publicarlo.
--
-- Solo se entrega por /api/talento-humano/archivo, que exige el modulo
-- 'talento_humano'. Sin sesion y sin ese permiso no se descarga.
-- ---------------------------------------------------------------------

-- Bucket privado (public = false). Mismo patron que 'avatares' en la 023.
insert into storage.buckets (id, name, public)
values ('talento-humano', 'talento-humano', false)
on conflict (id) do nothing;

-- Quien subio el archivo y cuando. Una sola fila: el archivo vigente.
-- Importa dejar rastro: si manana una cifra no cuadra, lo primero que hay
-- que poder responder es de que archivo salio y quien lo puso.
create table if not exists talento_humano_archivo (
  id            boolean primary key default true check (id),  -- fuerza fila unica
  ruta          text        not null,
  nombre_original text      not null,
  bytes         bigint      not null,
  subido_por    uuid        references app_users(id) on delete set null,
  subido_at     timestamptz not null default now()
);

alter table talento_humano_archivo enable row level security;

-- Nadie entra por la API publica de Supabase: todo pasa por las rutas del
-- servidor, que usan la llave de servicio y validan el modulo antes.
drop policy if exists th_archivo_sin_acceso_directo on talento_humano_archivo;
create policy th_archivo_sin_acceso_directo on talento_humano_archivo
  for select using (false);

comment on table talento_humano_archivo is
  'Archivo de trabajo del tablero de Talento Humano. Una sola fila: el vigente.';
