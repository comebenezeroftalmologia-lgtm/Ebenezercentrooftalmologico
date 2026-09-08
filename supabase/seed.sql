-- Datos de ejemplo para poder desarrollar y ver los 3 tableros
-- funcionando ANTES de tener las credenciales reales de Meta Ads /
-- Clientify conectadas. Formato idéntico al de las tablas reales,
-- así que cuando la sincronización real esté lista, estos datos se
-- reemplazan sin tocar el frontend.

insert into opportunities (id, pipeline, stage, service_id, value, channel, campaign_id, created_at, closed_at, status)
values
  ('demo-1', 'generacion_leads', 'Contacto inicial', 1, 0, 'Meta Ads', 'camp-cataratas-01', now() - interval '20 days', null, 'open'),
  ('demo-2', 'generacion_leads', 'Cita agendada', 2, 0, 'Meta Ads', 'camp-refractiva-01', now() - interval '15 days', null, 'open'),
  ('demo-3', 'generacion_leads', 'Cita agendada', 3, 0, 'Meta Ads', 'camp-ojoseco-01', now() - interval '12 days', now() - interval '9 days', 'won'),
  ('demo-4', 'ordenamientos_no_qx', 'Orden generada', 3, 350000, 'Clientify', null, now() - interval '18 days', null, 'open'),
  ('demo-5', 'ordenamientos_no_qx', 'Pago confirmado', 2, 420000, 'Clientify', null, now() - interval '25 days', now() - interval '20 days', 'won'),
  ('demo-6', 'ordenamientos_qx', 'Valoración preoperatoria', 1, 3200000, 'Clientify', null, now() - interval '30 days', null, 'open'),
  ('demo-7', 'ordenamientos_qx', 'Cirugía realizada', 1, 3500000, 'Clientify', null, now() - interval '45 days', now() - interval '10 days', 'won')
on conflict (id) do nothing;

insert into ad_spend (platform, campaign_id, campaign_name, date, spend, impressions, clicks, leads)
values
  ('meta_ads', 'camp-cataratas-01', 'Cataratas - Evaluación gratis', current_date - 5, 180000, 12000, 340, 9),
  ('meta_ads', 'camp-refractiva-01', 'Cx Refractiva - Descuento preop', current_date - 5, 220000, 15500, 410, 11),
  ('meta_ads', 'camp-ojoseco-01', 'Ojo Seco - Síntomas', current_date - 5, 95000, 8000, 190, 6)
on conflict (platform, campaign_id, date) do nothing;

insert into social_stats (platform, metric, date, value)
values
  ('instagram', 'followers', current_date - 1, 15420),
  ('instagram', 'reach', current_date - 1, 32000),
  ('facebook', 'followers', current_date - 1, 9800)
on conflict (platform, metric, date) do nothing;
