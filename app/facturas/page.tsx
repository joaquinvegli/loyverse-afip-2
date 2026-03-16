// v2
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

interface NotaCredito {
  refund_receipt_id: string;
  cbte_nro: number;
  pto_vta: number;
  cae: string;
  fecha: string;
  monto: number;
  items: { nombre: string; cantidad: number; precio_unitario: number }[];
}

interface Factura {
  receipt_id: string;
  cbte_nro: number;
  pto_vta: number;
  cae: string;
  fecha: string;
  vencimiento: string;
  cliente_nombre: string;
  cliente_dni: string | null;
  cliente_cuit: string | null;
  cliente_domicilio: string | null;
  email_cliente: string;
  total: number;
  drive_url: string;
  nota_credito: NotaCredito | null;
}

function dmy2ymd(dmy: string): string {
  const parts = dmy.split("/");
  if (parts.length !== 3) return "";
  const [d, m, y] = parts;
  return `${y}-${m}-${d}`;
}

function ymd2dmy(ymd: string): string {
  const parts = ymd.split("-");
  if (parts.length !== 3) return "";
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

function formatNroCbte(pto_vta: number, cbte_nro: number): string {
  return `${String(pto_vta).padStart(4, "0")}-${String(cbte_nro).padStart(8, "0")}`;
}

export default function FacturasPage() {
  const router = useRouter();

  useEffect(() => {
    const expiry = localStorage.getItem("session_expiry");
    if (!expiry || Date.now() >= Number(expiry)) {
      router.push("/");
    }
  }, []);

  const hoy = new Date();
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  const hoyStr = fmt(hoy);
  const primerDiaMes = fmt(new Date(hoy.getFullYear(), hoy.getMonth(), 1));

  const [desde, setDesde] = useState(primerDiaMes);
  const [hasta, setHasta] = useState(hoyStr);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [busquedaNro, setBusquedaNro] = useState("");

  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [expandida, setExpandida] = useState<string | null>(null);
  const [enviandoEmail, setEnviandoEmail] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState<{ [id: string]: string }>({});
  const [emailResultado, setEmailResultado] = useState<{ [id: string]: string }>({});

  async function cargarFacturas() {
    setCargando(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (desde) params.set("desde", desde);
      if (hasta) params.set("hasta", hasta);
      if (busquedaCliente.trim()) params.set("cliente", busquedaCliente.trim());
      if (busquedaNro.trim()) params.set("nro", busquedaNro.trim());

      const res = await fetch(`${BACKEND_URL}/api/facturas?${params.toString()}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setFacturas(data.facturas || []);
    } catch (e: any) {
      setError("Error cargando facturas: " + e.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarFacturas();
  }, []);

  async function reenviarEmail(factura: Factura) {
    const email = emailInput[factura.receipt_id] || factura.email_cliente;
    if (!email) return;
    setEnviandoEmail(factura.receipt_id);
    setEmailResultado(prev => ({ ...prev, [factura.receipt_id]: "" }));
    try {
      const res = await fetch(`${BACKEND_URL}/api/enviar_email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receipt_id: factura.receipt_id,
          email,
          pdf_url: factura.drive_url,
          cliente_nombre: factura.cliente_nombre,
          cbte_nro: factura.cbte_nro,
          pto_vta: factura.pto_vta,
          total: factura.total,
          cae: factura.cae,
          fecha: factura.fecha,
        }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setEmailResultado(prev => ({ ...prev, [factura.receipt_id]: "✅ Email enviado" }));
    } catch (e: any) {
      setEmailResultado(prev => ({ ...prev, [factura.receipt_id]: "❌ " + e.message }));
    } finally {
      setEnviandoEmail(null);
    }
  }

  const totalMonto = facturas.reduce((acc, f) => acc + f.total, 0);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* HEADER */}
      <div className="bg-blue-900 text-white px-6 py-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="https://raw.githubusercontent.com/joaquinvegli/loyverse-afip/refs/heads/main/static/logo_fixed.png"
              alt="Top Fundas"
              className="w-12 h-12 rounded-xl object-contain bg-white p-1"
            />
            <div>
              <h1 className="text-xl font-bold tracking-tight">Top Fundas</h1>
              <p className="text-blue-200 text-xs mt-0.5">Panel de facturas emitidas</p>
            </div>
          </div>
          <button
            onClick={() => router.push("/")}
            className="text-blue-300 hover:text-white text-xs font-semibold transition"
          >
            ← Volver a ventas
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">

        {/* FILTROS */}
        <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
          <h2 className="text-base font-semibold text-gray-700 mb-4">🔍 Filtros</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
              <input
                type="date"
                value={dmy2ymd(desde)}
                onChange={e => setDesde(ymd2dmy(e.target.value))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
              <input
                type="date"
                value={dmy2ymd(hasta)}
                onChange={e => setHasta(ymd2dmy(e.target.value))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Cliente / DNI / CUIT</label>
              <input
                type="text"
                value={busquedaCliente}
                onChange={e => setBusquedaCliente(e.target.value)}
                placeholder="Ej: Juan Perez"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nro. de factura</label>
              <input
                type="text"
                value={busquedaNro}
                onChange={e => setBusquedaNro(e.target.value)}
                placeholder="Ej: 273"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            onClick={cargarFacturas}
            disabled={cargando}
            className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-xl text-sm transition disabled:opacity-60"
          >
            {cargando ? "⏳ Buscando..." : "🔍 Buscar facturas"}
          </button>
          {error && (
            <p className="mt-3 text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">❌ {error}</p>
          )}
        </div>

        {/* RESUMEN */}
        {facturas.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl shadow p-4 text-center border border-gray-100">
              <p className="text-2xl font-bold text-blue-700">{facturas.length}</p>
              <p className="text-xs text-gray-500 mt-1">Facturas encontradas</p>
            </div>
            <div className="bg-white rounded-2xl shadow p-4 text-center border border-gray-100">
              <p className="text-2xl font-bold text-green-600">
                ${totalMonto.toLocaleString("es-AR", { minimumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">Monto total</p>
            </div>
          </div>
        )}

        {/* LISTA DE FACTURAS */}
        {facturas.length === 0 && !cargando && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">🧾</p>
            <p className="text-base">No se encontraron facturas</p>
          </div>
        )}

        <div className="space-y-3">
          {facturas.map(f => (
            <div
              key={f.receipt_id}
              className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden"
            >
              {/* FILA PRINCIPAL */}
              <button
                onClick={() => setExpandida(expandida === f.receipt_id ? null : f.receipt_id)}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-800">
                        Fact. C {formatNroCbte(f.pto_vta, f.cbte_nro)}
                      </span>
                      {f.nota_credito && (
                        <span className="bg-red-100 text-red-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                          NC emitida
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 mt-0.5">
                      {f.fecha} · {f.cliente_nombre}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-base font-bold text-gray-800">
                    ${f.total.toLocaleString("es-AR", { minimumFractionDigits: 0 })}
                  </span>
                  <span className="text-gray-400 text-sm">{expandida === f.receipt_id ? "▲" : "▼"}</span>
                </div>
              </button>

              {/* DETALLE EXPANDIDO */}
              {expandida === f.receipt_id && (
                <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50">

                  {/* Datos del comprobante */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">CAE</p>
                      <p className="font-mono text-gray-700 text-xs">{f.cae}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Vencimiento CAE</p>
                      <p className="text-gray-700 text-xs">
                        {f.vencimiento
                          ? `${f.vencimiento.slice(6, 8)}/${f.vencimiento.slice(4, 6)}/${f.vencimiento.slice(0, 4)}`
                          : "-"}
                      </p>
                    </div>
                    {(f.cliente_dni || f.cliente_cuit) && (
                      <div>
                        <p className="text-xs text-gray-400">{f.cliente_cuit ? "CUIT" : "DNI"}</p>
                        <p className="text-gray-700 text-xs">{f.cliente_cuit || f.cliente_dni}</p>
                      </div>
                    )}
                    {f.cliente_domicilio && (
                      <div>
                        <p className="text-xs text-gray-400">Domicilio</p>
                        <p className="text-gray-700 text-xs">{f.cliente_domicilio}</p>
                      </div>
                    )}
                  </div>

                  {/* Nota de crédito asociada */}
                  {f.nota_credito && (
                    <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                      <p className="text-xs font-semibold text-red-700 mb-1">
                        Nota de Crédito C {formatNroCbte(f.nota_credito.pto_vta, f.nota_credito.cbte_nro)}
                      </p>
                      <p className="text-xs text-red-600">
                        Fecha: {f.nota_credito.fecha} · Monto: ${(f.nota_credito.monto ?? 0).toLocaleString("es-AR")}
                      </p>
                      {f.nota_credito.items?.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {f.nota_credito.items.map((item, i) => (
                            <li key={i} className="text-xs text-red-500">
                              {item.cantidad}x {item.nombre} — ${item.precio_unitario.toLocaleString("es-AR")}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex flex-col gap-2">
                    {f.drive_url && (
                      <a
                        href={f.drive_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl text-center transition"
                      >
                        📄 Ver / Descargar PDF
                      </a>
                    )}

                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 font-medium">Reenviar por email:</p>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={emailInput[f.receipt_id] ?? f.email_cliente}
                          onChange={e =>
                            setEmailInput(prev => ({ ...prev, [f.receipt_id]: e.target.value }))
                          }
                          placeholder="email@ejemplo.com"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <button
                          onClick={() => reenviarEmail(f)}
                          disabled={
                            enviandoEmail === f.receipt_id ||
                            !(emailInput[f.receipt_id] ?? f.email_cliente)
                          }
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50"
                        >
                          {enviandoEmail === f.receipt_id ? "⏳" : "✉️ Enviar"}
                        </button>
                      </div>
                      {emailResultado[f.receipt_id] && (
                        <p className="text-xs text-gray-600">{emailResultado[f.receipt_id]}</p>
                      )}
                    </div>
                  </div>

                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}