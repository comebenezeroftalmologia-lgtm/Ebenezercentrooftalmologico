-- =========================================================
-- Ebenezer Dashboards — esquema Supabase (Postgres)
-- =========================================================
-- Un solo modelo de "oportunidad" para los 3 módulos del sidebar,
-- distinguidos por `pipeline`. Así el cálculo de "etapas" y
-- "tiempo promedio de cierre" es una sola pieza de lógica
-- reutilizada por los 3 tableros, en vez de tres implementaciones.

create table if not exists services (
  id serial primary key,
  name text unique not null -- 'Cataratas', 'Cx Refractiva', 'Ojo Seco', ...
);

insert into services (name) values
  ('Cataratas'), ('Cx Refractiva'), ('Ojo Seco')
on conflict (name) do nothing;

-- Los 3 pipelines de Clientify = los 3 módulos del sidebar
create type pipeline_type as enum (
  'generacion_leads',       -- Campañas / Generación de Clientes Potenciales
  'ordenamientos_no_qx',    -- Ordenamientos No Quirúrgicos
  'ordenamientos_qx'        -- Ordenamientos Quirúrgicos
);

create table if not exists opportunities (
  id text primary key,                  -- id de la oportunidad en Clientify (string, se preserva tal cual)
  pipeline pipeline_type not null,
  stage text not null,                  -- nombre de la etapa actual en Clientify
  service_id integer references services(id),
  value numeric,                        -- valor de la oportunidad (si aplica)
  channel text,                         -- canal/origen (Meta Ads, orgánico, referido, etc.)
  campaign_id text,                     -- id de campaña de Meta Ads, si el lead viene de ahí
  contact_id text,
  created_at timestamptz not null,      -- fecha de creación de la oportunidad
  closed_at timestamptz,                -- fecha en que se cerró (ganada o perdida), null si sigue abierta
  status text not null default 'open',  -- 'open' | 'won' | 'lost'
  raw jsonb,                            -- payload crudo de Clientify por si se necesita algo no modelado
  synced_at timestamptz not null default now()
);

create index if not exists idx_opportunities_pipeline on opportunities(pipeline);
create index if not exists idx_opportunities_service on opportunities(service_id);
create index if not exists idx_opportunities_stage on opportunities(pipeline, stage);

-- Historial de etapas: necesario para calcular tiempo promedio de cierre
-- por etapa (no solo de punta a punta). Si Clientify no expone esto por
-- API, se reconstruye a partir de la primera vez que se ve cada etapa
-- en cada sincronización.
create table if not exists stage_history (
  id bigserial primary key,
  opportunity_id text references opportunities(id) on delete cascade,
  stage text not null,
  entered_at timestamptz not null,
  left_at timestamptz
);

create index if not exists idx_stage_history_opportunity on stage_history(opportunity_id);

-- Gasto de Meta Ads, a nivel de campaña y día (para el módulo de
-- Generación de Clientes Potenciales)
create table if not exists ad_spend (
  id bigserial primary key,
  platform text not null default 'meta_ads',
  campaign_id text not null,
  campaign_name text,
  date date not null,
  spend numeric not null default 0,
  impressions bigint,
  clicks bigint,
  leads bigint,
  synced_at timestamptz not null default now(),
  unique (platform, campaign_id, date)
);

create index if not exists idx_ad_spend_date on ad_spend(date);

-- Estadísticas de redes sociales / contenido
create table if not exists social_stats (
  id bigserial primary key,
  platform text not null,           -- 'instagram', 'facebook', 'tiktok', ...
  metric text not null,             -- 'followers', 'reach', 'engagement', ...
  date date not null,
  value numeric not null,
  synced_at timestamptz not null default now(),
  unique (platform, metric, date)
);

-- Vista: tiempo promedio de cierre (en días) por pipeline y servicio,
-- solo sobre oportunidades ya cerradas (ganadas o perdidas)
create or replace view v_avg_closing_time as
select
  pipeline,
  service_id,
  avg(extract(epoch from (closed_at - created_at)) / 86400.0) as avg_days_to_close,
  count(*) as closed_count
from opportunities
where closed_at is not null
group by pipeline, service_id;

-- Vista: distribución de oportunidades abiertas por etapa (para el
-- gráfico de "Etapas de las Oportunidades" de cada módulo)
create or replace view v_stage_funnel as
select
  pipeline,
  service_id,
  stage,
  count(*) as opportunity_count,
  sum(value) as total_value
from opportunities
where status = 'open'
group by pipeline, service_id, stage;

-- Row Level Security: por defecto bloqueado, se abre por rol
-- una vez se defina el modelo de autenticación (ver README).
alter table opportunities enable row level security;
alter table stage_history enable row level security;
alter table ad_spend enable row level security;
alter table social_stats enable row level security;
