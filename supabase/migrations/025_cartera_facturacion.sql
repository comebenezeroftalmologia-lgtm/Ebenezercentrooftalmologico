-- ============================================================================
-- Migración 019: Control de Facturación (anulaciones, glosas y pendientes)
-- ============================================================================
-- Hasta hoy el módulo "Cartera y Glosas" (/cartera) NO tenía base de datos:
-- TableroCarteraAnalytics.tsx guardaba con localStorage.setItem() en el
-- navegador de cada persona, y el POST /api/cartera escribía con
-- fs.writeFileSync sobre src/lib/cartera-data.json — un write que en Vercel
-- falla en silencio porque el filesystem es de solo lectura. Resultado: cada
-- facturadora veía solo sus propios registros y todo se perdía al limpiar
-- caché o cambiar de equipo. Estas tablas son la persistencia real.
--
-- Decisión de modelo (validada con Facturación, 2026-10-20): una factura
-- puede tener VARIAS glosas, cada una con su motivo, su valor y su desenlace
-- propio — una aceptada y otra objetada sobre la misma factura es válido y
-- frecuente. Por eso el grano no es "una fila por factura" (como en el Excel,
-- donde la misma factura aparecía repetida en 3 hojas distintas) sino
-- factura 1—N glosas.
--
-- Las 4 pestañas actuales de la UI (Anuladas / Legalizadas / Glosas y Notas
-- Crédito / Pendientes Facturar) pasan a ser VISTAS sobre estas tablas, no
-- listas independientes.
--
-- No incluye la hoja "AUTORIZACIONES PDT" del Excel: su grano es paciente +
-- número de autorización, no tiene número de factura y no se une al ciclo.
-- Queda fuera de alcance hasta definirla aparte.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- CATÁLOGOS
-- ----------------------------------------------------------------------------

