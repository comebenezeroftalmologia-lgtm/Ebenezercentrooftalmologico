-- Migracion 022: notificaciones dentro de la plataforma y por correo.
-- Las filas las crea el servidor (llave de servicio). Cada persona solo puede
-- leer y marcar como leidas las suyas.

create table if not exists notificaciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,   -- destinatario
  tipo text not null check (tipo in (
    'tarea_asignada', 'mencion', 'comentario_tarea', 'cambio_tarea', 'fecha_limite',
    'eliminacion_solicitud', 'eliminacion_resuelta', 'espacio_compartido',
    'falla_nueva', 'falla_actualizada'
  )),
  titulo text not null,
  cuerpo text,
  url text,                                  -- ruta interna, p. ej. /proyectos/tarea/<id>
  actor_id uuid references app_users(id) on delete set null,
  actor_nombre text,
  entidad_id uuid,                           -- p. ej. la tarea (para agrupar avisos repetidos)
  contador int not null default 1,           -- cuantos eventos agrupa este aviso
  clave text,                                -- evita duplicados (p. ej. avisos diarios de fecha limite)
  leida_at timestamptz,
  email_enviado_at timestamptz,
  email_error text,
  created_at timestamptz not null default now()
);

create index if not exists notificaciones_user_idx on notificaciones (user_id, created_at desc);
create index if not exists notificaciones_sin_leer_idx on notificaciones (user_id) where leida_at is null;
create unique index if not exists notificaciones_clave_unica on notificaciones (user_id, clave) where clave is not null;

-- Preferencias por persona y tipo. Sin fila = valores por defecto de la plataforma.
create table if not exists notificacion_preferencias (
  user_id uuid not null references app_users(id) on delete cascade,
  tipo text not null,
  en_app boolean not null default true,
  email boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, tipo)
);

alter table notificaciones enable row level security;
alter table notificacion_preferencias enable row level security;

drop policy if exists notificaciones_select on notificaciones;
create policy notificaciones_select on notificaciones for select using (user_id = auth.uid());
drop policy if exists notificaciones_update on notificaciones;
create policy notificaciones_update on notificaciones for update using (user_id = auth.uid());

drop policy if exists notificacion_preferencias_all on notificacion_preferencias;
create policy notificacion_preferencias_all on notificacion_preferencias for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

select count(*) as notificaciones from notificaciones;
