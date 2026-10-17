"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { actualizarMiPerfilAction } from "./actions";

export function EditarPerfilForm({
  nombreCompleto,
  email,
  cargoDefault,
}: {
  nombreCompleto: string;
  email: string;
  cargoDefault: string;
}) {
  const [pending, startTransition] = useTransition();
  const [cargo, setCargo] = useState(cargoDefault);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setMensaje(null);
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const res = await actualizarMiPerfilAction(fd);
          if (res.ok) {
            setMensaje({ tipo: "ok", texto: "Datos actualizados correctamente." });
          } else {
            setMensaje({ tipo: "error", texto: res.error ?? "No se pudo actualizar." });
          }
        });
      }}
      className="space-y-4"
    >
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-[#1E293B]">
          Nombre completo
        </label>
        <input
          type="text"
          name="nombreCompleto"
          defaultValue={nombreCompleto}
          required
          className="w-full rounded-[10px] border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-[14px] text-[#0F172A] transition focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-[#1E293B]">
          Correo electrónico
        </label>
        <input
          type="email"
          name="email"
          defaultValue={email}
          required
          className="w-full rounded-[10px] border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-[14px] text-[#0F172A] transition focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-[#1E293B]">
          Cargo / Área
        </label>
        <input
          type="text"
          name="cargo"
          value={cargo}
          onChange={(e) => setCargo(e.target.value)}
          className="w-full rounded-[10px] border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-[14px] text-[#0F172A] transition focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15"
        />
      </div>

      {mensaje && (
        <div
          className={`flex items-center gap-2 rounded-[10px] px-3.5 py-2.5 text-[12.5px] font-medium ${
            mensaje.tipo === "ok"
              ? "bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]"
              : "bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]"
          }`}
        >
          {mensaje.tipo === "ok" && <CheckCircle2 className="h-4 w-4 shrink-0" />}
          <span>{mensaje.texto}</span>
        </div>
      )}

      <div className="pt-1">
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-[10px] bg-[#1D4ED8] px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_2px_8px_rgba(29,78,216,0.25)] transition hover:bg-[#1E40AF] disabled:opacity-60"
        >
          {pending ? "Guardando cambios..." : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}