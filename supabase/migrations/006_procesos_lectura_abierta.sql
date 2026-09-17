-- Ajuste: procesos/actividades/tareas/tarea_relaciones deben ser
-- LEGIBLES por cualquier usuario autenticado (es un mapa de procesos de
-- toda la organización, no compartimentos estancos) — necesario además
-- para que un líder pueda buscar y enlazar una tarea de OTRA área
-- (relación puramente informativa). La escritura se mantiene
-- restringida a líder del área (o admin), y colaborador solo puede
-- actualizar sus propias tareas asignadas — eso no cambia.

drop policy if exists procesos_select on procesos;
create policy procesos_select on procesos for select
  using (auth.uid() is not null);

drop policy if exists actividades_select on actividades;
create policy actividades_select on actividades for select
  using (auth.uid() is not null);

drop policy if exists tareas_select on tareas;
create policy tareas_select on tareas for select
  using (auth.uid() is not null);

drop policy if exists tarea_relaciones_select on tarea_relaciones;
create policy tarea_relaciones_select on tarea_relaciones for select
  using (auth.uid() is not null);
