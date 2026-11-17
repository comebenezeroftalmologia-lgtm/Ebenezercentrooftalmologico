"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { invitarUsuarioAction } from "@/lib/procesos/actions";
import { MODULOS, modulosPorGrupo, type Modulo } from "@/lib/modulos";
import { ROLES_PLATAFORMA, type ResultadoInvitacion, type RolPlataforma } from "@/lib/procesos/types";

function BotonInvitar({ tieneClave }: { tieneClave: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 ease-eb-out hover:bg-navy-90 disabled:opacity-60"
    >
      {pending
        ? "Guardando…"
        : tieneClave
        ? "Crear usuario con ingreso inmediato"
        : "Invitar usuario"}
    </button>
  );
}

const ESTADO_INICIAL: ResultadoInvitacion = { error: null };

export function InvitarUsuarioForm({
  roles,
  lideres,
  yoEsLider,
  modulosDisponibles,
}: {
  roles: RolPlataforma[];
  lideres: { id: string; nombre: string }[];
  yoEsLider: boolean;
  modulosDisponibles: Modulo[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState(invitarUsuarioAction, ESTADO_INICIAL);
  const [rol, setRol] = useState<RolPlataforma>(
    roles.includes("usuario_basico") ? "usuario_basico" : roles[0]
  );
  const [passwordInicial, setPasswordInicial] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [seleccion, setSeleccion] = useState<Set<Modulo>>(new Set());
  const [copiado, setCopiado] = useState(false);

  const disponiblesSet = new Set(modulosDisponibles);
  const grupos = modulosPorGrupo(MODULOS.filter((m) => disponiblesSet.has(m.slug)));
  const rolesOpciones = ROLES_PLATAFORMA.filter((r) => roles.includes(r.valor));
  const esAccesoTotal = rol === "desarrollador" || rol === "administrador";

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setPasswordInicial("");
      setSeleccion(new Set());
      setCopiado(false);
    }
  }, [state]);

  function toggleModulo(slug: Modulo) {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  async function copiarEnlace(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    } catch {}
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="eb-label mb-1 block text-[11px] text-ink-3">Nombre completo</label>
          <input
            name="nombreCompleto"
            type="text"
            required
            placeholder="Ej. María Alejandra Gómez"
            className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
          />
        </div>
        <div>
          <label className="eb-label mb-1 block text-[11px] text-ink-3">Correo</label>
          <input
            name="email"
            type="email"
            required
            placeholder="persona@correo.com"
            className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
          />
        </div>
        <div>
          <label className="eb-label mb-1 block text-[11px] text-ink-3">Rol</label>
          <select
            name="rol"
            value={rol}
            onChange={(e) => setRol(e.target.value as RolPlataforma)}
            className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
          >
            {rolesOpciones.map((r) => (
              <option key={r.valor} value={r.valor}>
                {r.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-ink-3">
            {rolesOpciones.find((r) => r.valor === rol)?.descripcion}
          </p>
        </div>

        {rol === "usuario_basico" && !yoEsLider && (
          <div>
            <label className="eb-label mb-1 block text-[11px] text-ink-3">
              Líder (autoriza sus eliminaciones)
            </label>
            <select
              name="liderId"
              defaultValue=""
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
            >
              <option value="">Sin líder específico (autoriza Administración)</option>
              {lideres.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-ink-3">
              Puedes elegir un Líder, un Administrador o dejar que autorice Administración.
            </p>
          </div>
        )}

        <div>
          <label className="eb-label mb-1 block text-[11px] text-ink-3">
            Contraseña inicial (opcional · ingreso inmediato)
          </label>
          <div className="relative">
            <input
              name="passwordInicial"
              type={verClave ? "text" : "password"}
              value={passwordInicial}
              onChange={(e) => setPasswordInicial(e.target.value)}
              minLength={8}
              autoComplete="new-password"
              placeholder="Déjala vacía para enviar invitación por correo"
              className="w-full rounded-lg border border-line px-3 py-2 pr-9 text-sm text-ink"
            />
            <button
              type="button"
              onClick={() => setVerClave((v) => !v)}
              tabIndex={-1}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-navy"
              title={verClave ? "Ocultar contraseña" : "Ver contraseña"}
            >
              {verClave ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1 text-[11px] text-ink-3">
            Si escribes una clave (mín. 8 caracteres), la persona entra de una vez en{" "}
            <span className="font-medium text-navy">/login</span> sin esperar correo.
          </p>
        </div>
      </div>

      {esAccesoTotal ? (
        <p className="rounded-lg bg-[#EFF6FF] px-3 py-2 text-xs text-[#1E3A8A]">
          Este rol tiene acceso automático a todos los módulos de Analytics, Procesos y WorkCenter.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="eb-label block text-[11px] text-ink-3">
              Acceso a módulos ({seleccion.size} seleccionados)
            </p>
            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => setSeleccion(new Set(modulosDisponibles))}
                className="font-medium text-blue hover:underline"
              >
                Marcar todos
              </button>
              {seleccion.size > 0 && (
                <button
                  type="button"
                  onClick={() => setSeleccion(new Set())}
                  className="font-medium text-ink-3 hover:text-navy hover:underline"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
          {(Object.keys(grupos) as (keyof typeof grupos)[]).map((grupo) => (
            <div key={grupo}>
              <p className="mb-1.5 text-xs font-semibold text-navy">{grupo}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {grupos[grupo].map((m) => (
                  <label
                    key={m.slug}
                    className="flex cursor-pointer items-center gap-2 text-sm text-ink-2"
                  >
                    <input
                      name="modulos"
                      type="checkbox"
                      value={m.slug}
                      checked={seleccion.has(m.slug)}
                      onChange={() => toggleModulo(m.slug)}
                      className="h-4 w-4 rounded border-line"
                    />
                    {m.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {state.error && (
        <p className="rounded-lg bg-[#FBEAE8] px-3 py-2 text-xs text-[#B3261E]">{state.error}</p>
      )}

      {state.ok && state.modo === "clave_directa" && (
        <p className="rounded-lg bg-green-10 px-3 py-2.5 text-xs text-green">
          Usuario <strong>{state.emailCreado}</strong> creado y activo de inmediato. Ya puede ingresar en{" "}
          <strong>/login</strong> con su correo y la contraseña asignada.
        </p>
      )}

      {state.ok && state.modo === "correo_enviado" && (
        <p className="rounded-lg bg-green-10 px-3 py-2.5 text-xs text-green">
          Invitación enviada a <strong>{state.emailCreado}</strong>. Si el correo tarda o cae en Spam, en su
          tarjeta de abajo puedes pulsar <strong>Copiar link</strong> o asignarle una <strong>Contraseña</strong> directa.
        </p>
      )}

      {state.ok && state.modo === "link_manual" && state.inviteLink && (
        <div className="flex flex-col gap-2 rounded-lg border border-[#F5D9A8] bg-[#FFFAF0] p-3 text-xs text-[#7A4100]">
          <p>
            Usuario <strong>{state.emailCreado}</strong> creado. El correo automático fue limitado por el servidor;
            copia este enlace directo de activación y envíaselo por WhatsApp o correo:
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              readOnly
              value={state.inviteLink}
              className="min-w-0 flex-1 rounded border border-[#E5C58B] bg-white px-2.5 py-1 text-[11px] text-ink"
            />
            <button
              type="button"
              onClick={() => copiarEnlace(state.inviteLink!)}
              className="inline-flex items-center gap-1 rounded-md bg-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-90"
            >
              {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copiado ? "Copiado" : "Copiar link"}
            </button>
          </div>
        </div>
      )}

      <div>
        <BotonInvitar tieneClave={passwordInicial.trim().length > 0} />
      </div>
    </form>
  );
}
