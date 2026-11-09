-- ============================================================================
-- Migración 031: si la glosa fue parcial o total
-- ============================================================================
-- Aditiva. Agrega una columna; no borra ni cambia nada de lo que ya existe.
--
-- QUÉ FALTABA
--
-- cf_glosas.tipo solo distingue GLOSA de DEVOLUCION. Facturación trabaja con
-- tres categorías, no dos: glosa parcial, glosa total y devolución. La
-- diferencia no es cosmética — una glosa total deja la factura entera en el
-- aire y una parcial no.
--
-- POR QUÉ SE GUARDA EN VEZ DE CALCULARSE
--
-- Se podría deducir comparando valor_glosado con valor_radicado, y de hecho
-- así se sembra abajo. Pero 83 glosas del Excel no traen monto: de esas no
-- hay nada que comparar, y quedarían clasificadas mal en silencio. Guardarlo
-- permite que esas 83 queden en blanco, visibles, para que alguien que sepa
-- las defina.
--
-- CÓMO SE LEE
--
--   null       -> todavía nadie lo ha definido
--   'PARCIAL'  -> glosaron una parte de la factura
--   'TOTAL'    -> glosaron la factura entera
--
-- El tipo (GLOSA / DEVOLUCION) no se toca: las tres opciones de la pantalla
-- son la combinación de los dos campos.
-- ============================================================================

alter table cf_glosas
  add column if not exists alcance text
  check (alcance in ('PARCIAL', 'TOTAL'));

comment on column cf_glosas.alcance is
  'Si glosaron parte de la factura (PARCIAL) o la factura entera (TOTAL). '
  'null = sin definir. Se combina con tipo: GLOSA+PARCIAL, GLOSA+TOTAL, DEVOLUCION+TOTAL.';

-- Siembra, sin inventar:
--
--   · Una devolución devuelve la factura completa por definición, así que
--     va en TOTAL aunque no traiga monto registrado.
--
--   · Una glosa con monto se compara con lo radicado de su factura.
--
--   · Una glosa sin monto queda en null. Son 83 y las tiene que definir
--     quien conozca el caso; el tablero las muestra en blanco a propósito.
update cf_glosas
   set alcance = 'TOTAL'
 where tipo = 'DEVOLUCION'
   and alcance is null;

update cf_glosas g
   set alcance = case
                   when g.valor_glosado >= f.valor_radicado then 'TOTAL'
                   else 'PARCIAL'
                 end
  from cf_facturas f
 where f.id = g.factura_id
   and g.tipo = 'GLOSA'
   and g.alcance is null
   and g.valor_glosado > 0
   and f.valor_radicado > 0;

create index if not exists idx_cf_glosas_alcance on cf_glosas(alcance);
