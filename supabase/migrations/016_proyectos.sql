-- Módulo "Proyectos": gestión de proyectos estilo ClickUp.
--
--   Espacio → (Carpeta →) Lista → Tarea → Subtarea
--   Espacio → (Carpeta →) Documento → Páginas → Subpáginas
--
-- Independiente del módulo "Procesos" (tablas areas/procesos/actividades/
-- tareas): todo lo de este módulo vive en tablas con prefijo proy_.
-- Reutiliza app_users (login), modulo_accesos (acceso al módulo) y los
-- helpers is_admin() de 005_procesos.sql.
--
-- PERMISOS (decisión de producto): por espacio, con miembros y roles.
--   · Un espacio es privado (solo miembros) o abierto (todos los usuarios
--     con acceso al módulo lo VEN; editar exige ser miembro).
--   · Rol del miembro: propietario | editor | lector.
--   · Un admin de la plataforma tiene siempre rol propietario.
--   · Sin acceso al módulo 'proyectos' no se ve nada, sea cual sea el rol.
-- La autorización real vive en las políticas RLS de abajo, no en el código.

-- ---------------------------------------------------------------------
-- 0. Acceso por módulo: 'proyectos' pasa a ser un módulo asignable más.
-- ---------------------------------------------------------------------
alter table modulo_accesos drop constraint if exists modulo_accesos_modulo_check;
alter table modulo_accesos add constraint modulo_accesos_modulo_check
  check (modulo in (
    'leads', 'no_quirurgicos', 'quirurgicos', 'redes_sociales',
    'frecuencias', 'venta_del_dia', 'procesos', 'proyectos'
  ));

-- ---------------------------------------------------------------------
-- 1. Tablas
-- ---------------------------------------------------------------------
create table if not exists proy_espacios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(btrim(nombre)) > 0),
  color text not null default '#6B5CE7',
  privado boolean not null default true,
  orden double precision not null default 0,
  created_by uuid references app_users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists proy_espacio_miembros (
  espacio_id uuid not null references proy_espacios(id) on delete cascade,
  user_id uuid not null references app_users(id) on delete cascade,
  rol text not null default 'editor' check (rol in ('propietario', 'editor', 'lector')),
  created_at timestamptz not null default now(),
  primary key (espacio_id, user_id)
);

