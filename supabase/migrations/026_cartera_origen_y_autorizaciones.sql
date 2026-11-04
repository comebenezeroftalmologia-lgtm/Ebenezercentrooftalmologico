-- ============================================================================
-- Migración 020: trazabilidad del origen + autorizaciones pendientes
-- ============================================================================
-- Aditiva sobre la 019. No borra ni modifica nada de lo ya creado: solo
-- agrega columnas y una tabla nueva. Se puede ejecutar aunque la 019 ya esté
-- aplicada y con datos adentro.
--
-- Responde a una exigencia concreta: reemplazar el Excel sin que se pierda
-- información y sin que Facturación sienta que se perdió.
--
--   1. Cada registro migrado guarda la FILA ORIGINAL COMPLETA del Excel en
--      'origen', columna por columna, incluidas las que no tienen campo
--      propio (PREAGRUPADO, OBSERVACION 2, sexo, medio_pago, num_recibo,
--      estado_admision y demás). Nada se descarta: lo que no se modela, se
--      conserva y se puede consultar.
--
--   2. La hoja AUTORIZACIONES PDT entra con tabla propia. No se enlaza por
--      número de factura — su grano es paciente + autorización — pero eso es
--      razón para darle su propia tabla, no para dejarla por fuera.
--
--   3. cf_facturas gana el motivo de anulación, que en la 019 quedó sin
--      lugar: cf_motivos ya contemplaba 'ANULACION' en aplica_a, pero la
--      factura no tenía dónde apuntarlo.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Motivo de anulación y valor glosado/devuelto en la factura
-- ----------------------------------------------------------------------------

-- La columna "MOTIVO DE ANULACIÓN" del Excel (454 de 497 filas) no es una
-- glosa: muchas anulaciones son administrativas (actualización de contrato,
-- radicación fuera de término, error de tercero). Por eso va en la factura y
-- no en cf_glosas.
alter table cf_facturas add column if not exists motivo_anulacion_id    uuid references cf_motivos(id) on delete set null;
alter table cf_facturas add column if not exists motivo_anulacion_texto text;

-- Columna "Glosa / Devolucion" de la hoja ANULACION (335 de 497 filas): el
-- valor glosado o devuelto que originó la anulación.
alter table cf_facturas add column if not exists valor_glosa_devolucion numeric(16,2);

create index if not exists idx_cf_facturas_motivo_anulacion on cf_facturas(motivo_anulacion_id);


-- ----------------------------------------------------------------------------
-- 2. Fila original del Excel en cada tabla de datos
-- ----------------------------------------------------------------------------

-- Formato de 'origen':
--   {
--     "hoja":    "ANULACION",
--     "fila":    47,
--     "archivo": "1. CONTROL ANULACION DE FACTURAS.xlsx",
--     "cargado": "2026-10-20",
--     "datos":   { "<encabezado tal cual>": "<valor tal cual>", ... }
--   }
-- 'datos' lleva TODAS las columnas de la fila, también las que ya tienen
-- campo propio: así la fila se puede reconstruir sin depender del mapeo.
alter table cf_facturas            add column if not exists origen jsonb;
alter table cf_glosas              add column if not exists origen jsonb;
alter table cf_pendientes_facturar add column if not exists origen jsonb;

comment on column cf_facturas.origen            is 'Fila original del Excel, completa y sin transformar. No se modifica después de la carga.';
comment on column cf_glosas.origen              is 'Fila original del Excel, completa y sin transformar. No se modifica después de la carga.';
comment on column cf_pendientes_facturar.origen is 'Fila original del Excel, completa y sin transformar. No se modifica después de la carga.';


-- ----------------------------------------------------------------------------
-- 3. Autorizaciones pendientes
-- ----------------------------------------------------------------------------

-- Hoja "AUTORIZACIONES PDT" del Excel (28 filas). Encabezado interno dice
-- "RESPUESTAS DE GLOSAS MUTUAL", así que el nombre de la hoja y su contenido
-- no coinciden — queda a Facturación aclarar qué representa realmente.
-- Mientras tanto se conserva íntegra, con su fila de origen.
create table if not exists cf_autorizaciones_pendientes (
  id uuid primary key default gen_random_uuid(),

  item            integer,
  paciente_nombre text,
  paciente_id     text,
  solicitud       text,
  autorizacion    text,

  -- Enlace opcional, por si más adelante se logra amarrar con una factura.
  factura_id uuid references cf_facturas(id) on delete set null,

  estado text not null default 'PENDIENTE' check (estado in ('PENDIENTE', 'RESUELTA', 'ANULADA')),
  observaciones text,

  origen jsonb,
  created_by uuid references app_users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cf_autorizaciones_paciente on cf_autorizaciones_pendientes(paciente_id);
create index if not exists idx_cf_autorizaciones_estado   on cf_autorizaciones_pendientes(estado);

drop trigger if exists trg_cf_autorizaciones_updated on cf_autorizaciones_pendientes;
create trigger trg_cf_autorizaciones_updated before update on cf_autorizaciones_pendientes
  for each row execute function cf_set_updated_at();

alter table cf_autorizaciones_pendientes enable row level security;


-- ----------------------------------------------------------------------------
-- 4. Filas que no se pueden enganchar
-- ----------------------------------------------------------------------------

-- Hay filas con información real que no tienen número de factura y por tanto
-- no caben en cf_facturas: por ejemplo una de EPS SURA por $3.622.174 marcada
-- "NO RADICADA", que nunca llegó a facturarse. Sin esta tabla, esas filas se
-- perderían en silencio durante la carga — justo lo que no puede pasar.
--
-- No es un basurero: es una bandeja de pendientes. Cada fila se muestra en el
-- módulo para que Facturación la resuelva, y al resolverla se enlaza con la
-- factura que le corresponda.
create table if not exists cf_sin_identificar (
  id uuid primary key default gen_random_uuid(),

  hoja        text not null,
  fila_excel  integer,
  razon       text not null,
  empresa_texto text,
  valor       numeric(16,2),

  resuelto    boolean not null default false,
  factura_id  uuid references cf_facturas(id) on delete set null,
  nota        text,

  origen jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cf_sin_identificar_resuelto on cf_sin_identificar(resuelto);

drop trigger if exists trg_cf_sin_identificar_updated on cf_sin_identificar;
create trigger trg_cf_sin_identificar_updated before update on cf_sin_identificar
  for each row execute function cf_set_updated_at();

alter table cf_sin_identificar enable row level security;


-- ----------------------------------------------------------------------------
-- 5. Control de la carga
-- ----------------------------------------------------------------------------

-- Deja constancia de cada importación del Excel: qué archivo, cuántas filas
-- se leyeron, cuántas se cargaron y si la conciliación cuadró. Sin esto, una
-- carga repetida por error pasaría inadvertida.
create table if not exists cf_cargas (
  id uuid primary key default gen_random_uuid(),
  archivo       text not null,
  archivo_hash  text,
  filas_leidas  integer not null default 0,
  filas_cargadas integer not null default 0,
  concilia      boolean,
  detalle       jsonb not null default '{}'::jsonb,
  ejecutada_por uuid references app_users(id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now()
);

alter table cf_cargas enable row level security;
