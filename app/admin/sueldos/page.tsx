"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

const EMPLOYEES = [
  { id: "4c802b1a-6219-48b6-b7bc-8b9f674387cc", name: "Amparo" },
  { id: "56bdd969-f76a-4d1b-9119-367c1031965a", name: "Miranda" },
  { id: "ba7a64a1-9555-4344-b614-d420d1401340", name: "Agustina" },
  { id: "99da6a5f-3a40-4691-9077-501a5205a891", name: "Propietario" },
];

type Shift = {
  shift_id: string;
  employee_id: string;
  employee_name: string;
  original_employee_name: string;
  date: string;
  opened_time: string;
  closed_time: string;
  hours: number;
  hourly_rate: number;
  pay: number;
  override?: { employee_id: string; employee_name: string; note?: string };
};

type Summary = {
  employee_id: string;
  employee_name: string;
  shifts: number;
  hours: number;
  hourly_rate: number;
  pay: number;
};

type SalaryData = {
  turnos: Shift[];
  resumen: Summary[];
  hourly_rates: Record<string, number>;
};

function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtMoney(n: number) {
  return "$" + Math.round(n || 0).toLocaleString("es-AR");
}

function monthBounds(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  return { first, last, desde: fmtDate(first), hasta: fmtDate(last) };
}

function daysForMonth(monthValue: string) {
  const { first, last } = monthBounds(monthValue);
  const days: string[] = [];
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    days.push(fmtDate(d));
  }
  return days;
}

