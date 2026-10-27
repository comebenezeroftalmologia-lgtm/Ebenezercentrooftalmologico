import { createServiceClient } from "@/lib/supabase/server";
import { INFO_TIPO, type TipoNotificacion } from "@/lib/notificaciones/tipos";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const AGRUPAR_MINUTOS = 10;

export interface DatosNotificacion {
  tipo: TipoNotificacion;
  titulo: string;
  cuerpo?: string | null;
  /** Ruta interna a la que lleva el aviso, p. ej. /proyectos/tarea/<id>. */
  url?: string | null;
  /** Quien provoca el aviso: nunca se notifica a sí mismo. */
  actor?: { id: string; nombre: string } | null;
  /** Para agrupar avisos repetidos sobre lo mismo (p. ej. la tarea). */
  entidadId?: string | null;
  /** Si hay un aviso sin leer reciente del mismo tipo y entidad, lo actualiza en vez de crear otro. */
  agrupar?: boolean;
  /** Evita duplicados exactos por persona (p. ej. avisos diarios de fecha límite). */
  clave?: string | null;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function htmlCorreo(nombre: string, n: DatosNotificacion): string {
  const enlace = n.url ? `${SITE_URL}${n.url}` : SITE_URL;
  return `<!doctype html><html><body style="margin:0;background:#F2F7FD;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0F172A">
<div style="max-width:520px;margin:0 auto;padding:24px 16px">
  <div style="background:#ffffff;border:1px solid #E6EEF8;border-radius:14px;padding:28px">
    <p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#64748B">Centro Oftalmológico Ebenezer</p>
    <h1 style="margin:0 0 12px;font-size:18px;color:#0E245E">${esc(n.titulo)}</h1>
    ${n.cuerpo ? `<p style="margin:0 0 20px;font-size:14px;line-height:1.55;color:#334155;white-space:pre-wrap">${esc(n.cuerpo)}</p>` : ""}
    <a href="${esc(enlace)}" style="display:inline-block;background:#1D58D8;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:10px">Abrir en la plataforma</a>
    <p style="margin:22px 0 0;font-size:11px;color:#94A3B8">Hola ${esc(nombre.split(" ")[0] ?? "")}, recibes este correo por tus preferencias de notificaciones.
    Puedes cambiarlas en <a href="${SITE_URL}/perfil#notificaciones" style="color:#1D58D8">Mi Perfil → Notificaciones</a>.</p>
  </div>
</div></body></html>`;
}

async function enviarCorreo(para: string, nombre: string, n: DatosNotificacion): Promise<string | null> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return "RESEND_API_KEY no configurada";
  const from = process.env.RESEND_FROM ?? "Ebenezer <notificaciones@ebenezer-app.com>";
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to: [para], subject: n.titulo, html: htmlCorreo(nombre, n) }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return `Resend ${r.status}: ${(await r.text()).slice(0, 200)}`;
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "error de red";
  }
}

/**
 * Crea el aviso dentro de la plataforma y/o lo envía por correo, según las
 * preferencias de cada destinatario. NUNCA lanza: un fallo al notificar no debe
 * romper la acción que lo originó.
 */
export async function notificar(destinatarios: (string | null | undefined)[], n: DatosNotificacion): Promise<void> {
  try {
    const ids = Array.from(new Set(destinatarios.filter((d): d is string => !!d))).filter((id) => id !== n.actor?.id);
    if (ids.length === 0) return;

    const admin = createServiceClient();
    const [{ data: usuarios }, { data: prefs }] = await Promise.all([
      admin.from("app_users").select("id, nombre_completo, email, activo").in("id", ids),
      admin.from("notificacion_preferencias").select("user_id, en_app, email").eq("tipo", n.tipo).in("user_id", ids),
    ]);
    const prefPor = new Map((prefs ?? []).map((p) => [p.user_id as string, p]));
    const defecto = INFO_TIPO[n.tipo].porDefecto;

    await Promise.allSettled(
      (usuarios ?? [])
        .filter((u) => u.activo)
        .map(async (u) => {
          const p = prefPor.get(u.id);
          const enApp = p ? p.en_app : defecto.enApp;
          const porCorreo = p ? p.email : defecto.email;
          let agrupado = false;
          let filaId: string | null = null;

          if (enApp) {
            // Avisos repetidos sobre lo mismo (p. ej. varios comentarios seguidos): uno solo.
            if (n.agrupar && n.entidadId) {
              const desde = new Date(Date.now() - AGRUPAR_MINUTOS * 60_000).toISOString();
              const { data: previo } = await admin
                .from("notificaciones")
                .select("id, contador")
                .eq("user_id", u.id)
                .eq("tipo", n.tipo)
                .eq("entidad_id", n.entidadId)
                .is("leida_at", null)
                .gte("created_at", desde)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
              if (previo) {
                await admin
                  .from("notificaciones")
                  .update({
                    titulo: n.titulo,
                    cuerpo: n.cuerpo ?? null,
                    actor_id: n.actor?.id ?? null,
                    actor_nombre: n.actor?.nombre ?? null,
                    contador: (previo.contador ?? 1) + 1,
                    created_at: new Date().toISOString(),
                  })
                  .eq("id", previo.id);
                agrupado = true;
              }
            }
            if (!agrupado) {
              const { data: fila, error } = await admin
                .from("notificaciones")
                .insert({
                  user_id: u.id,
                  tipo: n.tipo,
                  titulo: n.titulo.slice(0, 300),
                  cuerpo: n.cuerpo?.slice(0, 600) ?? null,
                  url: n.url ?? null,
                  actor_id: n.actor?.id ?? null,
                  actor_nombre: n.actor?.nombre ?? null,
                  entidad_id: n.entidadId ?? null,
                  clave: n.clave ?? null,
                })
                .select("id")
                .single();
              // 23505 = ya se avisó (misma clave): ni aviso ni correo repetidos.
              if (error?.code === "23505") return;
              if (error) {
                console.error("[notificar] insert", error.message);
              } else {
                filaId = fila.id;
              }
            }
          }

          // Si se agrupó con un aviso reciente, no se manda otro correo.
          if (porCorreo && !agrupado && u.email) {
            const err = await enviarCorreo(u.email, u.nombre_completo, n);
            if (filaId) {
              await admin
                .from("notificaciones")
                .update(err ? { email_error: err } : { email_enviado_at: new Date().toISOString() })
                .eq("id", filaId);
            }
            if (err) console.error("[notificar] correo", err);
          }
        })
    );
  } catch (e) {
    console.error("[notificar]", e);
  }
}

/** Ids de las personas con rol Desarrollador (para avisos de fallas). */
export async function idsDesarrolladores(): Promise<string[]> {
  const admin = createServiceClient();
  const { data } = await admin.from("app_users").select("id").eq("rol", "desarrollador").eq("activo", true);
  return (data ?? []).map((r) => r.id as string);
}

/** Ids de quienes pueden autorizar eliminaciones de `solicitante`: su líder, o los administradores si no tiene. */
export async function idsAutorizadores(liderId: string | null): Promise<string[]> {
  if (liderId) return [liderId];
  const admin = createServiceClient();
  const { data } = await admin.from("app_users").select("id").in("rol", ["administrador", "desarrollador"]).eq("activo", true);
  return (data ?? []).map((r) => r.id as string);
}
