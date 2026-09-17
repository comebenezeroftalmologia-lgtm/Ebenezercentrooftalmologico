-- KPIs de tareas: catálogo fijo de indicadores universales (fase 1,
-- ver conversación de producto) — Alto riesgo, SLA/Tiempo de ciclo,
-- Retrabajo, Carga de trabajo. El líder marca al crear/editar la
-- tarea (fase de configuración); el sistema captura los timestamps
-- solo con el cambio de estado normal (fase de ejecución, sin
-- formularios extra) vía un trigger.

alter table tareas
  add column if not exists alto_riesgo boolean not null default false,
  add column if not exists sla_horas integer,
  add column if not exists iniciado_at timestamptz,
  add column if not exists completado_at timestamptz,
  add column if not exists rechazada_at timestamptz,
  add column if not exists veces_rechazada integer not null default 0;

-- "rechazada" — control de calidad / retrabajo. Se puede volver a
-- mover a pendiente/en_progreso para rehacerla.
alter table tareas drop constraint if exists tareas_estado_check;
alter table tareas add constraint tareas_estado_check
  check (estado in ('pendiente', 'en_progreso', 'completada', 'rechazada'));

-- Captura automática de timestamps/contador al cambiar de estado — no
-- depende de qué action haga el update (UI de líder, de operador, o
-- una futura integración), siempre corre.
create or replace function tareas_actualizar_kpis()
returns trigger
language plpgsql
as $$
begin
  if new.estado = 'en_progreso' and old.iniciado_at is null then
    new.iniciado_at := now();
  end if;

  if new.estado = 'completada' and old.estado is distinct from 'completada' then
    new.completado_at := now();
  end if;

  if new.estado = 'rechazada' and old.estado is distinct from 'rechazada' then
    new.rechazada_at := now();
    new.veces_rechazada := coalesce(old.veces_rechazada, 0) + 1;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_tareas_kpis on tareas;
create trigger trg_tareas_kpis
  before update on tareas
  for each row
  execute function tareas_actualizar_kpis();

-- Bug de la migración 007: "procesos" ya es un módulo asignable más
-- (ver src/lib/modulos.ts) pero el check de modulo_accesos se quedó
-- con la lista vieja de 6 — cualquier intento de asignar acceso a
-- "procesos" a un usuario no-admin fallaba silenciosamente contra
-- este constraint. Se corrige aquí.
alter table modulo_accesos drop constraint if exists modulo_accesos_modulo_check;
alter table modulo_accesos add constraint modulo_accesos_modulo_check
  check (modulo in ('leads', 'no_quirurgicos', 'quirurgicos', 'redes_sociales', 'frecuencias', 'venta_del_dia', 'procesos'));
