-- Migracion 021: historial de cambios del Centro de Conocimiento.
-- Solo se puede AGREGAR: un trigger bloquea cualquier UPDATE, DELETE o
-- TRUNCATE (tambien con la llave de servicio), y se revocan esos permisos.
-- No hay llaves foraneas a proposito: borrar un documento o un usuario no
-- debe tocar el historial; por eso guarda copias del titulo y del nombre.

create table if not exists conocimiento_historial (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  accion text not null check (accion in (
    'subida', 'edicion', 'publicacion', 'vuelta_a_borrador', 'obsoleto',
    'obsoleto_por_nueva_version', 'eliminacion',
    'permiso_gestor_otorgado', 'permiso_gestor_retirado'
  )),
  documento_id uuid,
  documento_titulo text,
  documento_codigo text,
  documento_version text,
  usuario_id uuid,
  usuario_nombre text not null,
  usuario_email text,
  detalle jsonb not null default '{}'::jsonb
);

create index if not exists conocimiento_historial_fecha_idx on conocimiento_historial (created_at desc);
create index if not exists conocimiento_historial_documento_idx on conocimiento_historial (documento_id);

create or replace function conocimiento_historial_inmutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'El historial de cambios es de solo lectura (no se puede editar ni borrar).';
end;
$$;

drop trigger if exists conocimiento_historial_no_update_delete on conocimiento_historial;
create trigger conocimiento_historial_no_update_delete
  before update or delete on conocimiento_historial
  for each row execute function conocimiento_historial_inmutable();

drop trigger if exists conocimiento_historial_no_truncate on conocimiento_historial;
create trigger conocimiento_historial_no_truncate
  before truncate on conocimiento_historial
  for each statement execute function conocimiento_historial_inmutable();

alter table conocimiento_historial enable row level security;

revoke update, delete, truncate on conocimiento_historial from anon, authenticated, service_role;

-- Verificacion: debe fallar con "El historial de cambios es de solo lectura".
-- (Prueba opcional)
--   insert into conocimiento_historial (accion, usuario_nombre) values ('subida', 'prueba');
--   update conocimiento_historial set usuario_nombre = 'x';
select count(*) as filas_historial from conocimiento_historial;
