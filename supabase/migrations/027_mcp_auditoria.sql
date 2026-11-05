-- Registro de las escrituras hechas desde el servidor MCP (/api/mcp).
-- Solo la service_role puede leer o escribir: RLS activo y sin políticas.
create table if not exists mcp_auditoria (
  id bigint generated always as identity primary key,
  creado_en timestamptz not null default now(),
  herramienta text not null,
  tabla text,
  detalle jsonb
);

alter table mcp_auditoria enable row level security;

create index if not exists mcp_auditoria_creado_en_idx on mcp_auditoria (creado_en desc);
