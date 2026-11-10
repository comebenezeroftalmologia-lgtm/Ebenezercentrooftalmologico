-- ============================================================================
-- Migración 030: cuánto de la glosa se aceptó
-- ============================================================================
-- Aditiva. No borra ni modifica nada existente: agrega una columna.
--
-- EL HUECO QUE CIERRA
--
-- El Excel de glosas tiene 13 columnas y ninguna dice cuánto se aceptó. Dice
-- cuánto glosaron (Valor glosado) y, de forma indirecta, si hubo aceptación:
-- si alguien escribió una NOTA CREDITO real se aceptó, si escribió "N/A" no.
-- Nada más.
--
-- Por eso hoy la pregunta "¿cuánto nos aceptaron de lo glosado?" no tiene
-- respuesta, y tampoco se puede distinguir una aceptación parcial de una
-- total: ambas se ven igual.
--
-- CÓMO SE LEE LA COLUMNA
--
--   null                      -> sin resolver, nadie ha definido el desenlace
--   0                         -> no se aceptó nada
--   igual a valor_glosado     -> aceptación TOTAL
--   entre 0 y valor_glosado   -> aceptación PARCIAL
--
-- A propósito NO se agrega un campo "parcial/total" aparte: sería un segundo
-- dato que puede contradecir al primero. Parcial o total se deduce comparando,
-- y así no hay forma de que los dos queden en desacuerdo.
--
-- El check de cf_glosas.estado no se toca. ACEPTADA sigue significando que se
-- aceptó; esta columna dice cuánto.
-- ============================================================================

alter table cf_glosas add column if not exists valor_aceptado numeric(16,2);

comment on column cf_glosas.valor_aceptado is
  'Cuanto de lo glosado se acepto. null = sin resolver; 0 = no se acepto nada; '
  '= valor_glosado = aceptacion total; entre 0 y valor_glosado = parcial.';

-- Semilla a partir de lo que ya se sabe, sin inventar nada:
--
--   · Las marcadas ACEPTADA se sembran con el valor glosado completo. Es lo
--     que el Excel implica: no registraba aceptaciones parciales, así que
--     toda aceptación que hay registrada es por el total.
--
--   · Las marcadas NO_ACEPTADA se siembran en cero.
--
--   · PENDIENTE y las demás quedan en null, que es lo correcto: nadie las
--     ha resuelto todavía.
--
-- Solo toca filas que aún no tienen valor, para que una corrección hecha a
-- mano después no se pise si esta migración se vuelve a correr.
update cf_glosas
   set valor_aceptado = valor_glosado
 where estado = 'ACEPTADA'
   and valor_aceptado is null;

update cf_glosas
   set valor_aceptado = 0
 where estado = 'NO_ACEPTADA'
   and valor_aceptado is null;

create index if not exists idx_cf_glosas_valor_aceptado
  on cf_glosas(valor_aceptado)
  where valor_aceptado is not null;
