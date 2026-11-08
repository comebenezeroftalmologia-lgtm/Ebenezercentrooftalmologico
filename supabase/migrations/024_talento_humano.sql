-- ---------------------------------------------------------------------
-- 024 · Modulos que se pueden asignar a una persona
--
-- POR QUE EXISTE
--
-- `modulo_accesos` tiene una lista cerrada de modulos validos. Esa lista
-- hay que ampliarla cada vez que nace un tablero nuevo, o la asignacion
-- del permiso falla con un error de restriccion que no dice nada util.
--
-- Esta version agrega DOS que faltaban, no uno:
--
--   talento_humano · trae nombres, salarios, incapacidades y evaluaciones.
--     Por eso va con slug propio y no cuelga del permiso de otro tablero:
--     se asigna persona por persona, sin que nadie lo herede por error.
--
--   cartera · aqui se registra la plata glosada y devuelta. La vista de
--     Analytics entraba con el permiso de "frecuencias"; esta superficie
--     de trabajo se asigna aparte.
--
-- La version anterior de este archivo solo traia talento_humano. Si se
-- hubiera corrido asi, asignar "cartera" habria reventado contra la
-- restriccion -- el codigo ya lo ofrece (ver src/lib/modulos.ts), la base
-- lo habria rechazado, y el mensaje no habria explicado por que.
--
-- COMPROBADO ANTES DE CORRERLA (08-11-2026): los modulos que hoy existen
-- en la tabla son frecuencias, leads, no_quirurgicos, procesos, proyectos,
-- quirurgicos, redes_sociales y venta_del_dia. Los ocho estan en la lista
-- de abajo, asi que ninguna fila existente queda fuera de la regla.
-- ---------------------------------------------------------------------

alter table modulo_accesos drop constraint if exists modulo_accesos_modulo_check;

alter table modulo_accesos add constraint modulo_accesos_modulo_check
  check (modulo in (
    'leads', 'no_quirurgicos', 'quirurgicos', 'redes_sociales',
    'frecuencias', 'venta_del_dia', 'procesos', 'proyectos',
    'talento_humano', 'cartera'
  ));
