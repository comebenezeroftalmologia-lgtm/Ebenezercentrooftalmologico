-- Migracion 019: roles de plataforma (desarrollador, administrador, lider,
-- usuario basico), lider directo por usuario basico y solicitudes de
-- eliminacion que el lider debe autorizar.
--
-- is_admin se conserva y pasa a ser DERIVADO: true para desarrollador y
-- administrador. Asi las politicas RLS y el codigo existente siguen igual.

alter table app_users
  add column if not exists rol text not null default 'usuario_basico'
    check (rol in ('desarrollador', 'administrador', 'lider', 'usuario_basico'));

alter table app_users
  add column if not exists lider_id uuid references app_users(id) on delete set null;

-- Backfill: admins actuales -> administrador; quien ya es lider de algun area
-- -> lider; el resto queda como usuario basico.
update app_users set rol = 'administrador' where is_admin = true;

update app_users set rol = 'lider'
where is_admin = false
  and id in (select user_id from area_asignaciones where rol = 'lider');

-- Desarrolladores: Pedro, la cuenta de Ebenezer Centro Oftalmologico y
-- Juan Manuel Mondragon (se verifica con el select del final).
update app_users set rol = 'desarrollador'
where is_admin = true
  and (
    nombre_completo ilike '%pedro%'
    or nombre_completo ilike '%ebenezer centro%'
    or nombre_completo ilike '%mondrag%'
  );

-- is_admin siempre coherente con el rol.
create or replace function app_users_sync_is_admin()
returns trigger
language plpgsql
as $$
begin
  new.is_admin := new.rol in ('desarrollador', 'administrador');
  return new;
end;
$$;

drop trigger if exists app_users_sync_is_admin on app_users;
create trigger app_users_sync_is_admin
  before insert or update on app_users
  for each row execute function app_users_sync_is_admin();

create index if not exists app_users_lider_id_idx on app_users (lider_id);

-- Solicitudes de eliminacion: un usuario basico no borra directamente; pide
-- autorizacion a su lider (o a un administrador si no tiene lider).
create table if not exists solicitudes_eliminacion (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,                 -- p. ej. 'proceso', 'espacio', 'lista', 'doc', 'tarea'
  entidad_id uuid not null,
  entidad_nombre text not null,
  motivo text,
  solicitante_id uuid not null references app_users(id) on delete cascade,
  autorizador_id uuid references app_users(id) on delete set null,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'aprobada', 'rechazada')),
  resuelta_por uuid references app_users(id) on delete set null,
  resuelta_at timestamptz,
  nota_resolucion text,
  created_at timestamptz not null default now()
);

create index if not exists solicitudes_eliminacion_estado_idx
  on solicitudes_eliminacion (estado, autorizador_id);
create index if not exists solicitudes_eliminacion_solicitante_idx
  on solicitudes_eliminacion (solicitante_id);

alter table solicitudes_eliminacion enable row level security;

drop policy if exists solicitudes_eliminacion_select on solicitudes_eliminacion;
create policy solicitudes_eliminacion_select on solicitudes_eliminacion for select
  using (
    solicitante_id = auth.uid()
    or autorizador_id = auth.uid()
    or is_admin(auth.uid())
  );

drop policy if exists solicitudes_eliminacion_insert on solicitudes_eliminacion;
create policy solicitudes_eliminacion_insert on solicitudes_eliminacion for insert
  with check (solicitante_id = auth.uid());

-- Resolver (aprobar / rechazar): solo el autorizador asignado o un admin.
drop policy if exists solicitudes_eliminacion_update on solicitudes_eliminacion;
create policy solicitudes_eliminacion_update on solicitudes_eliminacion for update
  using (autorizador_id = auth.uid() or is_admin(auth.uid()));

-- Verificacion: revisa que cada persona quedo con el rol correcto.
select nombre_completo, email, rol, is_admin from app_users order by rol, nombre_completo;
