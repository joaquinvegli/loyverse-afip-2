"use client";

import { useState } from "react";
import VentaCard from "./components/VentaCard";
import { fetchVentas } from "./lib/api";

export default function HomePage() {
  const [desde, setDesde] = useState("2025-11-26");
  const [hasta, setHasta] = useState("2025-11-27");
  const [ventas, setVentas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================
  // FORMATEO DE FECHA (UTC → ARG)
  // ============================
  function formatearFecha(fechaISO: string) {
    try {
      const fecha = new Date(fechaISO);

      // Ajuste manual UTC-3
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

      // Normalizar fechas y agregar flag facturación
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

  return (
    <div style={{ padding: "30px", maxWidth: "800px", margin: "auto" }}>
      <h1>📘 Facturación Loyverse + AFIP</h1>

      <div style={{ marginBottom: "20px" }}>
        <h3>Seleccionar fechas:</h3>

        <label>
          Desde:
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            style={{ marginLeft: "10px" }}
          />
        </label>

        <br />

        <label>
          Hasta:
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            style={{ marginLeft: "10px" }}
          />
        </label>

        <br />

        <button
          onClick={cargarVentas}
          style={{
            marginTop: "15px",
            padding: "10px 15px",
            background: "green",
            color: "white",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
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
              // 🔥 Actualizar venta como facturada
              const copia = [...ventas];
              copia[i].already_invoiced = true;
              setVentas(copia);
            }}
          />
        ))}
      </div>
    </div>
  );
}
