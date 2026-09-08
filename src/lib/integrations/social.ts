/**
 * Integración con la fuente de estadísticas de redes sociales.
 *
 * Confirmado en la documentación de Metricool (help.metricool.com):
 * el API de Metricool solo está disponible en planes Advanced y
 * Custom, y el token se genera en Account Settings > API. Si Ebenezer
 * no tiene uno de esos dos planes, la alternativa es ir directo a la
 * Instagram/Facebook Graph API (insights de la página, sin costo
 * adicional, pero con menos métricas out-of-the-box que Metricool).
 *
 * PENDIENTE DE CONFIRMAR CONTIGO: qué plan de Metricool tiene Ebenezer
 * hoy, para decidir entre las dos rutas antes de construir el sync real.
 */

export interface SocialStatRow {
  platform: string;
  metric: string;
  date: string; // YYYY-MM-DD
  value: number;
}

export async function fetchMetricoolStats({
  from,
  to,
}: {
  from: string;
  to: string;
}): Promise<SocialStatRow[]> {
  const token = process.env.METRICOOL_API_TOKEN;
  const userId = process.env.METRICOOL_USER_ID;
  const blogId = process.env.METRICOOL_BLOG_ID;

  if (!token || !userId || !blogId) {
    throw new Error(
      "Variables de Metricool no configuradas — ver .env.example (o definir la alternativa de Graph API si no hay plan Advanced/Custom)"
    );
  }

  // Endpoint dinámico según la guía oficial: cada métrica tiene su
  // propia ruta bajo /stats. Se deja un placeholder documentado hasta
  // confirmar el plan/las métricas exactas a traer.
  const url = `https://app.metricool.com/api/stats/instagram?userId=${userId}&blogId=${blogId}&from=${from}&to=${to}`;

  const res = await fetch(url, {
    headers: { "X-Mc-Auth": token },
  });

  if (!res.ok) {
    throw new Error(`Metricool API error ${res.status}: ${await res.text()}`);
  }

  const json = await res.json();
  // TODO: mapear la forma real de la respuesta una vez confirmado el
  // plan — esta función asume un array de {date, value} por métrica.
  return json;
}
