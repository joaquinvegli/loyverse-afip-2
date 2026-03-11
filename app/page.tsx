"use client";

import { useEffect, useState, useRef } from "react";
import VentaCard from "./components/VentaCard";
import { fetchVentas, fetchCliente, facturarVenta } from "./lib/api";

export default function HomePage() {
  const hoy = new Date();
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;

  const [desde, setDesde] = useState(hoyStr);
  const [hasta, setHasta] = useState(hoyStr);
  const [ventas, setVentas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarInfoPendientes, setMostrarInfoPendientes] = useState(false);

  const [seleccionadas, setSeleccionadas] = useState<string[]>([]);
  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [facturandoMasivo, setFacturandoMasivo] = useState(false);
  const [progresoMasivo, setProgresoMasivo] = useState<string[]>([]);
  const progresoRef = useRef<string[]>([]);

  function formatearFecha(fechaISO: string) {
    try {
      const fecha = new Date(fechaISO);
      const fechaArg = new Date(fecha.getTime() + 3 * 60 * 60 * 1000);
      const dia = fechaArg.getUTCDate().toString().padStart(2, "0");
      const mes = (fechaArg.getUTCMonth() + 1).toString().padStart(2, "0");
      const año = fechaArg.getUTCFullYear();
      const horas = fechaArg.getUTCHours().toString().padStart(2, "0");
      const minutos = fechaArg.getUTCMinutes().toString().padStart(2, "0");
      return `${dia}/${mes}/${año} ${horas}:${minutos}`;
    } catch {
      return fechaISO;
    }
  }

  async function cargarVentas() {
    setCargando(true);
    setError(null);
    setSeleccionadas([]);
    try {
      const data = await fetchVentas(desde, hasta);
      const ventasConFecha = data.map((v: any) => ({
        ...v,
        fechaOriginal: v.fecha,
        fecha: formatearFecha(v.fecha),
        already_invoiced: v.already_invoiced ?? false,
      }));
      setVentas(ventasConFecha);
    } catch (e: any) {
      setError("Error cargando ventas: " + e.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargarVentas(); }, []);

  const ventasSolo = ventas.filter(v => v.receipt_type !== "REFUND");
  const totalVentas = ventasSolo.length;
  const facturadas = ventasSolo.filter(v => v.already_invoiced).length;
  const pendientes = ventasSolo.filter(v => {
    if (v.already_invoiced) return false;
    const pagos = Array.isArray(v.pagos) ? v.pagos : [];
    const soloEfectivo = pagos.length > 0 && pagos.every((p: any) => p.tipo === "CASH");
    return !soloEfectivo;
  }).length;

  function toggleSeleccion(receipt_id: string) {
    setSeleccionadas(prev =>
      prev.includes(receipt_id) ? prev.filter(id => id !== receipt_id) : [...prev, receipt_id]
    );
  }

  function seleccionarTodosPendientes() {
    const ids = ventasSolo
      .filter(v => !v.already_invoiced && v.receipt_type !== "REFUND")
      .map(v => v.receipt_id);
    setSeleccionadas(ids);
  }

  async function facturarMasivo() {
    if (seleccionadas.length === 0) return;
    setFacturandoMasivo(true);
    progresoRef.current = [];
    setProgresoMasivo([]);

    const ids = [...seleccionadas];
    const facturadas_ok: string[] = [];

    for (const receipt_id of ids) {
      const venta = ventas.find(v => v.receipt_id === receipt_id);
      if (!venta) continue;

      try {
        const nuevoProg = [...progresoRef.current, `⏳ Facturando ${receipt_id}...`];
        progresoRef.current = nuevoProg;
        setProgresoMasivo([...nuevoProg]);

        const clienteData = {
          id: venta.cliente_id ?? null,
          name: venta.cliente_nombre || "Consumidor Final",
          email: venta.cliente_email || "",
          dni: venta.cliente_dni ?? null,
        };

        await facturarVenta({
          receipt_id,
          cliente: clienteData,
          items: venta.items_facturables ?? venta.items,
          total: venta.max_facturable ?? venta.total,
        });

        facturadas_ok.push(receipt_id);

        const progActualizado = progresoRef.current.map(p =>
          p.includes(receipt_id) ? `✅ ${receipt_id} facturada` : p
        );
        progresoRef.current = progActualizado;
        setProgresoMasivo([...progActualizado]);

      } catch (e: any) {
        const progActualizado = progresoRef.current.map(p =>
          p.includes(receipt_id) ? `❌ ${receipt_id}: ${e.message}` : p
        );
        progresoRef.current = progActualizado;
        setProgresoMasivo([...progActualizado]);
      }
    }

    if (facturadas_ok.length > 0) {
      setVentas(prev => prev.map(v =>
        facturadas_ok.includes(v.receipt_id)
          ? { ...v, already_invoiced: true }
          : v
      ));
    }

    setFacturandoMasivo(false);
    setSeleccionadas([]);
    setModoSeleccion(false);
    await cargarVentas();
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* HEADER */}
      <div className="bg-blue-900 text-white px-6 py-4 shadow-lg">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <img
            src="https://raw.githubusercontent.com/joaquinvegli/loyverse-afip/refs/heads/main/static/logo_fixed.png"
            alt="Top Fundas"
            className="w-12 h-12 rounded-xl object-contain bg-white p-1"
          />
          <div>
            <h1 className="text-xl font-bold tracking-tight">Top Fundas</h1>
            <p className="text-blue-200 text-xs mt-0.5">Sistema de facturación AFIP</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* FILTRO DE FECHAS */}
        <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
          <h2 className="text-base font-semibold text-gray-700 mb-4">📅 Seleccionar período</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Desde</label>
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Hasta</label>
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            onClick={cargarVentas}
            disabled={cargando}
            className="mt-4 w-full py-3 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-semibold rounded-xl text-base transition disabled:opacity-60"
          >
            {cargando ? "⏳ Cargando..." : "🔍 Ver ventas"}
          </button>
          {error && (
            <p className="mt-3 text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">❌ {error}</p>
          )}
        </div>

        {/* RESUMEN */}
        {ventas.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl shadow p-4 text-center border border-gray-100">
              <p className="text-2xl font-bold text-blue-700">{totalVentas}</p>
              <p className="text-xs text-gray-500 mt-1">Total ventas</p>
            </div>
            <div className="bg-white rounded-2xl shadow p-4 text-center border border-gray-100">
              <p className="text-2xl font-bold text-green-600">{facturadas}</p>
              <p className="text-xs text-gray-500 mt-1">Facturadas</p>
            </div>
            <div className="bg-white rounded-2xl shadow p-4 text-center border border-gray-100 relative">
              <p className="text-2xl font-bold text-orange-500">{pendientes}</p>
              <p className="text-xs text-gray-500 mt-1">Pendientes</p>
              <button
                onClick={() => setMostrarInfoPendientes(!mostrarInfoPendientes)}
                className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gray-100 text-gray-400 text-xs flex items-center justify-center hover:bg-gray-200"
              >
                ?
              </button>
              {mostrarInfoPendientes && (
                <div className="absolute top-10 right-0 z-10 bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-left text-xs text-gray-600 w-52">
                  Solo cuenta ventas <strong>no facturadas</strong> que <strong>no son exclusivamente en efectivo</strong>. Las ventas en efectivo no requieren factura obligatoria.
                  <button
                    onClick={() => setMostrarInfoPendientes(false)}
                    className="mt-2 text-blue-600 font-semibold block"
                  >
                    Cerrar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* FACTURACIÓN MASIVA */}
        {ventas.length > 0 && (
          <div className="bg-white rounded-2xl shadow p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">⚡ Facturación masiva</p>
              <button
                onClick={() => { setModoSeleccion(!modoSeleccion); setSeleccionadas([]); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  modoSeleccion ? "bg-gray-200 text-gray-700" : "bg-blue-600 text-white"
                }`}
              >
                {modoSeleccion ? "Cancelar" : "Seleccionar ventas"}
              </button>
            </div>

            {modoSeleccion && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={seleccionarTodosPendientes}
                    className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold"
                  >
                    Seleccionar todos los pendientes
                  </button>
                  <button
                    onClick={() => setSeleccionadas([])}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-xl text-xs"
                  >
                    Limpiar
                  </button>
                </div>

                {seleccionadas.length > 0 && (
                  <button
                    onClick={facturarMasivo}
                    disabled={facturandoMasivo}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-sm disabled:opacity-60"
                  >
                    {facturandoMasivo
                      ? `⏳ Facturando... (${progresoMasivo.filter(p => p.startsWith("✅")).length}/${seleccionadas.length})`
                      : `✅ Facturar ${seleccionadas.length} venta${seleccionadas.length > 1 ? "s" : ""}`
                    }
                  </button>
                )}

                {progresoMasivo.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-3 space-y-1 max-h-40 overflow-y-auto">
                    {progresoMasivo.map((msg, i) => (
                      <p key={i} className="text-xs text-gray-600">{msg}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* LISTA */}
        {ventas.length === 0 && !cargando && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-base">No hay ventas para este período</p>
          </div>
        )}

        <div className="space-y-3">
          {ventas.map((v, i) => (
            <VentaCard
              key={i}
              venta={v}
              onFacturada={() => cargarVentas()}
              modoSeleccion={modoSeleccion}
              seleccionada={seleccionadas.includes(v.receipt_id)}
              onToggleSeleccion={() => toggleSeleccion(v.receipt_id)}
            />
          ))}
        </div>

      </div>
    </div>
  );
}