create table if not exists proy_carpetas (
  id uuid primary key default gen_random_uuid(),
  espacio_id uuid not null references proy_espacios(id) on delete cascade,
  nombre text not null check (length(btrim(nombre)) > 0),
  orden double precision not null default 0,
  created_by uuid references app_users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists proy_listas (
  id uuid primary key default gen_random_uuid(),
  espacio_id uuid not null references proy_espacios(id) on delete cascade,
  carpeta_id uuid references proy_carpetas(id) on delete cascade,
  nombre text not null check (length(btrim(nombre)) > 0),
  orden double precision not null default 0,
  created_by uuid references app_users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists proy_docs (
  id uuid primary key default gen_random_uuid(),
  espacio_id uuid not null references proy_espacios(id) on delete cascade,
  carpeta_id uuid references proy_carpetas(id) on delete cascade,
  nombre text not null check (length(btrim(nombre)) > 0),
  orden double precision not null default 0,
  created_by uuid references app_users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Estados propios de cada lista (como en ClickUp: cada lista define los
-- suyos). tipo: abierto (por hacer) | activo (en curso) | cerrado (terminado).
create table if not exists proy_estados (
  id uuid primary key default gen_random_uuid(),
  lista_id uuid not null references proy_listas(id) on delete cascade,
  espacio_id uuid not null references proy_espacios(id) on delete cascade,
  nombre text not null check (length(btrim(nombre)) > 0),
  tipo text not null default 'activo' check (tipo in ('abierto', 'activo', 'cerrado')),
  color text not null default '#9AA0B4',
  orden double precision not null default 0
);

create table if not exists proy_tareas (
  id uuid primary key default gen_random_uuid(),
  lista_id uuid not null references proy_listas(id) on delete cascade,
  espacio_id uuid not null references proy_espacios(id) on delete cascade,
  parent_id uuid references proy_tareas(id) on delete cascade,
  nombre text not null check (length(btrim(nombre)) > 0),
  descripcion jsonb,
  estado_id uuid not null references proy_estados(id) on delete restrict,
  prioridad text check (prioridad in ('urgente', 'alta', 'normal', 'baja')),
  fecha_inicio date,
  fecha_limite date,
  orden double precision not null default 0,
  created_by uuid references app_users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completada_at timestamptz,
  check (fecha_inicio is null or fecha_limite is null or fecha_limite >= fecha_inicio)
);

create table if not exists proy_tarea_asignados (
  tarea_id uuid not null references proy_tareas(id) on delete cascade,
  user_id uuid not null references app_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tarea_id, user_id)
);

create table if not exists proy_etiquetas (
  id uuid primary key default gen_random_uuid(),
  espacio_id uuid not null references proy_espacios(id) on delete cascade,
  nombre text not null check (length(btrim(nombre)) > 0),
  color text not null default '#6791F0'
);
create unique index if not exists proy_etiquetas_unica
  on proy_etiquetas (espacio_id, lower(nombre));

create table if not exists proy_tarea_etiquetas (
  tarea_id uuid not null references proy_tareas(id) on delete cascade,
  etiqueta_id uuid not null references proy_etiquetas(id) on delete cascade,
  primary key (tarea_id, etiqueta_id)
);

create table if not exists proy_checklists (
  id uuid primary key default gen_random_uuid(),
  tarea_id uuid not null references proy_tareas(id) on delete cascade,
  titulo text not null default 'Lista de control',
  orden double precision not null default 0
);

create table if not exists proy_checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references proy_checklists(id) on delete cascade,
  texto text not null check (length(btrim(texto)) > 0),
  hecho boolean not null default false,
  orden double precision not null default 0
);

create table if not exists proy_comentarios (
  id uuid primary key default gen_random_uuid(),
  tarea_id uuid not null references proy_tareas(id) on delete cascade,
  user_id uuid references app_users(id) on delete set null default auth.uid(),
  texto text not null check (length(btrim(texto)) > 0),
  created_at timestamptz not null default now(),
  editado_at timestamptz
);

-- Historial de la tarea ("Activity"). Lo escriben SOLO los triggers de
-- abajo: nadie puede insertar ni editar entradas a mano.
create table if not exists proy_actividad (
  id uuid primary key default gen_random_uuid(),
  tarea_id uuid not null references proy_tareas(id) on delete cascade,
  user_id uuid,
  tipo text not null,
  detalle jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists proy_adjuntos (
  id uuid primary key default gen_random_uuid(),
  tarea_id uuid not null references proy_tareas(id) on delete cascade,
  nombre text not null,
  storage_path text not null,
  mime text,
  tamano bigint,
  created_by uuid references app_users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists proy_doc_paginas (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid not null references proy_docs(id) on delete cascade,
  espacio_id uuid not null references proy_espacios(id) on delete cascade,
  parent_id uuid references proy_doc_paginas(id) on delete cascade,
  titulo text not null default 'Sin título',
  contenido jsonb,
  orden double precision not null default 0,
  created_by uuid references app_users(id) on delete set null default auth.uid(),
  updated_by uuid references app_users(id) on delete set null,
  colaboradores uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_proy_miembros_user on proy_espacio_miembros(user_id);
create index if not exists idx_proy_carpetas_espacio on proy_carpetas(espacio_id, orden);
create index if not exists idx_proy_listas_espacio on proy_listas(espacio_id, carpeta_id, orden);
create index if not exists idx_proy_docs_espacio on proy_docs(espacio_id, carpeta_id, orden);
create index if not exists idx_proy_estados_lista on proy_estados(lista_id, orden);
create index if not exists idx_proy_tareas_lista on proy_tareas(lista_id, estado_id, orden);
create index if not exists idx_proy_tareas_parent on proy_tareas(parent_id);
create index if not exists idx_proy_tareas_espacio on proy_tareas(espacio_id);
create index if not exists idx_proy_asignados_user on proy_tarea_asignados(user_id);
create index if not exists idx_proy_checklists_tarea on proy_checklists(tarea_id, orden);
create index if not exists idx_proy_items_checklist on proy_checklist_items(checklist_id, orden);
create index if not exists idx_proy_comentarios_tarea on proy_comentarios(tarea_id, created_at);
create index if not exists idx_proy_actividad_tarea on proy_actividad(tarea_id, created_at);
create index if not exists idx_proy_adjuntos_tarea on proy_adjuntos(tarea_id);
create index if not exists idx_proy_paginas_doc on proy_doc_paginas(doc_id, parent_id, orden);

-- ---------------------------------------------------------------------
-- 2. Helpers de permisos (security definer: leen tablas sin pasar por
--    RLS, para que las políticas no se llamen a sí mismas en bucle).
-- ---------------------------------------------------------------------
create or replace function proy_tiene_modulo(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    is_admin(uid)
    or exists (select 1 from modulo_accesos where user_id = uid and modulo = 'proyectos'),
    false
  );
$$;

-- Rol efectivo del usuario en un espacio (null = sin acceso).
-- Orden: miembro explícito → creador (aún sin fila de miembro) → espacio
-- abierto (lector). Un admin es siempre propietario.
create or replace function proy_rol_espacio(uid uuid, eid uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select case
    when uid is null or eid is null then null
    when not proy_tiene_modulo(uid) then null
    when is_admin(uid) then 'propietario'
    else coalesce(
      (select m.rol from proy_espacio_miembros m where m.espacio_id = eid and m.user_id = uid),
      (select 'propietario' from proy_espacios e where e.id = eid and e.created_by = uid),
      (select 'lector' from proy_espacios e where e.id = eid and not e.privado)
    )
  end;
$$;

create or replace function proy_puede_ver(uid uuid, eid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$ select proy_rol_espacio(uid, eid) is not null; $$;

create or replace function proy_puede_editar(uid uuid, eid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$ select coalesce(proy_rol_espacio(uid, eid) in ('propietario', 'editor'), false); $$;

create or replace function proy_es_propietario(uid uuid, eid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$ select coalesce(proy_rol_espacio(uid, eid) = 'propietario', false); $$;

create or replace function proy_espacio_de_tarea(tid uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$ select espacio_id from proy_tareas where id = tid; $$;

create or replace function proy_espacio_de_checklist(cid uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select t.espacio_id from proy_checklists c join proy_tareas t on t.id = c.tarea_id where c.id = cid;
$$;

-- ---------------------------------------------------------------------
-- 3. Triggers de integridad
-- ---------------------------------------------------------------------

-- El creador de un espacio queda como propietario.
create or replace function proy_espacio_alta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is not null then
    insert into proy_espacio_miembros (espacio_id, user_id, rol)
    values (new.id, new.created_by, 'propietario')
    on conflict (espacio_id, user_id) do update set rol = 'propietario';
  end if;
  return null;
end;
$$;
drop trigger if exists trg_proy_espacio_alta on proy_espacios;
create trigger trg_proy_espacio_alta after insert on proy_espacios
  for each row execute function proy_espacio_alta();

-- Un espacio nunca se queda sin propietario.
create or replace function proy_miembro_ultimo_propietario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.rol = 'propietario'
     and (tg_op = 'DELETE' or new.rol is distinct from 'propietario')
     and exists (select 1 from proy_espacios where id = old.espacio_id)
     and not exists (
       select 1 from proy_espacio_miembros
       where espacio_id = old.espacio_id and rol = 'propietario' and user_id <> old.user_id
     )
  then
    raise exception 'El espacio debe conservar al menos un propietario.' using errcode = 'P0001';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
drop trigger if exists trg_proy_miembro_ultimo on proy_espacio_miembros;
create trigger trg_proy_miembro_ultimo before update or delete on proy_espacio_miembros
  for each row execute function proy_miembro_ultimo_propietario();

-- Carpeta y lista/documento deben ser del mismo espacio.
create or replace function proy_validar_carpeta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.carpeta_id is not null
     and not exists (select 1 from proy_carpetas where id = new.carpeta_id and espacio_id = new.espacio_id)
  then
    raise exception 'La carpeta no pertenece a este espacio.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_proy_listas_carpeta on proy_listas;
create trigger trg_proy_listas_carpeta before insert or update of carpeta_id, espacio_id on proy_listas
  for each row execute function proy_validar_carpeta();
drop trigger if exists trg_proy_docs_carpeta on proy_docs;
create trigger trg_proy_docs_carpeta before insert or update of carpeta_id, espacio_id on proy_docs
  for each row execute function proy_validar_carpeta();

-- Una lista nueva nace con tres estados, como en ClickUp.
create or replace function proy_lista_estados_base()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into proy_estados (lista_id, espacio_id, nombre, tipo, color, orden) values
    (new.id, new.espacio_id, 'PENDIENTE',   'abierto', '#9AA0B4', 1000),
    (new.id, new.espacio_id, 'EN PROGRESO', 'activo',  '#3B6FF0', 2000),
    (new.id, new.espacio_id, 'COMPLETADA',  'cerrado', '#21814B', 3000);
  return null;
end;
$$;
drop trigger if exists trg_proy_lista_estados on proy_listas;
create trigger trg_proy_lista_estados after insert on proy_listas
  for each row execute function proy_lista_estados_base();

-- El espacio de un estado/tarea/página se deriva SIEMPRE de su padre: el
-- cliente no lo manda, así nadie puede colar filas en un espacio ajeno.
create or replace function proy_estado_espacio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select espacio_id into new.espacio_id from proy_listas where id = new.lista_id;
  if new.espacio_id is null then
    raise exception 'La lista no existe.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_proy_estado_espacio on proy_estados;
create trigger trg_proy_estado_espacio before insert or update of lista_id on proy_estados
  for each row execute function proy_estado_espacio();

create or replace function proy_tarea_antes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tipo text;
  v_estado_lista uuid;
  v_parent_lista uuid;
begin
  select espacio_id into new.espacio_id from proy_listas where id = new.lista_id;
  if new.espacio_id is null then
    raise exception 'La lista no existe.' using errcode = 'P0001';
  end if;

  if tg_op = 'UPDATE' and new.lista_id is distinct from old.lista_id
     and new.espacio_id is distinct from old.espacio_id then
    raise exception 'Una tarea no puede moverse a otro espacio.' using errcode = 'P0001';
  end if;

  -- Sin estado explícito: el primero (menor orden) de la lista.
  if new.estado_id is null then
    select id into new.estado_id from proy_estados
      where lista_id = new.lista_id order by (tipo = 'abierto') desc, orden limit 1;
  end if;

  select lista_id, tipo into v_estado_lista, v_tipo from proy_estados where id = new.estado_id;
  if v_estado_lista is distinct from new.lista_id then
    raise exception 'El estado no pertenece a la lista de la tarea.' using errcode = 'P0001';
  end if;

  if new.parent_id is not null then
    select lista_id into v_parent_lista from proy_tareas where id = new.parent_id;
    if v_parent_lista is distinct from new.lista_id then
      raise exception 'Una subtarea debe estar en la misma lista que su tarea padre.' using errcode = 'P0001';
    end if;
    if new.parent_id = new.id then
      raise exception 'Una tarea no puede ser subtarea de sí misma.' using errcode = 'P0001';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    new.updated_at := now();
    if v_tipo = 'cerrado' and old.estado_id is distinct from new.estado_id then
      new.completada_at := now();
    elsif v_tipo <> 'cerrado' and old.estado_id is distinct from new.estado_id then
      new.completada_at := null;
    end if;
  elsif v_tipo = 'cerrado' then
    new.completada_at := now();
  end if;

  return new;
end;
$$;
drop trigger if exists trg_proy_tarea_antes on proy_tareas;
create trigger trg_proy_tarea_antes before insert or update on proy_tareas
  for each row execute function proy_tarea_antes();

create or replace function proy_pagina_antes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_parent_doc uuid;
begin
  select espacio_id into new.espacio_id from proy_docs where id = new.doc_id;
  if new.espacio_id is null then
    raise exception 'El documento no existe.' using errcode = 'P0001';
  end if;
  if new.parent_id is not null then
    select doc_id into v_parent_doc from proy_doc_paginas where id = new.parent_id;
    if v_parent_doc is distinct from new.doc_id then
      raise exception 'La subpágina debe pertenecer al mismo documento.' using errcode = 'P0001';
    end if;
  end if;
  if tg_op = 'UPDATE' then
    new.updated_at := now();
    if new.contenido is distinct from old.contenido or new.titulo is distinct from old.titulo then
      new.updated_by := auth.uid();
      if auth.uid() is not null and not (auth.uid() = any (new.colaboradores)) then
        new.colaboradores := array_append(new.colaboradores, auth.uid());
      end if;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_proy_pagina_antes on proy_doc_paginas;
create trigger trg_proy_pagina_antes before insert or update on proy_doc_paginas
  for each row execute function proy_pagina_antes();

-- Mantiene al día el updated_at del documento cuando cambia una página.
create or replace function proy_pagina_toca_doc()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update proy_docs set updated_at = now() where id = coalesce(new.doc_id, old.doc_id);
  return null;
end;
$$;
drop trigger if exists trg_proy_pagina_toca_doc on proy_doc_paginas;
create trigger trg_proy_pagina_toca_doc after insert or update on proy_doc_paginas
  for each row execute function proy_pagina_toca_doc();

-- Una etiqueta solo se puede poner a tareas de su mismo espacio.
create or replace function proy_validar_tarea_etiqueta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select espacio_id from proy_etiquetas where id = new.etiqueta_id)
     is distinct from (select espacio_id from proy_tareas where id = new.tarea_id) then
    raise exception 'La etiqueta pertenece a otro espacio.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_proy_tarea_etiqueta on proy_tarea_etiquetas;
create trigger trg_proy_tarea_etiqueta before insert on proy_tarea_etiquetas
  for each row execute function proy_validar_tarea_etiqueta();

-- ---------------------------------------------------------------------
-- 4. Historial automático de la tarea
-- ---------------------------------------------------------------------
create or replace function proy_log_tarea()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  v_de text;
  v_a text;
begin
  if tg_op = 'INSERT' then
    insert into proy_actividad (tarea_id, user_id, tipo, detalle)
    values (new.id, actor, 'creada', jsonb_build_object('nombre', new.nombre));
    return null;
  end if;

  if new.nombre is distinct from old.nombre then
    insert into proy_actividad (tarea_id, user_id, tipo, detalle)
    values (new.id, actor, 'nombre', jsonb_build_object('de', old.nombre, 'a', new.nombre));
  end if;
  if new.estado_id is distinct from old.estado_id then
    select nombre into v_de from proy_estados where id = old.estado_id;
    select nombre into v_a from proy_estados where id = new.estado_id;
    insert into proy_actividad (tarea_id, user_id, tipo, detalle)
    values (new.id, actor, 'estado', jsonb_build_object('de', v_de, 'a', v_a));
  end if;
  if new.prioridad is distinct from old.prioridad then
    insert into proy_actividad (tarea_id, user_id, tipo, detalle)
    values (new.id, actor, 'prioridad', jsonb_build_object('de', old.prioridad, 'a', new.prioridad));
  end if;
  if new.fecha_inicio is distinct from old.fecha_inicio then
    insert into proy_actividad (tarea_id, user_id, tipo, detalle)
    values (new.id, actor, 'fecha_inicio', jsonb_build_object('de', old.fecha_inicio, 'a', new.fecha_inicio));
  end if;
  if new.fecha_limite is distinct from old.fecha_limite then
    insert into proy_actividad (tarea_id, user_id, tipo, detalle)
    values (new.id, actor, 'fecha_limite', jsonb_build_object('de', old.fecha_limite, 'a', new.fecha_limite));
  end if;
  return null;
end;
$$;
drop trigger if exists trg_proy_log_tarea on proy_tareas;
create trigger trg_proy_log_tarea after insert or update on proy_tareas
  for each row execute function proy_log_tarea();

create or replace function proy_log_asignado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tarea uuid := coalesce(new.tarea_id, old.tarea_id);
  v_user uuid := coalesce(new.user_id, old.user_id);
begin
  -- Si la tarea se está borrando en cascada, no hay nada que registrar.
  if not exists (select 1 from proy_tareas where id = v_tarea) then
    return null;
  end if;
  insert into proy_actividad (tarea_id, user_id, tipo, detalle)
  values (
    v_tarea, auth.uid(),
    case when tg_op = 'INSERT' then 'asignado' else 'desasignado' end,
    jsonb_build_object('usuario', v_user)
  );
  return null;
end;
$$;
drop trigger if exists trg_proy_log_asignado on proy_tarea_asignados;
create trigger trg_proy_log_asignado after insert or delete on proy_tarea_asignados
  for each row execute function proy_log_asignado();

-- ---------------------------------------------------------------------
-- 5. Vista con el conteo de tareas abiertas por lista (barra lateral).
--    security_invoker: respeta las políticas RLS de quien consulta.
-- ---------------------------------------------------------------------
create or replace view proy_listas_conteo
with (security_invoker = true) as
select l.id as lista_id,
       count(t.id) filter (where e.tipo <> 'cerrado' and t.parent_id is null) as abiertas
from proy_listas l
left join proy_tareas t on t.lista_id = l.id
left join proy_estados e on e.id = t.estado_id
group by l.id;

-- ---------------------------------------------------------------------
-- 6. Row Level Security
-- ---------------------------------------------------------------------
alter table proy_espacios enable row level security;
alter table proy_espacio_miembros enable row level security;
alter table proy_carpetas enable row level security;
alter table proy_listas enable row level security;
alter table proy_docs enable row level security;
alter table proy_estados enable row level security;
alter table proy_tareas enable row level security;
alter table proy_tarea_asignados enable row level security;
alter table proy_etiquetas enable row level security;
alter table proy_tarea_etiquetas enable row level security;
alter table proy_checklists enable row level security;
alter table proy_checklist_items enable row level security;
alter table proy_comentarios enable row level security;
alter table proy_actividad enable row level security;
alter table proy_adjuntos enable row level security;
alter table proy_doc_paginas enable row level security;

-- Espacios --------------------------------------------------------------
drop policy if exists proy_espacios_select on proy_espacios;
create policy proy_espacios_select on proy_espacios for select
  using (proy_puede_ver(auth.uid(), id));
drop policy if exists proy_espacios_insert on proy_espacios;
create policy proy_espacios_insert on proy_espacios for insert
  with check (proy_tiene_modulo(auth.uid()) and created_by = auth.uid());
drop policy if exists proy_espacios_update on proy_espacios;
create policy proy_espacios_update on proy_espacios for update
  using (proy_es_propietario(auth.uid(), id))
  with check (proy_es_propietario(auth.uid(), id));
drop policy if exists proy_espacios_delete on proy_espacios;
create policy proy_espacios_delete on proy_espacios for delete
  using (proy_es_propietario(auth.uid(), id));

-- Miembros: los ven quienes ven el espacio; solo el propietario los gestiona.
drop policy if exists proy_miembros_select on proy_espacio_miembros;
create policy proy_miembros_select on proy_espacio_miembros for select
  using (proy_puede_ver(auth.uid(), espacio_id));
drop policy if exists proy_miembros_write on proy_espacio_miembros;
create policy proy_miembros_write on proy_espacio_miembros for all
  using (proy_es_propietario(auth.uid(), espacio_id))
  with check (proy_es_propietario(auth.uid(), espacio_id));

-- Carpetas, listas, documentos, estados, etiquetas: ven los que ven el
-- espacio; editan propietarios y editores.
do $$
declare t text;
begin
  foreach t in array array['proy_carpetas', 'proy_listas', 'proy_docs', 'proy_estados', 'proy_etiquetas']
  loop
    execute format('drop policy if exists %I on %I', t || '_select', t);
    execute format('create policy %I on %I for select using (proy_puede_ver(auth.uid(), espacio_id))', t || '_select', t);
    execute format('drop policy if exists %I on %I', t || '_write', t);
    execute format(
      'create policy %I on %I for all using (proy_puede_editar(auth.uid(), espacio_id)) with check (proy_puede_editar(auth.uid(), espacio_id))',
      t || '_write', t);
  end loop;
end $$;

-- Tareas y páginas (espacio_id lo fija el trigger desde el padre).
drop policy if exists proy_tareas_select on proy_tareas;
create policy proy_tareas_select on proy_tareas for select
  using (proy_puede_ver(auth.uid(), espacio_id));
drop policy if exists proy_tareas_write on proy_tareas;
create policy proy_tareas_write on proy_tareas for all
  using (proy_puede_editar(auth.uid(), espacio_id))
  with check (proy_puede_editar(auth.uid(), espacio_id));

drop policy if exists proy_paginas_select on proy_doc_paginas;
create policy proy_paginas_select on proy_doc_paginas for select
  using (proy_puede_ver(auth.uid(), espacio_id));
drop policy if exists proy_paginas_write on proy_doc_paginas;
create policy proy_paginas_write on proy_doc_paginas for all
  using (proy_puede_editar(auth.uid(), espacio_id))
  with check (proy_puede_editar(auth.uid(), espacio_id));

-- Hijas de tarea: asignados, etiquetas puestas, checklists, adjuntos.
do $$
declare t text;
begin
  foreach t in array array['proy_tarea_asignados', 'proy_tarea_etiquetas', 'proy_checklists', 'proy_adjuntos']
  loop
    execute format('drop policy if exists %I on %I', t || '_select', t);
    execute format('create policy %I on %I for select using (proy_puede_ver(auth.uid(), proy_espacio_de_tarea(tarea_id)))', t || '_select', t);
    execute format('drop policy if exists %I on %I', t || '_write', t);
    execute format(
      'create policy %I on %I for all using (proy_puede_editar(auth.uid(), proy_espacio_de_tarea(tarea_id))) with check (proy_puede_editar(auth.uid(), proy_espacio_de_tarea(tarea_id)))',
      t || '_write', t);
  end loop;
end $$;

drop policy if exists proy_items_select on proy_checklist_items;
create policy proy_items_select on proy_checklist_items for select
  using (proy_puede_ver(auth.uid(), proy_espacio_de_checklist(checklist_id)));
drop policy if exists proy_items_write on proy_checklist_items;
create policy proy_items_write on proy_checklist_items for all
  using (proy_puede_editar(auth.uid(), proy_espacio_de_checklist(checklist_id)))
  with check (proy_puede_editar(auth.uid(), proy_espacio_de_checklist(checklist_id)));

-- Comentarios: comentan propietarios y editores (un lector solo lee);
-- cada quien edita/borra los suyos; el propietario puede borrar cualquiera.
drop policy if exists proy_comentarios_select on proy_comentarios;
create policy proy_comentarios_select on proy_comentarios for select
  using (proy_puede_ver(auth.uid(), proy_espacio_de_tarea(tarea_id)));
drop policy if exists proy_comentarios_insert on proy_comentarios;
create policy proy_comentarios_insert on proy_comentarios for insert
  with check (
    user_id = auth.uid()
    and proy_puede_editar(auth.uid(), proy_espacio_de_tarea(tarea_id))
  );
drop policy if exists proy_comentarios_update on proy_comentarios;
create policy proy_comentarios_update on proy_comentarios for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists proy_comentarios_delete on proy_comentarios;
create policy proy_comentarios_delete on proy_comentarios for delete
  using (
    user_id = auth.uid()
    or proy_es_propietario(auth.uid(), proy_espacio_de_tarea(tarea_id))
  );

-- Actividad: solo lectura (la escriben los triggers).
drop policy if exists proy_actividad_select on proy_actividad;
create policy proy_actividad_select on proy_actividad for select
  using (proy_puede_ver(auth.uid(), proy_espacio_de_tarea(tarea_id)));

-- ---------------------------------------------------------------------
-- 7. Almacenamiento de adjuntos (Supabase Storage)
--    Ruta del objeto:  <espacio_id>/<tarea_id>/<uuid>-<nombre>
--    La primera carpeta es el espacio: de ahí salen los permisos.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('proyectos-adjuntos', 'proyectos-adjuntos', false, 26214400)
on conflict (id) do nothing;

create or replace function proy_espacio_de_objeto(ruta text)
returns uuid
language sql
immutable
as $$
  select case
    when (storage.foldername(ruta))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    then ((storage.foldername(ruta))[1])::uuid
    else null
  end;
$$;

drop policy if exists proy_adjuntos_obj_select on storage.objects;
create policy proy_adjuntos_obj_select on storage.objects for select to authenticated
  using (bucket_id = 'proyectos-adjuntos'
         and proy_puede_ver(auth.uid(), proy_espacio_de_objeto(name)));
drop policy if exists proy_adjuntos_obj_insert on storage.objects;
create policy proy_adjuntos_obj_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'proyectos-adjuntos'
              and proy_puede_editar(auth.uid(), proy_espacio_de_objeto(name)));
drop policy if exists proy_adjuntos_obj_delete on storage.objects;
create policy proy_adjuntos_obj_delete on storage.objects for delete to authenticated
  using (bucket_id = 'proyectos-adjuntos'
         and proy_puede_editar(auth.uid(), proy_espacio_de_objeto(name)));
