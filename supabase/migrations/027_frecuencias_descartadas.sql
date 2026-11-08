-- ---------------------------------------------------------------------
-- 027 · Papelera de la carga de Frecuencias
--
-- SOLO CREA. No hay un solo drop, delete ni alter sobre nada que ya
-- exista. Se puede volver a correr sin miedo.
--
-- POR QUE EXISTE
--
-- La carga a Supabase escribe y actualiza, pero nunca quita. Cuando el
-- motor le cambia la fecha a una cirugia (porque llego el archivo de
-- quirofano y la re-fecha al dia real del acto) o cuando una
-- reclasificacion mueve un cargo de unidad funcional, la combinacion
-- vieja desaparece del tablero pero la fila se queda aqui con la foto
-- vieja pegada. Esa plata o esa atencion queda contada dos veces, en dos
-- sitios distintos.
--
-- Ejemplo real, 08-11-2026: habia 5 filas asi. Una biopsia de conjuntiva
-- de Ecopetrol por $142.970 figuraba el 17 de septiembre, cuando hoy el
-- motor la tiene el 16. Otra de $50.820 figuraba el 25 y hoy esta el 23.
--
-- Esta tabla NO es un registro de errores: es la copia de lo que se
-- quita, para que quitar deje de ser definitivo. Si algun dia resulta
-- que el barrido se equivoco, la fila esta aqui con todo y se devuelve.
-- ---------------------------------------------------------------------

create table if not exists frecuencias_descartadas (
  id              bigserial primary key,
  -- De que tabla salio. Hoy solo frecuencias_dias y frecuencias_conteos,
  -- pero el barrido puede crecer a otras.
  tabla           text        not null,
  -- La fila tal como estaba, completa. Se guarda como json y no en
  -- columnas sueltas a proposito: si manana la tabla de origen cambia de
  -- forma, lo que ya se guardo aqui sigue siendo legible.
  fila            jsonb       not null,
  -- La foto que la habia dejado ahi, y la que la encontro sobrando.
  foto_vieja      text,
  foto_nueva      text,
  descartado_at   timestamptz not null default now()
);

comment on table frecuencias_descartadas is
  'Filas que la carga de Frecuencias quito porque el tablero ya no las '
  'reporta en esa fecha/unidad. Se guardan enteras para poder devolverlas.';

create index if not exists idx_frec_descartadas_fecha
  on frecuencias_descartadas (descartado_at desc);

alter table frecuencias_descartadas enable row level security;

-- Nadie entra por la API publica: solo el servidor, con la llave de
-- servicio. Se crea sin "drop policy if exists" a proposito, para que
-- este archivo no contenga ninguna orden que quite algo.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'frecuencias_descartadas'
      and policyname = 'frec_descartadas_sin_acceso_directo'
  ) then
    create policy frec_descartadas_sin_acceso_directo
      on frecuencias_descartadas
      for select using (false);
  end if;
end $$;
