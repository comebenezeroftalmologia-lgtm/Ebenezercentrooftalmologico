-- Proyectos: "Acuerdos de nueva fecha" (postergaciones de la fecha límite).
--
-- Regla de producto:
--   · Cada vez que la fecha límite de una tarea que YA tenía fecha se mueve hacia
--     adelante (o se quita), la base de datos exige un motivo y deja un registro:
--     fecha anterior, fecha nueva, motivo, quién y cuándo.
--   · Adelantar una fecha, o ponerle fecha por primera vez, no cuenta.
--   · El registro no se edita nunca y solo un administrador de la plataforma
--     puede borrarlo.
--
-- La regla vive aquí (trigger), no en la pantalla: aunque alguien llame a la API
-- directamente no puede mover la fecha hacia adelante sin dejar el motivo.
-- Requiere 016_proyectos.sql. Se puede repetir sin problema.

-- ---------------------------------------------------------------------
-- 1. Tabla
-- ---------------------------------------------------------------------
create table if not exists proy_postergaciones (
  id uuid primary key default gen_random_uuid(),
  tarea_id uuid not null references proy_tareas(id) on delete cascade,
  fecha_anterior date not null,
  fecha_nueva date,                      -- null = se quitó la fecha límite
  motivo text not null check (length(btrim(motivo)) >= 5),
  user_id uuid references app_users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists idx_proy_postergaciones_tarea on proy_postergaciones(tarea_id, created_at);

alter table proy_postergaciones enable row level security;

-- Ven el historial quienes ven la tarea.
drop policy if exists proy_postergaciones_select on proy_postergaciones;
create policy proy_postergaciones_select on proy_postergaciones for select
  using (proy_puede_ver(auth.uid(), proy_espacio_de_tarea(tarea_id)));

-- Nadie inserta ni edita a mano (solo el trigger, que es security definer).
-- Borrar: únicamente administradores de la plataforma.
drop policy if exists proy_postergaciones_delete on proy_postergaciones;
create policy proy_postergaciones_delete on proy_postergaciones for delete
  using (is_admin(auth.uid()));

-- ---------------------------------------------------------------------
-- 2. Trigger: mover la fecha límite hacia adelante exige motivo
-- ---------------------------------------------------------------------
create or replace function proy_tarea_postergacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_motivo text;
begin
  -- Sin fecha previa, sin cambio, o fecha adelantada: no es una postergación.
  if old.fecha_limite is null
     or new.fecha_limite is not distinct from old.fecha_limite
     or (new.fecha_limite is not null and new.fecha_limite < old.fecha_limite) then
    return new;
  end if;

  -- Mantenimiento directo en la base (SQL Editor, migraciones): sin usuario
  -- de la plataforma no hay a quién pedirle el motivo.
  if auth.uid() is null then
    return new;
  end if;

  v_motivo := btrim(coalesce(current_setting('proy.motivo_postergacion', true), ''));
  if length(v_motivo) < 5 then
    raise exception 'Para postergar la fecha límite debes registrar el motivo del acuerdo de nueva fecha.'
      using errcode = 'P0001';
  end if;

  insert into proy_postergaciones (tarea_id, fecha_anterior, fecha_nueva, motivo, user_id)
  values (new.id, old.fecha_limite, new.fecha_limite, v_motivo, auth.uid());

  -- El motivo sirve para un solo cambio.
  perform set_config('proy.motivo_postergacion', '', true);
  return new;
end;
$$;
drop trigger if exists trg_proy_tarea_postergacion on proy_tareas;
create trigger trg_proy_tarea_postergacion before update of fecha_limite on proy_tareas
  for each row execute function proy_tarea_postergacion();

-- ---------------------------------------------------------------------
-- 3. Función que usa la aplicación: cambia la fecha dejando el motivo.
--    security invoker: el UPDATE pasa por las políticas RLS de quien llama,
--    o sea que solo propietarios y editores del espacio pueden usarla.
-- ---------------------------------------------------------------------
create or replace function proy_postergar_tarea(p_tarea uuid, p_nueva date, p_motivo text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_motivo text := btrim(coalesce(p_motivo, ''));
begin
  if length(v_motivo) < 5 then
    raise exception 'Escribe el motivo de la nueva fecha (mínimo 5 caracteres).' using errcode = 'P0001';
  end if;

  perform set_config('proy.motivo_postergacion', v_motivo, true);
  update proy_tareas set fecha_limite = p_nueva where id = p_tarea;
  if not found then
    perform set_config('proy.motivo_postergacion', '', true);
    raise exception 'No tienes permiso para editar esta tarea.' using errcode = 'P0001';
  end if;
  perform set_config('proy.motivo_postergacion', '', true);
end;
$$;

grant execute on function proy_postergar_tarea(uuid, date, text) to authenticated;
