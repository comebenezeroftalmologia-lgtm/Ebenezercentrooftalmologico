-- Módulo de Procesos: usuarios/roles, áreas, procesos, actividades, tareas.
-- Vive en el mismo proyecto Supabase que el resto de la plataforma, como
-- una sección nueva (/procesos) con su propio login (Supabase Auth).

-- Perfil de cada usuario de Supabase Auth (auth.users no es editable
-- directamente). is_admin es un rol global; lider/colaborador se
-- definen por área en area_asignaciones, no aquí.
create table if not exists app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre_completo text not null,
  email text not null,
  is_admin boolean not null default false,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists areas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  created_at timestamptz not null default now()
);

-- Rol de una persona DENTRO de un área específica. Una misma persona
-- puede ser líder de un área y colaborador en otra — el rol no es
-- global. Los admin crean asignaciones rol='lider'; los líderes de esa
-- misma área crean asignaciones rol='colaborador'.
create table if not exists area_asignaciones (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references areas(id) on delete cascade,
  user_id uuid not null references app_users(id) on delete cascade,
  rol text not null check (rol in ('lider', 'colaborador')),
  asignado_por uuid references app_users(id),
  created_at timestamptz not null default now(),
  unique (area_id, user_id)
);

create table if not exists procesos (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references areas(id) on delete cascade,
  nombre text not null,
  descripcion text,
  created_by uuid references app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists actividades (
  id uuid primary key default gen_random_uuid(),
  proceso_id uuid not null references procesos(id) on delete cascade,
  nombre text not null,
  descripcion text,
  orden integer not null default 0,
  created_by uuid references app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tareas (
  id uuid primary key default gen_random_uuid(),
  actividad_id uuid not null references actividades(id) on delete cascade,
  nombre text not null,
  descripcion text,
  responsable_user_id uuid references app_users(id),
  resultado text,
  impacto_paciente text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'en_progreso', 'completada')),
  orden integer not null default 0,
  created_by uuid references app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Relación puramente informativa entre dos tareas, potencialmente de
-- áreas distintas (ej. "esto también aplica para Facturación"). No
-- implica bloqueo ni orden — solo un enlace con una nota opcional.
-- No dirigida: se consulta con OR sobre ambas columnas.
create table if not exists tarea_relaciones (
  id uuid primary key default gen_random_uuid(),
  tarea_id uuid not null references tareas(id) on delete cascade,
  tarea_relacionada_id uuid not null references tareas(id) on delete cascade,
  nota text,
  created_by uuid references app_users(id),
  created_at timestamptz not null default now(),
  check (tarea_id <> tarea_relacionada_id)
);
create unique index if not exists tarea_relaciones_unicidad
  on tarea_relaciones (least(tarea_id, tarea_relacionada_id), greatest(tarea_id, tarea_relacionada_id));

create index if not exists idx_area_asignaciones_area on area_asignaciones(area_id);
create index if not exists idx_area_asignaciones_user on area_asignaciones(user_id);
create index if not exists idx_procesos_area on procesos(area_id);
create index if not exists idx_actividades_proceso on actividades(proceso_id, orden);
create index if not exists idx_tareas_actividad on tareas(actividad_id, orden);
create index if not exists idx_tareas_responsable on tareas(responsable_user_id);
create index if not exists idx_tarea_relaciones_tarea on tarea_relaciones(tarea_id);
create index if not exists idx_tarea_relaciones_relacionada on tarea_relaciones(tarea_relacionada_id);

-- Áreas fijas de la organización.
insert into areas (nombre) values
  ('Dirección Médica'),
  ('Gerencia Admin y Financiera'),
  ('Investigación'),
  ('Calidad'),
  ('Contabilidad y finanzas'),
  ('Facturación y Cartera'),
  ('Logística y Compras'),
  ('TIC'),
  ('Talento humano'),
  ('Comercial'),
  ('Comunicaciones y Mercadeo'),
  ('Seguridad y Salud en el Trabajo')
on conflict (nombre) do nothing;

-- --- Row Level Security ---------------------------------------------

alter table app_users enable row level security;
alter table areas enable row level security;
alter table area_asignaciones enable row level security;
alter table procesos enable row level security;
alter table actividades enable row level security;
alter table tareas enable row level security;
alter table tarea_relaciones enable row level security;

-- Helper: ¿el usuario autenticado actual es admin?
create or replace function is_admin(uid uuid)
returns boolean
language sql
security definer
stable
as $$
  select coalesce((select is_admin from app_users where id = uid), false);
$$;

-- Helper: ¿el usuario es líder del área dada?
create or replace function is_lider_de_area(uid uuid, target_area_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from area_asignaciones
    where area_id = target_area_id and user_id = uid and rol = 'lider'
  );
$$;

-- Helper: ¿el usuario tiene alguna asignación (líder o colaborador) en el área?
create or replace function tiene_acceso_area(uid uuid, target_area_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from area_asignaciones
    where area_id = target_area_id and user_id = uid
  ) or is_admin(uid);
$$;

-- app_users: cada quien ve/edita su propio perfil; admin ve y edita todo.
drop policy if exists app_users_select on app_users;
create policy app_users_select on app_users for select
  using (id = auth.uid() or is_admin(auth.uid()));
drop policy if exists app_users_insert on app_users;
create policy app_users_insert on app_users for insert
  with check (is_admin(auth.uid()));
drop policy if exists app_users_update on app_users;
create policy app_users_update on app_users for update
  using (id = auth.uid() or is_admin(auth.uid()));

-- areas: cualquier autenticado puede leer la lista; solo admin escribe.
drop policy if exists areas_select on areas;
create policy areas_select on areas for select
  using (auth.uid() is not null);
drop policy if exists areas_write on areas;
create policy areas_write on areas for all
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- area_asignaciones: cualquier autenticado puede leer (organigrama
-- visible para todos). Admin asigna líderes; el líder de esa área
-- asigna colaboradores a su propia área.
drop policy if exists area_asignaciones_select on area_asignaciones;
create policy area_asignaciones_select on area_asignaciones for select
  using (auth.uid() is not null);
drop policy if exists area_asignaciones_insert on area_asignaciones;
create policy area_asignaciones_insert on area_asignaciones for insert
  with check (
    (rol = 'lider' and is_admin(auth.uid()))
    or (rol = 'colaborador' and is_lider_de_area(auth.uid(), area_id))
    or is_admin(auth.uid())
  );
drop policy if exists area_asignaciones_delete on area_asignaciones;
create policy area_asignaciones_delete on area_asignaciones for delete
  using (
    is_admin(auth.uid())
    or (rol = 'colaborador' and is_lider_de_area(auth.uid(), area_id))
  );

-- procesos/actividades/tareas: leen quienes tienen acceso al área
-- (líder o colaborador de esa área) o admin. Escriben líder del área
-- (o admin).
drop policy if exists procesos_select on procesos;
create policy procesos_select on procesos for select
  using (tiene_acceso_area(auth.uid(), area_id));
drop policy if exists procesos_write on procesos;
create policy procesos_write on procesos for all
  using (is_lider_de_area(auth.uid(), area_id) or is_admin(auth.uid()))
  with check (is_lider_de_area(auth.uid(), area_id) or is_admin(auth.uid()));

drop policy if exists actividades_select on actividades;
create policy actividades_select on actividades for select
  using (
    exists (
      select 1 from procesos p
      where p.id = proceso_id and tiene_acceso_area(auth.uid(), p.area_id)
    )
  );
drop policy if exists actividades_write on actividades;
create policy actividades_write on actividades for all
  using (
    exists (
      select 1 from procesos p
      where p.id = proceso_id
        and (is_lider_de_area(auth.uid(), p.area_id) or is_admin(auth.uid()))
    )
  )
  with check (
    exists (
      select 1 from procesos p
      where p.id = proceso_id
        and (is_lider_de_area(auth.uid(), p.area_id) or is_admin(auth.uid()))
    )
  );

drop policy if exists tareas_select on tareas;
create policy tareas_select on tareas for select
  using (
    exists (
      select 1 from actividades a
      join procesos p on p.id = a.proceso_id
      where a.id = actividad_id and tiene_acceso_area(auth.uid(), p.area_id)
    )
  );
-- El líder del área (o admin) puede crear/editar/borrar cualquier
-- campo. Un colaborador puede actualizar SOLO sus propias tareas
-- asignadas (ver tareas_update_colaborador) — la política de UPDATE de
-- líder ya lo cubre también, así que colaborador es un permiso
-- adicional, no un reemplazo.
drop policy if exists tareas_write_lider on tareas;
create policy tareas_write_lider on tareas for all
  using (
    exists (
      select 1 from actividades a
      join procesos p on p.id = a.proceso_id
      where a.id = actividad_id
        and (is_lider_de_area(auth.uid(), p.area_id) or is_admin(auth.uid()))
    )
  )
  with check (
    exists (
      select 1 from actividades a
      join procesos p on p.id = a.proceso_id
      where a.id = actividad_id
        and (is_lider_de_area(auth.uid(), p.area_id) or is_admin(auth.uid()))
    )
  );
drop policy if exists tareas_update_colaborador on tareas;
create policy tareas_update_colaborador on tareas for update
  using (responsable_user_id = auth.uid())
  with check (responsable_user_id = auth.uid());

-- tarea_relaciones: legible por quien tenga acceso a cualquiera de las
-- dos áreas involucradas; escribible por quien tenga acceso de
-- escritura a la tarea de origen (tarea_id).
drop policy if exists tarea_relaciones_select on tarea_relaciones;
create policy tarea_relaciones_select on tarea_relaciones for select
  using (
    exists (
      select 1 from tareas t
      join actividades a on a.id = t.actividad_id
      join procesos p on p.id = a.proceso_id
      where t.id in (tarea_id, tarea_relacionada_id)
        and tiene_acceso_area(auth.uid(), p.area_id)
    )
  );
drop policy if exists tarea_relaciones_write on tarea_relaciones;
create policy tarea_relaciones_write on tarea_relaciones for all
  using (
    exists (
      select 1 from tareas t
      join actividades a on a.id = t.actividad_id
      join procesos p on p.id = a.proceso_id
      where t.id = tarea_id
        and (is_lider_de_area(auth.uid(), p.area_id) or is_admin(auth.uid()))
    )
  )
  with check (
    exists (
      select 1 from tareas t
      join actividades a on a.id = t.actividad_id
      join procesos p on p.id = a.proceso_id
      where t.id = tarea_id
        and (is_lider_de_area(auth.uid(), p.area_id) or is_admin(auth.uid()))
    )
  );
