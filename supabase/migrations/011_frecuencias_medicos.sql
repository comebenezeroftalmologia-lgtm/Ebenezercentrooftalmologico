-- Migración 011: "Frecuencias" — pestaña "Médicos" (parcial).
--
-- Guarda RAW.medicos[year][medico].por_mes[mes].por_uf_sede[sede][uf]
-- del motor de Pedro, aplanado a una fila por
-- año/mes/médico/sede/UF. "Sede 2" es donde se atiende Mutual — por
-- eso el toggle Mutual (Incluir/Excluir) también decide si Sede 2
-- entra en los totales de esta pestaña, igual que en el tablero
-- original (sedesP solo incluye 'Sede 2' si F.mutual está activo).
--
-- Deliberadamente NO incluye tipo_por_mes (Primera vez/Control/Otros
-- de Consulta Externa) ni pend_pm (pendientes) — quedan para una
-- iteración futura si se necesitan.

create table if not exists frecuencias_medicos_mensual (
  id bigserial primary key,
  year int not null,
  month_num int not null,
  month_name text not null,
  medico text not null,
  sede text not null,
  uf text not null,
  cantidad int not null default 0,
  valor numeric not null default 0,
  source_snapshot text not null,
  synced_at timestamptz not null default now(),
  unique (year, month_num, medico, sede, uf)
);

create index if not exists idx_frecuencias_medicos_year_month on frecuencias_medicos_mensual(year, month_num);
create index if not exists idx_frecuencias_medicos_medico on frecuencias_medicos_mensual(medico);

alter table frecuencias_medicos_mensual enable row level security;
