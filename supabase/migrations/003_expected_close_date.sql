-- Migración 003: corrige el campo usado para "Tiempo Promedio de Cierre"
-- del módulo Generación de Clientes Potenciales — Ebenezer confirmó que
-- la comparación correcta es fecha de creación vs FECHA ESPERADA DE
-- CIERRE (campo nativo de Clientify "expected_closed_date"), no la
-- "Fecha de Próxima Cita" (custom field) usada en la primera versión.

alter table opportunities
  add column if not exists expected_close_date date;

create index if not exists idx_opportunities_expected_close
  on opportunities(expected_close_date);
