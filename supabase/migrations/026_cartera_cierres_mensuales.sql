-- ---------------------------------------------------------------------
-- 026 · Cierres mensuales de cartera
--
-- SOLO CREA. No hay ningun drop, ni delete, ni alter sobre tablas que ya
-- existan. Si algo fallara, nada de lo que hay hoy se toca.
--
-- POR QUE EXISTE:
-- La grafica "Tendencia del Total de Cartera" mostraba una curva mensual
-- que no era de cierres. Cuando SISMA alcanzaba a responder mostraba el
-- acumulado por mes de factura (de lo que se debe HOY, cuanto viene de
-- facturas hasta cada mes) -- que solo puede subir. Y mientras SISMA
-- respondia, mostraba una curva fabricada interpolando cuatro cortes.
--
-- Lo que gerencia necesita es otra cosa: como CERRO la cartera cada mes.
-- Eso SISMA si lo da, pidiendole /cartera-edades?corte=<fecha>, pero cada
-- consulta tarda entre 10 y 15 segundos. Reconstruir dos anios son 24
-- llamadas: cinco minutos. No se puede hacer en cada visita.
--
-- Por eso se guarda: se calcula una vez por mes y se consulta al instante.
-- Ademas el cierre queda FIJO -- no cambia segun el dia en que se mire --
-- y la historia sobrevive aunque SISMA se caiga.
-- ---------------------------------------------------------------------

create table if not exists cartera_cierres_mensuales (
  anio              smallint     not null,
  mes               smallint     not null check (mes between 1 and 12),
  -- La fecha exacta que se le pidio a SISMA (normalmente el ultimo dia del
  -- mes; para el mes en curso, el dia del calculo).
  fecha_corte       date         not null,
  -- Las cuatro cifras del resumen, tal como las define el tablero:
  --   corriente + vencida = total   ·   total - giros = real
  cartera_corriente bigint       not null default 0,
  cartera_vencida   bigint       not null default 0,
  cartera_total     bigint       not null default 0,
  giros_por_cruzar  bigint       not null default 0,
  cartera_real      bigint       not null default 0,
  -- Cuantas facturas respaldan el calculo. Si un mes trae muchas menos de
  -- lo normal, la cifra es sospechosa y conviene recalcular.
  filas_facturas    integer      not null default 0,
  -- Mes cerrado (ya paso) o mes en curso (se sigue moviendo).
  es_mes_en_curso   boolean      not null default false,
  calculado_at      timestamptz  not null default now(),
  calculado_por     uuid         references app_users(id) on delete set null,
  primary key (anio, mes)
);

comment on table cartera_cierres_mensuales is
  'Como cerro la cartera cada mes, pedido a SISMA una sola vez por mes. '
  'Alimenta la grafica de tendencia. Un mes cerrado no deberia cambiar.';

create index if not exists idx_cartera_cierres_anio
  on cartera_cierres_mensuales (anio, mes);

alter table cartera_cierres_mensuales enable row level security;

-- Nadie entra por la API publica de Supabase: todo pasa por las rutas del
-- servidor, que validan el modulo antes de entregar nada.
--
-- Se crea solo si no existe. No se usa "drop policy ... if exists" a
-- proposito: este archivo no contiene una sola orden que quite algo, asi
-- se puede volver a correr sin miedo y sin que Supabase avise de
-- operaciones destructivas.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'cartera_cierres_mensuales'
      and policyname = 'cartera_cierres_sin_acceso_directo'
  ) then
    create policy cartera_cierres_sin_acceso_directo
      on cartera_cierres_mensuales
      for select using (false);
  end if;
end $$;
