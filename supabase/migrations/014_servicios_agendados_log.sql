-- Log acumulado de "Servicio Agendado" (módulo Generación de Clientes
-- Potenciales / Campañas) — pedido explícito de Ebenezer: en Clientify,
-- cuando una oportunidad cambia de etapa se pierde el rastro de que
-- alguna vez pasó por "Servicio Agendado", lo que hace difícil el
-- seguimiento. Esta tabla guarda una FOTO de los datos relevantes cada
-- vez que el sync detecta que una oportunidad ENTRA a esa etapa (no en
-- cada corrida mientras se queda ahí) — así que un mismo lead que
-- reingresa a la etapa (se reagenda, etc.) genera una fila nueva cada
-- vez, y el historial se conserva aunque el deal después se borre o se
-- fusione en Clientify (por eso opportunity_id NO tiene "on delete
-- cascade" — solo se pone en null, el resto de la fila se conserva).
create table if not exists servicios_agendados_log (
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
  campaign_id text,
  deal_created_at timestamptz,
  synced_at timestamptz not null default now()
);

create index if not exists idx_servicios_agendados_log_opportunity
  on servicios_agendados_log(opportunity_id);
create index if not exists idx_servicios_agendados_log_entered_at
  on servicios_agendados_log(entered_at);

-- Igual que el resto de tablas de reporting: bloqueada por RLS sin
-- políticas — solo el service role (usado por el sync y por las
-- queries del dashboard) puede leer/escribir.
alter table servicios_agendados_log enable row level security;
