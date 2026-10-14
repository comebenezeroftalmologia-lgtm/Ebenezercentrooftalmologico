-- MigraciÃ³n 018: Crear Ã¡rea "AtenciÃ³n al Usuario (SIAU)" y asignar a Pedro Herrera como lÃ­der
insert into areas (nombre)
values ('AtenciÃ³n al Usuario (SIAU)')
on conflict (nombre) do nothing;

do $$
declare
  v_area_id uuid;
  v_user_id uuid;
begin
  select id into v_area_id from areas where nombre = 'AtenciÃ³n al Usuario (SIAU)' limit 1;
  select id into v_user_id from app_users where nombre_completo ilike '%pedro%' and activo = true limit 1;
  if v_user_id is null then
    select id into v_user_id from app_users where is_admin = true and activo = true limit 1;
  end if;

  if v_area_id is not null and v_user_id is not null then
    insert into area_asignaciones (area_id, user_id, rol, asignado_por)
    values (v_area_id, v_user_id, 'lider', v_user_id)
    on conflict (area_id, user_id) do update set rol = 'lider';
  end if;
end $$;