-- Empresas (EPS, prepagadas, aseguradoras). El Excel traía 26 variantes de
-- escritura para ~22 empresas reales (HDI / HDI SEGUROS, EPS SURA / SURA EPS /
-- EPS SURAMERICANA SA). Acá queda el nombre canónico; la variante tal como
-- venía se conserva en cf_facturas.empresa_nombre_original para trazabilidad.
create table if not exists cf_empresas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Facturadoras. Se guardan como catálogo y no como texto libre porque el Excel
-- traía "MARIA ALEJANDRA" y "MARIA ALEJADRA", "MARIA PAOLA" y "MARIA PAOLA
-- DIAZ", y hasta 3 filas con un número de cédula en vez del nombre.
-- 'activo = false' conserva a quien ya no registra (p. ej. Yuleibis) sin
-- romper el histórico que quedó a su nombre.
create table if not exists cf_responsables (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  user_id uuid references app_users(id) on delete set null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Catálogo CERRADO de motivos. Nace vacío a propósito: la lista la propone
-- el análisis de los 142 textos libres del Excel y la valida Facturación
-- antes de quedar fija (paso aparte). Mientras tanto cf_glosas.motivo_texto
-- conserva el texto original, así la migración de datos no queda bloqueada
-- esperando el catálogo.
create table if not exists cf_motivos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  categoria text not null check (categoria in (
    'RADICACION', 'TARIFA', 'SOPORTES', 'AUTORIZACION',
    'PERTINENCIA', 'FACTURACION', 'CONTRATO', 'OTRO'
  )),
  aplica_a text not null default 'AMBOS' check (aplica_a in ('ANULACION', 'GLOSA', 'AMBOS')),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- FACTURAS
-- ----------------------------------------------------------------------------

-- Una fila por factura. 'numero' es único y normalizado (FCOE + dígitos, sin
-- espacios): en el Excel había 6 números con espacios al final y 10
-- duplicados dentro de la misma hoja.
create table if not exists cf_facturas (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  empresa_id uuid references cf_empresas(id) on delete restrict,
  empresa_nombre_original text,
  anio integer,
  periodo text,

  fecha_elaboracion date,
  fecha_radicacion date,
  fecha_anulacion date,

  valor_radicado numeric(16,2) not null default 0,
  copagos numeric(16,2) not null default 0,

  -- Estado del ciclo de vida de la factura. La glosa NO es un estado de la
  -- factura: vive en cf_glosas, porque pueden coexistir varias con desenlaces
  -- distintos.
  estado text not null default 'RADICADA' check (estado in (
    'PENDIENTE_RADICAR',
    'RADICADA',
    'ANULADA',
    'PENDIENTE_REEMPLAZO',
    'REEMPLAZADA',
    'LEGALIZADA'
  )),

  -- Cadena de refacturación: esta factura reemplaza a otra.
  reemplaza_a_id uuid references cf_facturas(id) on delete set null,
  nota_credito text,

  rips text,
  revision_financiera text,
  responsable_id uuid references cf_responsables(id) on delete set null,
  observaciones text,

  created_by uuid references app_users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cf_facturas_numero on cf_facturas(numero);
create index if not exists idx_cf_facturas_empresa on cf_facturas(empresa_id);
create index if not exists idx_cf_facturas_estado on cf_facturas(estado);
create index if not exists idx_cf_facturas_anio on cf_facturas(anio);
create index if not exists idx_cf_facturas_fecha_rad on cf_facturas(fecha_radicacion);


-- ----------------------------------------------------------------------------
-- GLOSAS  (1 factura → N glosas)
-- ----------------------------------------------------------------------------

create table if not exists cf_glosas (
  id uuid primary key default gen_random_uuid(),
  factura_id uuid not null references cf_facturas(id) on delete cascade,
  consecutivo text,                       -- "GLOSA 0013" del Excel

  tipo text not null default 'GLOSA' check (tipo in ('GLOSA', 'DEVOLUCION')),

  motivo_id uuid references cf_motivos(id) on delete set null,
  motivo_texto text,                      -- texto original; se conserva siempre
  observacion text,                       -- observación libre, separada del motivo

  valor_glosado numeric(16,2) not null default 0,

  -- Desenlace de ESTA glosa, independiente de las demás de la misma factura.
  estado text not null default 'PENDIENTE' check (estado in (
    'PENDIENTE',          -- recibida, sin responder
    'RESPONDIDA',         -- respondida, esperando decisión del pagador
    'ACEPTADA',           -- la aceptamos nosotros
    'NO_ACEPTADA',        -- la objetamos
    'LEGALIZADA'          -- cerrada con acta / nota crédito
  )),

  fecha_glosa date,
  fecha_respuesta date,
  nota_credito text,

  facturador_id uuid references cf_responsables(id) on delete set null,
  responsable_aceptacion_id uuid references cf_responsables(id) on delete set null,

  created_by uuid references app_users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cf_glosas_factura on cf_glosas(factura_id);
create index if not exists idx_cf_glosas_estado on cf_glosas(estado);
create index if not exists idx_cf_glosas_motivo on cf_glosas(motivo_id);
create index if not exists idx_cf_glosas_fecha on cf_glosas(fecha_glosa);


-- ----------------------------------------------------------------------------
-- PENDIENTES POR FACTURAR
-- ----------------------------------------------------------------------------

-- Grano distinto al de factura: es un SERVICIO prestado que todavía no se
-- facturó. Cuando se factura, se enlaza con factura_id (en el Excel, 71 de
-- las 152 filas ya tenían el número de factura escrito a mano dentro de
-- "Observaciones").
create table if not exists cf_pendientes_facturar (
  id uuid primary key default gen_random_uuid(),

  paciente_tipo_id text,
  paciente_num_id text,
  paciente_nombre text,

  empresa_id uuid references cf_empresas(id) on delete restrict,
  empresa_nombre_original text,
  contrato text,

  fecha_servicio date,
  anio integer,
  unidad_funcional text,
  cups text,
  descripcion text,
  medico text,
  autorizacion text,
  cantidad integer not null default 1,
  valor_servicio numeric(16,2) not null default 0,

  estado text not null default 'PENDIENTE' check (estado in (
    'PENDIENTE', 'FACTURADO', 'ANULADO', 'NO_FACTURABLE'
  )),
  factura_id uuid references cf_facturas(id) on delete set null,

  responsable_id uuid references cf_responsables(id) on delete set null,
  observaciones text,

  created_by uuid references app_users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cf_pendientes_estado on cf_pendientes_facturar(estado);
create index if not exists idx_cf_pendientes_empresa on cf_pendientes_facturar(empresa_id);
create index if not exists idx_cf_pendientes_fecha on cf_pendientes_facturar(fecha_servicio);
create index if not exists idx_cf_pendientes_factura on cf_pendientes_facturar(factura_id);


-- ----------------------------------------------------------------------------
-- HISTORIAL
-- ----------------------------------------------------------------------------

-- El motivo explícito de esta tabla: SISMA no guarda el historial de la
-- gestión de glosas. Acá sí. Cada alta, edición o cambio de estado deja una
-- fila con quién, cuándo y qué cambió. Mismo patrón que proy_actividad.
-- No se borra nunca: por eso entidad_id no tiene FK con cascade — si el
-- registro se elimina, su rastro se conserva.
create table if not exists cf_historial (
  id uuid primary key default gen_random_uuid(),

  entidad text not null check (entidad in ('factura', 'glosa', 'pendiente')),
  entidad_id uuid not null,
  factura_numero text,                    -- copia para poder buscar por factura

  accion text not null check (accion in (
    'CREAR', 'EDITAR', 'CAMBIO_ESTADO', 'ELIMINAR', 'IMPORTAR'
  )),
  detalle jsonb not null default '{}'::jsonb,   -- { campo: {antes, despues} }

  user_id uuid references app_users(id) on delete set null default auth.uid(),
  user_nombre text,                       -- foto del nombre al momento del cambio
  created_at timestamptz not null default now()
);

create index if not exists idx_cf_historial_entidad on cf_historial(entidad, entidad_id);
create index if not exists idx_cf_historial_factura on cf_historial(factura_numero);
create index if not exists idx_cf_historial_fecha on cf_historial(created_at desc);


-- ----------------------------------------------------------------------------
-- updated_at automático
-- ----------------------------------------------------------------------------

create or replace function cf_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_cf_facturas_updated on cf_facturas;
create trigger trg_cf_facturas_updated before update on cf_facturas
  for each row execute function cf_set_updated_at();

drop trigger if exists trg_cf_glosas_updated on cf_glosas;
create trigger trg_cf_glosas_updated before update on cf_glosas
  for each row execute function cf_set_updated_at();

drop trigger if exists trg_cf_pendientes_updated on cf_pendientes_facturar;
create trigger trg_cf_pendientes_updated before update on cf_pendientes_facturar
  for each row execute function cf_set_updated_at();


-- ----------------------------------------------------------------------------
-- SEMILLA DE CATÁLOGOS
-- ----------------------------------------------------------------------------

-- Facturadoras confirmadas. Yuleibis queda inactiva: no registra, pero el
-- histórico que ya está a su nombre se conserva.
insert into cf_responsables (nombre, activo) values
  ('MARIA ALEJANDRA', true),
  ('MARIA PAOLA',     true),
  ('MARIA JOSE',      true),
  ('ERIKA ALZATE',    true),
  ('YULEIBIS',        false),
  ('SIN ASIGNAR',     false)
on conflict (nombre) do nothing;

-- Empresas tomadas de empresasDisponibles de cartera-data.json (nombres ya
-- canonizados por el módulo actual).
insert into cf_empresas (nombre) values
  ('COLSANITAS'), ('MEDPLUS'), ('MUTUAL SER'), ('EPS SURA'), ('ECOPETROL'),
  ('SURA POLIZA'), ('COLMEDICA'), ('HDI SEGUROS')
on conflict (nombre) do nothing;


-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------

-- Igual que el resto de tablas de reporting del proyecto: RLS activo SIN
-- políticas, de modo que solo el service role entra. El módulo lee y escribe
-- desde route handlers del servidor que ya pasan por requireAppUser(), así
-- que la autorización por persona sigue viviendo en esa capa.
alter table cf_empresas            enable row level security;
alter table cf_responsables        enable row level security;
alter table cf_motivos             enable row level security;
alter table cf_facturas            enable row level security;
alter table cf_glosas              enable row level security;
alter table cf_pendientes_facturar enable row level security;
alter table cf_historial           enable row level security;
