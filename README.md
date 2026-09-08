# Ebenezer — Tableros comerciales

Plataforma de tableros de control para Centro Oftalmológico Ebenezer,
que consolida **Meta Ads**, **Clientify** y estadísticas de **redes
sociales** en 3 módulos:

1. **Generación de Clientes Potenciales** — gasto en Meta Ads, etapas
   de las oportunidades, filtro por servicio (Cataratas, Cx
   Refractiva, Ojo Seco) y tiempo promedio de cierre.
2. **Ordenamientos No Quirúrgicos** — etapas de las oportunidades y
   tiempo promedio de cierre.
3. **Ordenamientos Quirúrgicos** — etapas de las oportunidades y
   tiempo promedio de cierre.

Cada módulo corresponde 1 a 1 con un pipeline de Clientify.

## Stack

- **Next.js 14** (App Router, TypeScript, Tailwind) — UI y API routes
- **Supabase** (Postgres) — base de datos y (a futuro) autenticación
- **Vercel** — hosting + Cron Jobs para la sincronización diaria
- **GitHub** — control de versiones y despliegue automático a Vercel

## Estructura

```
src/
  app/
    leads/page.tsx              Módulo 1
    no-quirurgicos/page.tsx     Módulo 2
    quirurgicos/page.tsx        Módulo 3
    api/sync/meta-ads/route.ts  Sincronización Meta Ads (cron)
    api/sync/clientify/route.ts Sincronización Clientify (cron)
  components/                   Sidebar, gráficos, filtros, KPI cards
  lib/
    integrations/                Adaptadores Meta Ads / Clientify / redes
    queries.ts                   Lecturas a Supabase para cada tablero
    types.ts                     Modelo de datos compartido
supabase/
  schema.sql   Tablas y vistas (ejecutar una vez en el SQL editor de Supabase)
  seed.sql     Datos de ejemplo para desarrollar sin credenciales reales
```

## Cómo levantarlo

1. Crear un proyecto en [supabase.com](https://supabase.com), correr
   `supabase/schema.sql` en el SQL editor, y opcionalmente
   `supabase/seed.sql` para ver los tableros con datos de ejemplo.
2. Copiar `.env.example` a `.env.local` y llenar las llaves de
   Supabase (Project Settings > API).
3. `npm install`
4. `npm run dev` → http://localhost:3000

Con solo el paso 1-3 ya se ven los 3 tableros funcionando (con los
datos de `seed.sql`), sin necesitar todavía las credenciales de Meta
Ads / Clientify / redes sociales.

## Conectar las APIs reales

Cada integración vive en `src/lib/integrations/` y está documentada
con lo que confirmé en la documentación oficial de cada plataforma,
más los puntos que faltan validar contigo:

- **Meta Ads** (`meta-ads.ts`): confirmado — Graph API, endpoint
  `/insights`, autenticación por `access_token` de sistema generado en
  Business Manager. Falta: `META_AD_ACCOUNT_ID` y generar el token de
  sistema con permiso `ads_read`.
- **Clientify** (`clientify.ts`): confirmado — REST + JSON, autenticación
  por API key. Falta confirmar (la documentación completa requiere
  login): el header exacto de autenticación, el nombre del recurso de
  oportunidades, y si el plan actual ya tiene la API habilitada.
- **Redes sociales** (`social.ts`): si Ebenezer tiene Metricool en
  plan Advanced o Custom, se usa su API; si no, la alternativa es la
  Instagram/Facebook Graph API directamente (gratis, menos métricas
  listas para usar).

Una vez confirmados esos datos, se llenan las variables en
`.env.local` (o en Vercel > Settings > Environment Variables) y los
endpoints `/api/sync/meta-ads` y `/api/sync/clientify` quedan listos
para correr automáticamente vía Vercel Cron (ver `vercel.json`, se
ejecutan una vez al día).

## Desplegar

1. Subir este proyecto a un repo de GitHub.
2. Importarlo en [vercel.com](https://vercel.com) → detecta Next.js
   automáticamente.
3. Configurar las mismas variables de entorno de `.env.example` en
   Vercel (Project Settings > Environment Variables), incluyendo
   `CRON_SECRET` (cualquier string largo — Vercel lo usa para
   autenticar sus propias llamadas a los endpoints de sincronización).
4. Deploy. Los crons de `vercel.json` quedan activos automáticamente.

_Última actualización: 2026-09-08 04:43_
