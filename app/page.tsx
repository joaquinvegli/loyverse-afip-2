"use client";

import { useEffect, useState } from "react";
import VentaCard from "./components/VentaCard";
import { fetchVentas } from "./lib/api";

export default function HomePage() {
  // ============================
  // FECHA HOY (YYYY-MM-DD)
  // ============================
  const hoy = new Date();
  const yyyy = hoy.getFullYear();
  const mm = String(hoy.getMonth() + 1).padStart(2, "0");
  const dd = String(hoy.getDate()).padStart(2, "0");
  const hoyStr = `${yyyy}-${mm}-${dd}`;

  const [desde, setDesde] = useState(hoyStr);
  const [hasta, setHasta] = useState(hoyStr);
  const [ventas, setVentas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================
  // FORMATEO FECHA UTC → ARG
  // ============================
  function formatearFecha(fechaISO: string) {
    try {
      const fecha = new Date(fechaISO);

      // Ajuste a UTC-3 manual
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

  // ============================
  // CARGAR VENTAS
  // ============================
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

      // 🔥 Limpia la lista y vuelve a cargar solo las actuales
      setVentas(ventasConFecha);
    } catch (e: any) {
      setError("Error cargando ventas: " + e.message);
    } finally {
      setCargando(false);
    }
  }

  // ============================
  // AUTO-CARGAR AL ENTRAR
  // ============================
  useEffect(() => {
    cargarVentas();
  }, []);

  return (
    <div style={{ padding: "30px", maxWidth: "900px", margin: "auto" }}>
      <h1 style={{ marginBottom: "20px" }}>📘 Facturación Loyverse + AFIP</h1>

      {/* ============================
          CALENDARIOS
      ============================ */}
      <div
        style={{
          padding: "15px",
          borderRadius: "12px",
          background: "#f8f8f8",
          marginBottom: "20px",
          border: "1px solid #ddd",
        }}
      >
        <h3 style={{ marginBottom: "10px" }}>Seleccionar fechas:</h3>

        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ fontWeight: "bold", marginBottom: "4px" }}>
              Desde:
            </label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              style={{
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                fontSize: "16px",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ fontWeight: "bold", marginBottom: "4px" }}>
              Hasta:
            </label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              style={{
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                fontSize: "16px",
              }}
            />
          </div>
        </div>

        <button
          onClick={cargarVentas}
          style={{
            marginTop: "15px",
            padding: "10px 20px",
            background: "#007f2d",
            color: "white",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          {cargando ? "Cargando..." : "Ver ventas"}
        </button>

        {error && (
          <p style={{ color: "red", marginTop: "10px" }}>❌ {error}</p>
        )}
      </div>

      {/* ============================
          LISTA DE VENTAS
      ============================ */}
      <div>
        {ventas.map((v, i) => (
          <VentaCard
            key={i}
            venta={v}
            onFacturada={() => {
              // 🔥 Vuelve a cargar ventas para mostrar el botón "Ver PDF"
              cargarVentas();
            }}
          />
        ))}
      </div>
    </div>
  );
}
