"use client";

import { useState } from "react";
import VentaCard from "./components/VentaCard";
import { fetchVentas } from "./lib/api";
console.log("DEBUG BACKEND URL:", process.env.NEXT_PUBLIC_BACKEND_URL);

export default function HomePage() {
  const [desde, setDesde] = useState("2025-11-26");
  const [hasta, setHasta] = useState("2025-11-27");
  const [ventas, setVentas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cargarVentas() {
    setCargando(true);
    setError(null);

    try {
      const data = await fetchVentas(desde, hasta);
      setVentas(data);
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
            cursor: "pointer"
          }}
        >
          {cargando ? "Cargando..." : "Ver ventas"}
        </button>

        {error && (
          <p style={{ color: "red", marginTop: "10px" }}>❌ {error}</p>
        )}
      </div>

      <div>
        {ventas.map((v, i) => (
          <VentaCard key={i} venta={v} />
        ))}
      </div>
    </div>
  );
}
