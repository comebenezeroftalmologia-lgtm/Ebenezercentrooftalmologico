-- ============================================================================
-- Migración 034: Acuerdos reunión Glosas y Devoluciones (6 causales TA-FA + DE,
-- Fecha de prestación de servicios y Seguimiento de pagos / levantamientos / ratificación)
-- ============================================================================
-- Aditiva e idempotente. El aplicativo además persiste en cf_glosas.origen->'gestion_ebenezer'
-- para compatibilidad inmediata sin requerir recreación de tablas.

insert into cf_causales (codigo, familia, nombre, activo)
values
  ('TA', 'Tarifas',        'Diferencias entre los valores cobrados y los precios pactados en el contrato o fijados por ley.', true),
  ('AU', 'Autorizaciones', 'Servicios prestados sin el debido aval o número de autorización acordado con la ERP.', true),
  ('SO', 'Soportes',       'Inconsistencia, enmendadura o ausencia parcial/total de los documentos requeridos (ej. historia clínica).', true),
  ('DE', 'Devoluciones',   'Causales que afectan de forma total la factura por falta de requisitos esenciales para su radicación o trámite.', true),
  ('CO', 'Cobertura',      'Tecnologías o servicios prestados que no corresponden al Plan de Beneficios (PBS) a cargo de esa entidad.', true),
  ('FA', 'Facturación',    'Diferencias en cantidades de servicios, errores administrativos o copagos mal calculados.', true)
on conflict (codigo) do update
  set familia = excluded.familia,
      nombre  = excluded.nombre,
      activo  = true;

alter table cf_glosas
  add column if not exists fecha_prestacion_servicio date,
  add column if not exists seguimiento_estado text,
  add column if not exists valor_seguimiento numeric(14,2);

create index if not exists idx_cf_glosas_origen_gin on cf_glosas using gin (origen);
