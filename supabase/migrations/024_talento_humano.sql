-- ---------------------------------------------------------------------
-- 024 · Talento Humano como modulo asignable
--
-- El tablero de Talento Humano trae nombres completos, salarios, estado
-- civil, hijos, nivel de estudio, dias de incapacidad y evaluaciones de
-- desempeno. Por eso NO entra con el permiso de otro tablero: lleva su
-- propio slug y se asigna persona por persona en /usuarios.
--
-- Ojo con el check de modulo_accesos: es una lista cerrada. Si se agrega
-- un modulo en src/lib/modulos.ts y no se amplia aqui, la asignacion
-- falla en la base de datos y el modulo no se puede dar a nadie. Ya paso
-- antes (ver la nota en 008_tareas_kpis.sql).
-- ---------------------------------------------------------------------
alter table modulo_accesos drop constraint if exists modulo_accesos_modulo_check;
alter table modulo_accesos add constraint modulo_accesos_modulo_check
  check (modulo in (
    'leads', 'no_quirurgicos', 'quirurgicos', 'redes_sociales',
    'frecuencias', 'venta_del_dia', 'procesos', 'proyectos',
    'talento_humano'
  ));
