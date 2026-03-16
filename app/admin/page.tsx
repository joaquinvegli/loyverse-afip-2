"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid
} from "recharts";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

const COLORES = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#84cc16"];

function fmt(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtPeso(n: number) {
  return "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 0 });
}

interface Resumen {
  total_ventas: number;
  monto_total_real: number;
  monto_facturado: number;
  monto_no_facturado: number;
  monto_total_refunds: number;
  ticket_promedio: number;
  cant_facturadas: number;
  cant_no_facturadas: number;
  total_reembolsos: number;
}

interface AdminData {
  resumen: Resumen;
  por_hora: { hora: string; cantidad: number; monto: number }[];
  por_dia_semana: { dia: string; cantidad: number; monto: number }[];
  serie_diaria: { fecha: string; cantidad: number; monto: number }[];
  metodos_pago: { metodo: string; cantidad: number; monto: number }[];
  top_productos_cantidad: { nombre: string; cantidad: number; monto: number }[];
  top_productos_monto: { nombre: string; cantidad: number; monto: number }[];
  por_empleado: { empleado: string; cantidad: number; monto: number }[];
}

export default function AdminPage() {
  const router = useRouter();
  const [autenticado, setAutenticado] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [errorLogin, setErrorLogin] = useState(false);

  const hoy = new Date();
  const [desde, setDesde] = useState(fmt(hoy));
  const [hasta, setHasta] = useState(fmt(hoy));
  const [data, setData] = useState<AdminData | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabProductos, setTabProductos] = useState<"cantidad" | "monto">("cantidad");

  useEffect(() => {
    const expiry = localStorage.getItem("admin_session_expiry");
    if (expiry && Date.now() < Number(expiry)) {
      setAutenticado(true);
    }
  }, []);

  function handleLogin() {
    if (passwordInput === ADMIN_PASSWORD) {
      const expiry = Date.now() + 2 * 60 * 60 * 1000; // 2 horas
      localStorage.setItem("admin_session_expiry", String(expiry));
      setAutenticado(true);
      setErrorLogin(false);
    } else {
      setErrorLogin(true);
    }
  }

  function handleLogout() {
    localStorage.removeItem("admin_session_expiry");
    setAutenticado(false);
  }

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/resumen?desde=${desde}&hasta=${hasta}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError("Error cargando datos: " + e.message);
    } finally {
      setCargando(false);
    }
  }, [desde, hasta]);

  useEffect(() => {
    if (autenticado) cargarDatos();
  }, [autenticado]);

  // ── LOGIN ──
  if (!autenticado) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
          <div className="text-center mb-6">
            <p className="text-3xl mb-2">🔐</p>
            <h1 className="text-xl font-bold text-white">Panel de Administración</h1>
            <p className="text-gray-400 text-sm mt-1">Top Fundas</p>
          </div>
          <input
            type="password"
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="Contraseña de administrador"
            className="w-full px-4 py-3 rounded-xl bg-gray-700 text-white placeholder-gray-400 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
          />
          {errorLogin && (
            <p className="text-red-400 text-sm mb-3 text-center">Contraseña incorrecta</p>
          )}
          <button
            onClick={handleLogin}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition"
          >
            Ingresar
          </button>
          <button
            onClick={() => router.push("/")}
            className="w-full mt-3 py-2 text-gray-400 hover:text-white text-sm transition"
          >
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  const r = data?.resumen;

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* HEADER */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <h1 className="text-lg font-bold">Panel de Administración</h1>
              <p className="text-gray-400 text-xs">Top Fundas — vista privada</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/")} className="text-gray-400 hover:text-white text-xs transition">
              ← Facturador
            </button>
            <button onClick={handleLogout} className="text-gray-500 hover:text-white text-xs transition">
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* FILTRO DE FECHAS */}
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Desde</label>
              <input
                type="date"
                value={desde}
                onChange={e => setDesde(e.target.value)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Hasta</label>
              <input
                type="date"
                value={hasta}
                onChange={e => setHasta(e.target.value)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={cargarDatos}
              disabled={cargando}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition disabled:opacity-60"
            >
              {cargando ? "⏳ Cargando..." : "🔍 Consultar"}
            </button>
            {/* Atajos rápidos */}
            {[
              { label: "Hoy", fn: () => { const h = fmt(new Date()); setDesde(h); setHasta(h); } },
              { label: "Esta semana", fn: () => {
                const h = new Date();
                const lunes = new Date(h); lunes.setDate(h.getDate() - h.getDay() + 1);
                setDesde(fmt(lunes)); setHasta(fmt(h));
              }},
              { label: "Este mes", fn: () => {
                const h = new Date();
                setDesde(fmt(new Date(h.getFullYear(), h.getMonth(), 1)));
                setHasta(fmt(h));
              }},
            ].map(({ label, fn }) => (
              <button
                key={label}
                onClick={() => { fn(); }}
                className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-xl border border-gray-700 transition"
              >
                {label}
              </button>
            ))}
          </div>
          {error && <p className="mt-3 text-red-400 text-sm">❌ {error}</p>}
        </div>

        {data && r && (
          <>
            {/* TARJETAS RESUMEN */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total real", value: fmtPeso(r.monto_total_real), sub: `${r.total_ventas} ventas`, color: "text-white" },
                { label: "Facturado", value: fmtPeso(r.monto_facturado), sub: `${r.cant_facturadas} facturas`, color: "text-green-400" },
                { label: "Sin facturar", value: fmtPeso(r.monto_no_facturado), sub: `${r.cant_no_facturadas} ventas`, color: "text-yellow-400" },
                { label: "Ticket promedio", value: fmtPeso(r.ticket_promedio), sub: "por venta", color: "text-blue-400" },
                { label: "Reembolsos", value: fmtPeso(r.monto_total_refunds), sub: `${r.total_reembolsos} devoluciones`, color: "text-red-400" },
                { label: "% Facturado", value: r.monto_total_real > 0 ? Math.round((r.monto_facturado / r.monto_total_real) * 100) + "%" : "—", sub: "del total real", color: "text-purple-400" },
              ].map(({ label, value, sub, color }) => (
                <div key={label} className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-gray-400 mt-1">{label}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>

            {/* SERIE DIARIA — solo si hay más de 1 día */}
            {data.serie_diaria.length > 1 && (
              <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
                <h2 className="text-sm font-semibold text-gray-300 mb-4">📈 Ventas por día</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data.serie_diaria}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="fecha" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={v => "$" + (v / 1000).toFixed(0) + "k"} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
                      formatter={(v: any) => [fmtPeso(v), "Monto"]}
                    />
                    <Line type="monotone" dataKey="monto" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* VENTAS POR HORA */}
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <h2 className="text-sm font-semibold text-gray-300 mb-4">🕐 Ventas por hora del día</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.por_hora.filter(h => h.cantidad > 0 || true)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="hora" tick={{ fill: "#9ca3af", fontSize: 10 }} interval={1} />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
                    formatter={(v: any, name: string) => [name === "cantidad" ? v + " ventas" : fmtPeso(v), name === "cantidad" ? "Cantidad" : "Monto"]}
                  />
                  <Bar dataKey="cantidad" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* VENTAS POR DÍA DE SEMANA */}
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <h2 className="text-sm font-semibold text-gray-300 mb-4">📅 Ventas por día de la semana</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.por_dia_semana}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="dia" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={v => "$" + (v / 1000).toFixed(0) + "k"} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
                    formatter={(v: any, name: string) => [name === "cantidad" ? v + " ventas" : fmtPeso(v), name === "cantidad" ? "Cantidad" : "Monto"]}
                  />
                  <Bar dataKey="monto" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cantidad" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* MÉTODOS DE PAGO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
                <h2 className="text-sm font-semibold text-gray-300 mb-4">💳 Métodos de pago</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={data.metodos_pago}
                      dataKey="monto"
                      nameKey="metodo"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ metodo, percent }) => `${metodo} ${(percent * 100).toFixed(0)}%`}
                    >
                      {data.metodos_pago.map((_, i) => (
                        <Cell key={i} fill={COLORES[i % COLORES.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
                      formatter={(v: any) => [fmtPeso(v), "Monto"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* EMPLEADOS */}
              <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
                <h2 className="text-sm font-semibold text-gray-300 mb-4">👤 Ventas por empleado</h2>
                <div className="space-y-2">
                  {data.por_empleado.map((e, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORES[i % COLORES.length] }} />
                        <span className="text-sm text-gray-300 truncate">{e.empleado}</span>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-sm font-semibold text-white">{fmtPeso(e.monto)}</p>
                        <p className="text-xs text-gray-500">{e.cantidad} ventas</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* PRODUCTOS MÁS VENDIDOS */}
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-300">🏆 Productos más vendidos</h2>
                <div className="flex gap-1">
                  {(["cantidad", "monto"] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setTabProductos(tab)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        tabProductos === tab ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
                      }`}
                    >
                      {tab === "cantidad" ? "Por unidades" : "Por monto"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                {(tabProductos === "cantidad" ? data.top_productos_cantidad : data.top_productos_monto).map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-5 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm text-gray-300 truncate">{p.nombre}</span>
                        <span className="text-xs text-gray-400 shrink-0 ml-2">
                          {tabProductos === "cantidad" ? `${p.cantidad} uds · ${fmtPeso(p.monto)}` : `${fmtPeso(p.monto)} · ${p.cantidad} uds`}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.round(((tabProductos === "cantidad" ? p.cantidad : p.monto) / (tabProductos === "cantidad" ? data.top_productos_cantidad[0].cantidad : data.top_productos_monto[0].monto)) * 100)}%`,
                            backgroundColor: COLORES[i % COLORES.length],
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </>
        )}

        {!data && !cargando && (
          <div className="text-center py-16 text-gray-600">
            <p className="text-4xl mb-3">📊</p>
            <p>Seleccioná un período y presioná Consultar</p>
          </div>
        )}

      </div>
    </div>
  );
}