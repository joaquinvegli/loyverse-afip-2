"use client";

import { useEffect, useState } from "react";
import VentaCard from "./components/VentaCard";
import { fetchVentas } from "./lib/api";

export default function HomePage() {
  const hoy = new Date();
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;

  const [desde, setDesde] = useState(hoyStr);
  const [hasta, setHasta] = useState(hoyStr);
  const [ventas, setVentas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function formatearFecha(fechaISO: string) {
    try {
      const fecha = new Date(fechaISO);
      const fechaArg = new Date(fecha.getTime() - 3 * 60 * 60 * 1000);
      const dia = fechaArg.getDate().toString().padStart(2, "0");
      const mes = (fechaArg.getMonth() + 1).toString().padStart(2, "0");
      const año = fechaArg.getFullYear();
      const horas = fechaArg.getHours().toString().padStart(2, "0");
      const minutos = fechaArg.getMinutes().toString().padStart(2, "0");
      return `${dia}/${mes}/${año} ${horas}:${minutos}`;
    } catch {
      return fechaISO;
    }
  }

  async function cargarVentas() {
    setCargando(true);
    setError(null);
    try {
      const data = await fetchVentas(desde, hasta);
      const ventasConFecha = data.map((v: any) => ({
        ...v,
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

  useEffect(() => {
    cargarVentas();
  }, []);

  const totalVentas = ventas.filter(v => v.receipt_type !== "REFUND").length;
  const facturadas = ventas.filter(v => v.already_invoiced).length;
  const pendientes = totalVentas - facturadas;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* HEADER */}
      <div className="bg-blue-900 text-white px-6 py-5 shadow-lg">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold tracking-tight">🧾 Top Fundas</h1>
          <p className="text-blue-200 text-sm mt-1">Sistema de facturación AFIP</p>
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
            <div className="bg-white rounded-2xl shadow p-4 text-center border border-gray-100">
              <p className="text-2xl font-bold text-orange-500">{pendientes}</p>
              <p className="text-xs text-gray-500 mt-1">Pendientes</p>
            </div>
          </div>
        )}

        {/* LISTA DE VENTAS */}
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
            />
          ))}
        </div>

      </div>
    </div>
  );
}