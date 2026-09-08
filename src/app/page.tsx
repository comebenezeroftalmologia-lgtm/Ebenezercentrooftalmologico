import Link from "next/link";

export default function Home() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-navy">
        Tableros comerciales Ebenezer
      </h1>
      <p className="mb-6 text-slate-600">
        Elige un módulo en la barra lateral, o entra directo a{" "}
        <Link href="/leads" className="text-blue-electric underline">
          Generación de Clientes Potenciales
        </Link>
        .
      </p>
    </div>
  );
}
