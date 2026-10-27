-- Migracion 023: foto de perfil y contador de novedades de Ayuda.

alter table app_users add column if not exists avatar_path text;        -- ruta en el bucket 'avatares'
alter table app_users add column if not exists avatar_updated_at timestamptz;
alter table app_users add column if not exists ayuda_visto_at timestamptz; -- ultima vez que vio el Centro de Conocimiento

-- Bucket privado: las fotos se entregan por /api/avatar/<id> solo a usuarios con sesion.
insert into storage.buckets (id, name, public)
values ('avatares', 'avatares', false)
on conflict (id) do nothing;

select count(*) filter (where avatar_path is not null) as con_foto, count(*) as usuarios from app_users;
