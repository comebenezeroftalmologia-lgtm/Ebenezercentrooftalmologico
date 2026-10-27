"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { invitarUsuarioAction } from "@/lib/procesos/actions";
import { MODULOS, modulosPorGrupo, type Modulo } from "@/lib/modulos";
import { ROLES_PLATAFORMA, type RolPlataforma } from "@/lib/procesos/types";

function BotonInvitar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 ease-eb-out hover:bg-navy-90 disabled:opacity-60"
    >
      {pending ? "Invitando…" : "Invitar usuario"}
    </button>
  );
}

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
  const [state, formAction] = useFormState(invitarUsuarioAction, { error: null });
  const [rol, setRol] = useState<RolPlataforma>(roles.includes("usuario_basico") ? "usuario_basico" : roles[0]);
  const grupos = modulosPorGrupo(MODULOS.filter((m) => modulosDisponibles.includes(m.slug)));
  const rolesOpciones = ROLES_PLATAFORMA.filter((r) => roles.includes(r.valor));
  const esAcceso = rol === "desarrollador" || rol === "administrador";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="eb-label mb-1 block text-[11px] text-ink-3">Nombre completo</label>
          <input
            name="nombreCompleto"
            type="text"
            required
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
          <p className="mt-1 text-[11px] text-ink-3">{rolesOpciones.find((r) => r.valor === rol)?.descripcion}</p>
        </div>
        {rol === "usuario_basico" && !yoEsLider && (
          <div>
            <label className="eb-label mb-1 block text-[11px] text-ink-3">Líder (autoriza sus eliminaciones)</label>
            <select
              name="liderId"
              required
              defaultValue=""
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
            >
              <option value="" disabled>
                Selecciona un líder…
              </option>
              {lideres.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre}
                </option>
              ))}
            </select>
            {lideres.length === 0 && (
              <p className="mt-1 text-[11px] text-[#B3261E]">Aún no hay líderes. Crea primero un usuario con rol Líder.</p>
            )}
          </div>
        )}
      </div>

      {esAcceso ? (
        <p className="text-xs text-ink-3">Este rol ve todos los módulos automáticamente.</p>
      ) : (
      <div className="flex flex-col gap-4">
        <p className="eb-label -mb-1 block text-[11px] text-ink-3">Acceso a módulos</p>
        {(Object.keys(grupos) as (keyof typeof grupos)[]).map((grupo) => (
          <div key={grupo}>
            <p className="mb-1.5 text-xs font-semibold text-navy">{grupo}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {grupos[grupo].map((m) => (
                <label key={m.slug} className="flex items-center gap-2 text-sm text-ink-2">
                  <input
                    name="modulos"
                    type="checkbox"
                    value={m.slug}
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
      {state.ok && (
        <p className="rounded-lg bg-green-10 px-3 py-2 text-xs text-green">
          Invitación enviada. La persona recibirá un correo para crear su contraseña.
        </p>
      )}

      <div>
        <BotonInvitar />
      </div>
    </form>
  );
}
