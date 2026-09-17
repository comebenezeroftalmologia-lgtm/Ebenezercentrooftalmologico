-- Acceso por módulo al dashboard de mercadeo: el admin decide, persona
-- por persona, a cuáles de los 6 módulos existentes tiene acceso. Un
-- admin no necesita fila aquí — ve todo implícitamente (ver
-- src/lib/auth.ts getMisModulos).
create table if not exists modulo_accesos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  modulo text not null check (
    modulo in ('leads', 'no_quirurgicos', 'quirurgicos', 'redes_sociales', 'frecuencias', 'venta_del_dia')
  ),
  created_at timestamptz not null default now(),
  unique (user_id, modulo)
);
create index if not exists idx_modulo_accesos_user on modulo_accesos(user_id);

alter table modulo_accesos enable row level security;

-- Lectura abierta a cualquier autenticado (la propia app la usa para
-- decidir qué mostrar en la barra lateral); solo admin escribe.
drop policy if exists modulo_accesos_select on modulo_accesos;
create policy modulo_accesos_select on modulo_accesos for select
  using (auth.uid() is not null);
drop policy if exists modulo_accesos_write on modulo_accesos;
create policy modulo_accesos_write on modulo_accesos for all
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));
