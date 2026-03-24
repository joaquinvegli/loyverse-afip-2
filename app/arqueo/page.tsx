"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;
const APP_PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD;

type Turno = {
  turno_id: string;
  empleado: string;
  efectivo_inicial: number;
  fecha_apertura: string;
};

type Retiro = {
  retiro_id: string;
  monto: number;
  motivo: string;
  fecha: string;
};

type ResumenCierre = {
  efectivo_inicial: number;
  ingresos_efectivo: number;
  egresos_reembolsos: number;
  egresos_retiros: number;
  esperado: number;
  contado: number;
  diferencia: number;
};

type VentaCandidata = {
  receipt_id: string;
  receipt_number: string;
  total: number;
  total_no_efectivo: number;
  fecha: string;
  metodos: string[];
};

type Combinacion = {
  ventas: VentaCandidata[];
  total: number;
};

type CierreResult = {
  arqueo: any;
  combinaciones_sugeridas: Combinacion[];
  hay_diferencia: boolean;
};

// ── helpers
function fmt(n: number) {
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

function fechaArg(iso: string) {
  try {
    const d = new Date(iso);
    const a = new Date(d.getTime() - 3 * 60 * 60 * 1000);
    return `${a.getUTCDate().toString().padStart(2, "0")}/${(a.getUTCMonth() + 1).toString().padStart(2, "0")} ${a.getUTCHours().toString().padStart(2, "0")}:${a.getUTCMinutes().toString().padStart(2, "0")}`;
  } catch { return iso; }
}

function metodosLabel(metodos: string[]) {
  const map: Record<string, string> = {
    CARD: "Tarjeta", CASH: "Efectivo", TRANSFER: "Transferencia",
  };
  return metodos.map(m => map[m] || m).join(" + ");
}

export default function ArqueoPage() {
  const router = useRouter();

  // auth
  const [autenticado, setAutenticado] = useState(false);
  const [pass, setPass] = useState("");
  const [errPass, setErrPass] = useState(false);

  // estado general
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // turno
  const [turnoAbierto, setTurnoAbierto] = useState<Turno | null>(null);
  const [efectivoSugerido, setEfectivoSugerido] = useState<number | null>(null);

  // apertura
  const [nombreEmpleado, setNombreEmpleado] = useState("");
  const [efectivoInicial, setEfectivoInicial] = useState("");
  const [abriendo, setAbriendo] = useState(false);

  // cierre
  const [efectivoContado, setEfectivoContado] = useState("");
  const [notaCierre, setNotaCierre] = useState("");
  const [cerrando, setCerrando] = useState(false);
  const [cierreResult, setCierreResult] = useState<CierreResult | null>(null);

  // retiros del turno
  const [retiros, setRetiros] = useState<Retiro[]>([]);

  // tab
  const [tab, setTab] = useState<"arqueo" | "historial">("arqueo");
  const [historial, setHistorial] = useState<any[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // ── auth
  useEffect(() => {
    const expiry = localStorage.getItem("session_expiry");
    if (expiry && Date.now() < Number(expiry)) setAutenticado(true);
    else setCargando(false);
  }, []);

  function handleLogin() {
    if (pass === APP_PASSWORD) {
      const expiry = Date.now() + 60 * 60 * 1000;
      localStorage.setItem("session_expiry", String(expiry));
      setAutenticado(true);
    } else {
      setErrPass(true);
    }
  }

  // ── cargar estado inicial
  useEffect(() => {
    if (!autenticado) return;
    cargarEstado();
  }, [autenticado]);

  async function cargarEstado() {
    setCargando(true);
    setError(null);
    try {
      const r = await fetch(`${BACKEND}/api/arqueo/estado`);
      const data = await r.json();
      setTurnoAbierto(data.turno_abierto ?? null);
      setEfectivoSugerido(data.efectivo_inicial_sugerido ?? null);

      if (data.turno_abierto) {
        await cargarRetiros(data.turno_abierto.fecha_apertura);
      }
    } catch (e: any) {
      setError("Error conectando con el servidor: " + e.message);
    } finally {
      setCargando(false);
    }
  }

  async function cargarRetiros(desdeIso: string) {
    try {
      const r = await fetch(`${BACKEND}/api/retiros`);
      const data = await r.json();
      const filtrados = (data.retiros || []).filter(
        (r: Retiro) => r.fecha >= desdeIso
      );
      setRetiros(filtrados);
    } catch { /* silencioso */ }
  }

  // ── abrir turno
  async function abrirTurno() {
    if (!nombreEmpleado.trim()) { setError("Ingresá tu nombre."); return; }
    const monto = parseFloat(efectivoInicial.replace(",", "."));
    if (isNaN(monto) || monto < 0) { setError("Ingresá un efectivo inicial válido."); return; }

    setAbriendo(true);
    setError(null);
    try {
      const r = await fetch(`${BACKEND}/api/arqueo/abrir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empleado: nombreEmpleado.trim(), efectivo_inicial: monto }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "Error abriendo turno");
      setTurnoAbierto(data.turno);
      setRetiros([]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAbriendo(false);
    }
  }

  // ── cerrar turno
  async function cerrarTurno() {
    const monto = parseFloat(efectivoContado.replace(",", "."));
    if (isNaN(monto) || monto < 0) { setError("Ingresá el efectivo contado."); return; }

    setCerrando(true);
    setError(null);
    try {
      const r = await fetch(`${BACKEND}/api/arqueo/cerrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          efectivo_contado: monto,
          nota: notaCierre,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "Error cerrando turno");
      setCierreResult(data);
      setTurnoAbierto(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCerrando(false);
    }
  }

  // ── historial
  async function cargarHistorial() {
    setCargandoHistorial(true);
    try {
      const r = await fetch(`${BACKEND}/api/arqueo/historial`);
      const data = await r.json();
      setHistorial(data.arqueos || []);
    } catch { /* silencioso */ }
    finally { setCargandoHistorial(false); }
  }

  useEffect(() => {
    if (tab === "historial" && autenticado) cargarHistorial();
  }, [tab, autenticado]);

  // ── Login screen
  if (!autenticado) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow p-8 w-full max-w-sm border border-gray-100">
          <div className="text-center mb-6">
            <p className="text-3xl mb-2">💰</p>
            <h1 className="text-xl font-bold text-gray-800">Arqueo de Caja</h1>
            <p className="text-sm text-gray-500 mt-1">Top Fundas</p>
          </div>
          <input
            type="password"
            placeholder="Contraseña"
            value={pass}
            onChange={e => { setPass(e.target.value); setErrPass(false); }}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            className={`w-full px-4 py-3 border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 ${errPass ? "border-red-400" : "border-gray-300"}`}
          />
          {errPass && <p className="text-red-500 text-sm mt-2">Contraseña incorrecta</p>}
          <button
            onClick={handleLogin}
            className="mt-4 w-full py-3 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-xl"
          >
            Ingresar
          </button>
          <button onClick={() => router.push("/")} className="mt-3 w-full text-sm text-gray-400 hover:text-gray-600">
            ← Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const totalRetiros = retiros.reduce((a, r) => a + r.monto, 0);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* HEADER */}
      <div className="bg-blue-900 text-white px-6 py-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💰</span>
            <div>
              <h1 className="text-xl font-bold">Arqueo de Caja</h1>
              <p className="text-blue-200 text-xs">Top Fundas</p>
            </div>
          </div>
          <button onClick={() => router.push("/")} className="text-blue-200 hover:text-white text-xs font-semibold">
            ← Volver
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="max-w-2xl mx-auto px-4 pt-5">
        <div className="flex gap-2 mb-5">
          {(["arqueo", "historial"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${tab === t ? "bg-blue-700 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
            >
              {t === "arqueo" ? "🏪 Turno actual" : "📋 Historial"}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-10 space-y-4">

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
            ❌ {error}
          </div>
        )}

        {/* ══════════ TAB: ARQUEO ══════════ */}
        {tab === "arqueo" && (
          <>
            {cargando ? (
              <div className="flex items-center justify-center py-16 gap-3 text-blue-600">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">Cargando estado de caja...</span>
              </div>
            ) : cierreResult ? (
              // ── RESULTADO DEL CIERRE
              <ResultadoCierre
                result={cierreResult}
                onNuevoTurno={() => { setCierreResult(null); cargarEstado(); }}
              />
            ) : turnoAbierto ? (
              // ── TURNO ABIERTO: formulario de cierre
              <>
                {/* Info turno */}
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-sm font-semibold text-green-800">Turno abierto</p>
                  </div>
                  <p className="text-sm text-green-700">
                    <strong>{turnoAbierto.empleado}</strong> · desde {fechaArg(turnoAbierto.fecha_apertura)}
                  </p>
                  <p className="text-sm text-green-700 mt-0.5">
                    Efectivo inicial: <strong>{fmt(turnoAbierto.efectivo_inicial)}</strong>
                  </p>
                </div>

                {/* Retiros del turno */}
                {retiros.length > 0 && (
                  <div className="bg-white rounded-2xl shadow p-4 border border-gray-100">
                    <p className="text-sm font-semibold text-gray-700 mb-3">💸 Retiros del turno</p>
                    <div className="space-y-2">
                      {retiros.map(r => (
                        <div key={r.retiro_id} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">{r.motivo} <span className="text-gray-400">· {fechaArg(r.fecha)}</span></span>
                          <span className="font-semibold text-red-600">-{fmt(r.monto)}</span>
                        </div>
                      ))}
                      <div className="border-t pt-2 flex justify-between text-sm font-semibold">
                        <span className="text-gray-700">Total retiros</span>
                        <span className="text-red-600">-{fmt(totalRetiros)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cerrar turno */}
                <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
                  <h2 className="text-base font-semibold text-gray-700 mb-4">🔒 Cerrar turno</h2>

                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Efectivo contado en caja <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={efectivoContado}
                    onChange={e => setEfectivoContado(e.target.value)}
                    className="w-full px-3 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <label className="block text-sm font-medium text-gray-600 mt-4 mb-1">
                    Nota (opcional)
                  </label>
                  <textarea
                    placeholder="Observaciones del turno..."
                    value={notaCierre}
                    onChange={e => setNotaCierre(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />

                  <button
                    onClick={cerrarTurno}
                    disabled={cerrando || !efectivoContado}
                    className="mt-4 w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl text-base disabled:opacity-60 transition"
                  >
                    {cerrando ? "⏳ Calculando..." : "🔒 Cerrar caja"}
                  </button>
                </div>
              </>
            ) : (
              // ── SIN TURNO: formulario de apertura
              <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
                <h2 className="text-base font-semibold text-gray-700 mb-4">🔓 Abrir turno</h2>

                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Tu nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Nombre del empleado"
                  value={nombreEmpleado}
                  onChange={e => setNombreEmpleado(e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <label className="block text-sm font-medium text-gray-600 mt-4 mb-1">
                  Efectivo inicial en caja <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder={efectivoSugerido !== null ? String(efectivoSugerido) : "0.00"}
                  value={efectivoInicial}
                  onChange={e => setEfectivoInicial(e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {efectivoSugerido !== null && !efectivoInicial && (
                  <p className="text-xs text-gray-400 mt-1">
                    💡 Último cierre: {fmt(efectivoSugerido)} — podés usar ese valor o cambiarlo
                  </p>
                )}

                <button
                  onClick={abrirTurno}
                  disabled={abriendo}
                  className="mt-5 w-full py-3 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-xl text-base disabled:opacity-60 transition"
                >
                  {abriendo ? "⏳ Abriendo..." : "🔓 Abrir caja"}
                </button>
              </div>
            )}
          </>
        )}

        {/* ══════════ TAB: HISTORIAL ══════════ */}
        {tab === "historial" && (
          <>
            {cargandoHistorial ? (
              <div className="flex items-center justify-center py-16 gap-3 text-blue-600">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Cargando historial...</span>
              </div>
            ) : historial.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-4xl mb-3">📭</p>
                <p>No hay arqueos registrados</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historial.map((a, i) => (
                  <ArqueoCard key={i} arqueo={a} />
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}

// ── Componente: resultado del cierre
function ResultadoCierre({ result, onNuevoTurno }: { result: CierreResult; onNuevoTurno: () => void }) {
  const { arqueo, combinaciones_sugeridas, hay_diferencia } = result;
  const resumen: ResumenCierre = arqueo.resumen;
  const dif = resumen.diferencia;
  const difAbs = Math.abs(dif);
  const esSobrante = dif > 0;

  return (
    <div className="space-y-4">

      {/* Estado general */}
      <div className={`rounded-2xl p-5 border ${hay_diferencia ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">{hay_diferencia ? "⚠️" : "✅"}</span>
          <p className={`font-bold text-lg ${hay_diferencia ? "text-red-700" : "text-green-700"}`}>
            {hay_diferencia
              ? `Diferencia de ${fmt(difAbs)} (${esSobrante ? "SOBRANTE" : "FALTANTE"})`
              : "Caja perfecta"}
          </p>
        </div>
        <p className={`text-sm ${hay_diferencia ? "text-red-600" : "text-green-600"}`}>
          Turno de <strong>{arqueo.empleado}</strong> cerrado el {fechaArg(arqueo.fecha_cierre)}
        </p>
        {hay_diferencia && (
          <p className="text-xs text-red-500 mt-1">Se envió una notificación al propietario.</p>
        )}
      </div>

      {/* Detalle numérico */}
      <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
        <p className="text-sm font-semibold text-gray-700 mb-3">📊 Detalle del turno</p>
        <div className="space-y-2 text-sm">
          <FilaResumen label="Efectivo inicial" valor={resumen.efectivo_inicial} />
          <FilaResumen label="+ Ventas en efectivo" valor={resumen.ingresos_efectivo} color="text-green-600" />
          <FilaResumen label="- Reembolsos en efectivo" valor={-resumen.egresos_reembolsos} color="text-red-500" />
          <FilaResumen label="- Retiros" valor={-resumen.egresos_retiros} color="text-red-500" />
          <div className="border-t my-2" />
          <FilaResumen label="Esperado en caja" valor={resumen.esperado} bold />
          <FilaResumen label="Contado por empleado" valor={resumen.contado} bold />
          <div className="border-t my-2" />
          <FilaResumen
            label={`Diferencia (${esSobrante ? "SOBRANTE" : "FALTANTE"})`}
            valor={dif}
            bold
            color={hay_diferencia ? (esSobrante ? "text-orange-500" : "text-red-600") : "text-green-600"}
          />
        </div>
      </div>

      {/* Comprobantes candidatos */}
      {hay_diferencia && combinaciones_sugeridas.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5">
          <p className="text-sm font-semibold text-yellow-800 mb-1">
            🔍 Posibles causas de la diferencia
          </p>
          <p className="text-xs text-yellow-700 mb-3">
            Estas ventas registradas como {esSobrante ? "no-efectivo" : "no-efectivo"} podrían explicar la diferencia.
            Revisalas en Loyverse y corregilas si corresponde.
          </p>
          <div className="space-y-3">
            {combinaciones_sugeridas.map((combo, i) => (
              <div key={i} className="bg-white rounded-xl p-3 border border-yellow-100">
                <p className="text-xs font-semibold text-gray-500 mb-2">
                  Opción {i + 1} — total {fmt(combo.total)}
                </p>
                {combo.ventas.map((v, j) => (
                  <div key={j} className="flex items-center justify-between text-xs text-gray-600 py-1 border-b last:border-0">
                    <span>#{v.receipt_number} · {metodosLabel(v.metodos)} · {fechaArg(v.fecha)}</span>
                    <span className="font-semibold">{fmt(v.total_no_efectivo)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onNuevoTurno}
        className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-xl"
      >
        ✅ Listo — Abrir nuevo turno
      </button>
    </div>
  );
}

function FilaResumen({ label, valor, bold, color }: { label: string; valor: number; bold?: boolean; color?: string }) {
  return (
    <div className="flex justify-between">
      <span className={`text-gray-600 ${bold ? "font-semibold" : ""}`}>{label}</span>
      <span className={`${bold ? "font-bold" : "font-medium"} ${color || "text-gray-800"}`}>
        {valor >= 0 ? fmt(valor) : `-${fmt(Math.abs(valor))}`}
      </span>
    </div>
  );
}

function fechaArg(iso: string) {
  try {
    const d = new Date(iso);
    const a = new Date(d.getTime() - 3 * 60 * 60 * 1000);
    return `${a.getUTCDate().toString().padStart(2, "0")}/${(a.getUTCMonth() + 1).toString().padStart(2, "0")} ${a.getUTCHours().toString().padStart(2, "0")}:${a.getUTCMinutes().toString().padStart(2, "0")}`;
  } catch { return iso; }
}

function ArqueoCard({ arqueo }: { arqueo: any }) {
  const [expandido, setExpandido] = useState(false);
  const dif = arqueo.diferencia ?? 0;
  const hayDif = Math.abs(dif) > 0.5;

  return (
    <div
      className={`bg-white rounded-2xl shadow border cursor-pointer ${hayDif ? "border-red-200" : "border-gray-100"}`}
      onClick={() => setExpandido(!expandido)}
    >
      <div className="p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800">{arqueo.empleado}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {fechaArg(arqueo.fecha_apertura)} → {fechaArg(arqueo.fecha_cierre)}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-bold ${hayDif ? (dif > 0 ? "text-orange-500" : "text-red-600") : "text-green-600"}`}>
            {hayDif ? `${dif > 0 ? "+" : ""}${fmt(dif)}` : "✅ OK"}
          </p>
          <p className="text-xs text-gray-400">contado: {fmt(arqueo.efectivo_contado)}</p>
        </div>
      </div>
      {expandido && (
        <div className="border-t px-4 py-3 space-y-1 text-sm text-gray-600">
          <FilaResumen label="Efectivo inicial" valor={arqueo.efectivo_inicial} />
          <FilaResumen label="Ingresos efectivo" valor={arqueo.resumen?.ingresos_efectivo ?? 0} color="text-green-600" />
          <FilaResumen label="Reembolsos" valor={-(arqueo.resumen?.egresos_reembolsos ?? 0)} color="text-red-500" />
          <FilaResumen label="Retiros" valor={-(arqueo.resumen?.egresos_retiros ?? 0)} color="text-red-500" />
          <FilaResumen label="Esperado" valor={arqueo.resumen?.esperado ?? 0} bold />
          <FilaResumen label="Contado" valor={arqueo.efectivo_contado} bold />
          {arqueo.nota && <p className="text-xs text-gray-400 mt-2 italic">"{arqueo.nota}"</p>}
        </div>
      )}
    </div>
  );
}