export default function SueldosPage() {
  const router = useRouter();
  const [autenticado, setAutenticado] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [errorLogin, setErrorLogin] = useState(false);
  const today = new Date();
  const [month, setMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`);
  const [data, setData] = useState<SalaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rates, setRates] = useState<Record<string, string>>({});

  useEffect(() => {
    const expiry = localStorage.getItem("admin_session_expiry");
    if (expiry && Date.now() < Number(expiry)) setAutenticado(true);
  }, []);

  const cargar = useCallback(async () => {
    const { desde, hasta } = monthBounds(month);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/sueldos?desde=${desde}&hasta=${hasta}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "No se pudieron cargar sueldos");
      setData(json);
      const nextRates: Record<string, string> = {};
      EMPLOYEES.forEach((e) => {
        nextRates[e.id] = String(json.hourly_rates?.[e.id] ?? "");
      });
      setRates(nextRates);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    if (autenticado) cargar();
  }, [autenticado, cargar]);

  function handleLogin() {
    if (passwordInput === ADMIN_PASSWORD) {
      localStorage.setItem("admin_session_expiry", String(Date.now() + 2 * 60 * 60 * 1000));
      setAutenticado(true);
      setErrorLogin(false);
    } else {
      setErrorLogin(true);
    }
  }

  async function saveRate(employeeId: string) {
    const hourly_rate = Number(String(rates[employeeId] || "0").replace(",", "."));
    if (Number.isNaN(hourly_rate) || hourly_rate < 0) return;
    setSaving(`rate-${employeeId}`);
    try {
      const res = await fetch("/api/admin/sueldos/salario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: employeeId, hourly_rate }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "No se pudo guardar salario");
      await cargar();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(null);
    }
  }

  async function changeShiftEmployee(shift: Shift, employeeId: string) {
    const employee = EMPLOYEES.find((e) => e.id === employeeId);
    if (!employee) return;
    setSaving(shift.shift_id);
    try {
      const res = await fetch("/api/admin/sueldos/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shift_id: shift.shift_id, employee_id: employee.id, employee_name: employee.name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "No se pudo corregir turno");
      await cargar();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(null);
    }
  }

  const shiftsByDay = useMemo(() => {
    const grouped: Record<string, Shift[]> = {};
    (data?.turnos || []).forEach((shift) => {
      grouped[shift.date] = [...(grouped[shift.date] || []), shift];
    });
    return grouped;
  }, [data]);

  const monthDays = useMemo(() => daysForMonth(month), [month]);
  const totalPay = data?.resumen.reduce((sum, item) => sum + item.pay, 0) || 0;
  const totalHours = data?.resumen.reduce((sum, item) => sum + item.hours, 0) || 0;

  if (!autenticado) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
          <h1 className="text-xl font-bold text-white text-center mb-1">Sueldos</h1>
          <p className="text-gray-400 text-sm text-center mb-6">Vista privada</p>
          <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()} placeholder="Contraseña de administrador"
            className="w-full px-4 py-3 rounded-xl bg-gray-700 text-white placeholder-gray-400 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3" />
          {errorLogin && <p className="text-red-400 text-sm mb-3 text-center">Contraseña incorrecta</p>}
          <button onClick={handleLogin} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition">Ingresar</button>
          <button onClick={() => router.push("/admin")} className="w-full mt-3 py-2 text-gray-400 hover:text-white text-sm transition">Volver</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold">Sueldos</h1>
            <p className="text-gray-400 text-xs">Turnos cerrados de Loyverse con correcciones manuales</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/admin")} className="text-gray-400 hover:text-white text-xs transition">Panel admin</button>
            <button onClick={() => router.push("/")} className="text-gray-500 hover:text-white text-xs transition">Facturador</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Mes</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={cargar} disabled={loading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-semibold disabled:opacity-60">
            {loading ? "Cargando..." : "Actualizar"}
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 items-start">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {monthDays.map((day) => {
                const shifts = shiftsByDay[day] || [];
                const d = new Date(`${day}T12:00:00`);
                return (
                  <div key={day} className="bg-gray-950 border border-gray-800 rounded-xl p-3 min-h-[132px]">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-gray-200">{d.toLocaleDateString("es-AR", { weekday: "short", day: "2-digit" })}</p>
                      <span className="text-xs text-gray-600">{shifts.reduce((s, t) => s + (t.hours || 0), 0).toFixed(1)} h</span>
                    </div>
                    {shifts.length === 0 ? (
                      <p className="text-xs text-gray-700 py-5 text-center">Sin turnos</p>
                    ) : (
                      <div className="space-y-2">
                        {shifts.map((shift) => (
                          <div key={shift.shift_id} className="bg-gray-900 border border-gray-800 rounded-lg p-2">
                            <div className="flex justify-between gap-2 text-xs mb-2">
                              <span className="text-gray-300">{shift.opened_time} - {shift.closed_time}</span>
                              <span className="text-blue-300 font-semibold">{shift.hours.toFixed(2)} h</span>
                            </div>
                            <select value={shift.employee_id} disabled={saving === shift.shift_id}
                              onChange={(e) => changeShiftEmployee(shift, e.target.value)}
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                              {EMPLOYEES.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                            {shift.override && <p className="text-[11px] text-amber-400 mt-1">Corregido manualmente</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <p className="text-xs text-gray-400 mb-1">Total del mes</p>
              <p className="text-2xl font-bold">{fmtMoney(totalPay)}</p>
              <p className="text-xs text-gray-500 mt-1">{totalHours.toFixed(2)} horas acumuladas</p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-gray-300 mb-3">Resumen por empleado</h2>
              <div className="space-y-3">
                {EMPLOYEES.map((employee) => {
                  const item = data?.resumen.find((r) => r.employee_id === employee.id);
                  return (
                    <div key={employee.id} className="border border-gray-800 rounded-xl p-3 bg-gray-950">
                      <div className="flex justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{employee.name}</p>
                          <p className="text-xs text-gray-500">{(item?.hours || 0).toFixed(2)} h · {item?.shifts || 0} turnos</p>
                        </div>
                        <p className="text-sm font-bold text-green-400">{fmtMoney(item?.pay || 0)}</p>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <input type="number" min="0" placeholder="$/hora" value={rates[employee.id] ?? ""}
                          onChange={(e) => setRates((prev) => ({ ...prev, [employee.id]: e.target.value }))}
                          className="min-w-0 flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        <button onClick={() => saveRate(employee.id)} disabled={saving === `rate-${employee.id}`}
                          className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-xs font-semibold">
                          Guardar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
