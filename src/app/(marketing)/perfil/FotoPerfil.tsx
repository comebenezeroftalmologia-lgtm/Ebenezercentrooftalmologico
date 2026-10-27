"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Trash2 } from "lucide-react";
import { quitarAvatarAction, subirAvatarAction } from "./actions";

const LADO = 256;

/** Recorta al centro en cuadrado y comprime a JPEG para que pese pocos KB. */
async function prepararImagen(archivo: File): Promise<Blob> {
  const bmp = await createImageBitmap(archivo);
  const lado = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = LADO;
  canvas.height = LADO;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Tu navegador no pudo procesar la imagen.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, LADO, LADO);
  ctx.drawImage(bmp, (bmp.width - lado) / 2, (bmp.height - lado) / 2, lado, lado, 0, 0, LADO, LADO);
  return await new Promise<Blob>((ok, fail) =>
    canvas.toBlob((b) => (b ? ok(b) : fail(new Error("No se pudo comprimir la imagen."))), "image/jpeg", 0.85)
  );
}

export function FotoPerfil({
  userId,
  iniciales,
  versionInicial,
}: {
  userId: string;
  iniciales: string;
  versionInicial: string | null;
}) {
  const [version, setVersion] = useState<string | null>(versionInicial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  const avisarRiel = () => window.dispatchEvent(new Event("eb:notificaciones"));

  const elegir = (archivo: File | undefined) => {
    if (!archivo) return;
    setError(null);
    if (!archivo.type.startsWith("image/")) {
      setError("Elige un archivo de imagen (JPG, PNG o WebP).");
      return;
    }
    start(async () => {
      try {
        const blob = await prepararImagen(archivo);
        const fd = new FormData();
        fd.append("foto", new File([blob], "foto.jpg", { type: "image/jpeg" }));
        const res = await subirAvatarAction(fd);
        if (!res.ok) return setError(res.error ?? "No se pudo subir la foto.");
        setVersion(String(Date.now()));
        avisarRiel();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo procesar la imagen.");
      }
    });
  };

  const quitar = () => {
    setError(null);
    start(async () => {
      const res = await quitarAvatarAction();
      if (!res.ok) return setError(res.error ?? "No se pudo quitar la foto.");
      setVersion(null);
      avisarRiel();
    });
  };

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={pending}
        title="Cambiar foto"
        className="group relative h-[88px] w-[88px] overflow-hidden rounded-full bg-[#E2E8F0] shadow-inner ring-2 ring-white transition disabled:opacity-60"
      >
        {version ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/avatar/${userId}?v=${version}`} alt="Foto de perfil" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center font-display text-[28px] font-bold text-[#0F172A]">
            {iniciales}
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-[#081A3A]/55 opacity-0 transition group-hover:opacity-100">
          <Camera className="h-6 w-6 text-white" strokeWidth={1.75} />
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          elegir(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div className="mt-2 flex items-center gap-3 text-[12.5px]">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={pending}
          className="font-semibold text-[#1D4ED8] hover:underline disabled:opacity-60"
        >
          {pending ? "Guardando..." : version ? "Cambiar foto" : "Subir foto"}
        </button>
        {version && !pending && (
          <button type="button" onClick={quitar} className="flex items-center gap-1 text-[#64748B] hover:text-[#DC2626]">
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} /> Quitar
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-center text-[12px] text-[#DC2626]">{error}</p>}
    </div>
  );
}
