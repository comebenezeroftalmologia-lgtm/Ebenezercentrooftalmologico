-- ---------------------------------------------------------------------
-- 033 · Permisos granulares independientes para Cartera y Radicación
--       (/cartera) y Digiturno y Contact (/digiturno-contact)
-- ---------------------------------------------------------------------

alter table modulo_accesos drop constraint if exists modulo_accesos_modulo_check;

alter table modulo_accesos add constraint modulo_accesos_modulo_check
  check (modulo in (
    'leads', 'no_quirurgicos', 'quirurgicos', 'redes_sociales',
    'frecuencias', 'venta_del_dia', 'cartera_radicacion', 'digiturno_contact',
    'procesos', 'proyectos', 'talento_humano', 'cartera'
  ));
