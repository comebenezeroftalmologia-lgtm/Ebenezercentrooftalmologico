-- Log acumulado de entradas a la etapa "Cirugía Exitosa" (pipeline
-- Campañas / Generación de Clientes Potenciales) — mismo patrón que
-- servicios_agendados_log (migración 014) y por la misma razón: no hay
-- ningún campo en Clientify que registre CUÁNDO una oportunidad pasó a
-- esta etapa (el equipo no marca el deal como "Ganado" en Clientify, así
-- que `status`/`closed_at` no sirven, y `next_appointment_date` en este
-- punto ya es una cita de seguimiento POSTERIOR a la cirugía, no la
-- fecha de la cirugía). Se usa para calcular la "fecha de cierre
-- efectiva" de "Total de Oportunidades Vendidas" y el Paso 3 del Embudo
-- de Conversión cuando la etapa es "Cirugía Exitosa".
create table if not exists cirugia_exitosa_log (
  id bigserial primary key,
  opportunity_id text references opportunities(id) on delete set null,
  pipeline pipeline_type not null default 'generacion_leads',
  entered_at timestamptz not null default now(),
  contact_name text,
  contact_email text,
  contact_phone text,
  service_id integer references services(id),
  value numeric,
  channel text,
  deal_created_at timestamptz,
  synced_at timestamptz not null default now()
);

create index if not exists idx_cirugia_exitosa_log_opportunity
  on cirugia_exitosa_log(opportunity_id);
create index if not exists idx_cirugia_exitosa_log_entered_at
  on cirugia_exitosa_log(entered_at);

alter table cirugia_exitosa_log enable row level security;
