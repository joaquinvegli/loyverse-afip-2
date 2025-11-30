"use client";

import { useState } from "react";
import FacturaModal from "./FacturaModal";
import { fetchCliente, facturarVenta } from "../lib/api";

export default function VentaCard({ venta }: { venta: any }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [cliente, setCliente] = useState<any>(null);

  const yaFacturada = venta.already_invoiced === true;

  async function abrirModal() {
    if (yaFacturada) return; // ⚠ impedir abrir modal
    setModalOpen(true);

    if (venta.cliente_id) {
      const data = await fetchCliente(venta.cliente_id);
      setCliente(data);
    } else {
      setCliente({
        exists: false,
        id: null,
        name: "Consumidor Final",
        email: "",
        phone: "",
        dni: null,
      });
    }
  }

  function cerrarModal() {
    setModalOpen(false);
  }

  function abrirPdfBase64(b64: string) {
    try {
      const byteChars = atob(b64);
      const byteNumbers = new Array(byteChars.length);

      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      window.open(url, "_blank");
    } catch (e) {
      console.error("Error abriendo PDF:", e);
    }
  }

  async function generarFactura() {
    if (!cliente) {
      alert("No se pudo cargar el cliente.");
      return;
    }

    try {
      const payload = {
        receipt_id: venta.receipt_id,
        cliente: {
          id: cliente.id,
          name: cliente.name,
          email: cliente.email,
          dni: cliente.dni,
        },
        items: venta.items.map((item: any) => ({
          nombre: item.nombre,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
        })),
        total: venta.total,
      };

      const resp = await facturarVenta(payload);

      if (resp.pdf_base64) abrirPdfBase64(resp.pdf_base64);

      alert(
        `Factura generada!\n\n` +
          `CAE: ${resp.cae}\n` +
          `Vencimiento: ${resp.vencimiento}\n\n` +
          `Comprobante: ${resp.cbte_nro}\n\n` +
          `El PDF se abrió en otra pestaña.`
      );

      setModalOpen(false);
    } catch (e: any) {
      alert("Error al generar factura: " + e.message);
    }
  }

  // ============================
  // MÉTODO DE PAGO + COLORES (igual que antes)
  // ============================
  const pagos = Array.isArray(venta.pagos) ? venta.pagos : [];
  const pagoPrincipal = pagos.length > 0 ? pagos[0] : null;

  function getMetodoPagoBadge(pago: any) {
    if (!pago) return null;

    const tipo = (pago.tipo || "").toString().toUpperCase();
    const nombre = (pago.nombre || "").toString().toUpperCase();

    let label = "Otro medio de pago";
    let colorClass =
      "bg-gray-100 text-gray-800 border border-gray-300";

    if (tipo === "CASH" || nombre.includes("EFECTIVO")) {
      label = "Efectivo";
      colorClass =
        "bg-green-100 text-green-800 border border-green-300";
    } else if (tipo === "CARD" || nombre.includes("TARJETA")) {
      label = pago.nombre ? `Tarjeta (${pago.nombre})` : "Tarjeta";
      colorClass =
        "bg-blue-100 text-blue-800 border border-blue-300";
    } else if (
      nombre.includes("MERCADO PAGO") ||
      nombre.includes("MP") ||
      nombre.includes("QR")
    ) {
      label = pago.nombre || "Mercado Pago / QR";
      colorClass =
        "bg-cyan-100 text-cyan-800 border border-cyan-300";
    } else if (nombre.includes("TRANSFER")) {
      label = "Transferencia";
      colorClass =
        "bg-purple-100 text-purple-800 border border-purple-300";
    }

    return { label, colorClass };
  }

  const metodoPago = getMetodoPagoBadge(pagoPrincipal);

  return (
    <div className="border p-4 rounded shadow-md bg-white">
      <h3 className="font-bold text-lg mb-1">
        Venta #{venta.receipt_id}
      </h3>

      <p className="text-sm mb-1">{venta.fecha}</p>

      {/* ============================
          BADGE : YA FACTURADA
      ============================ */}
      {yaFacturada && (
        <span className="inline-block bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full mb-2">
          ✓ Ya facturada
        </span>
      )}

      {metodoPago && (
        <div className="mb-2">
          <span
            className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${metodoPago.colorClass}`}
          >
            {metodoPago.label}
          </span>
        </div>
      )}

      <p className="text-md font-semibold">Total: ${venta.total}</p>

      <div className="mt-3">
        <button
          disabled={yaFacturada}
          onClick={abrirModal}
          className={`px-3 py-2 rounded text-white ${
            yaFacturada
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {yaFacturada ? "Facturada" : "Facturar"}
        </button>
      </div>

      <FacturaModal
        open={modalOpen}
        onClose={cerrarModal}
        venta={venta}
        cliente={cliente}
        onEmailChange={(email) =>
          setCliente((c: any) => ({ ...c, email: email }))
        }
        onFacturar={generarFactura}
      />
    </div>
  );
}
