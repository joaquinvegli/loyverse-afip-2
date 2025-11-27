"use client";

import { useState } from "react";
import FacturaModal from "./FacturaModal";
import { fetchCliente, facturarVenta } from "../lib/api";

export default function VentaCard({ venta }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [cliente, setCliente] = useState<any>(null);
  const [email, setEmail] = useState("");

  async function abrirModal() {
    setModalOpen(true);

    if (venta.cliente_id) {
      const data = await fetchCliente(venta.cliente_id);
      setCliente(data);
      setEmail(data.email || "");
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

  function formatearFechaAAAAMMDD(fecha?: string) {
    if (!fecha || fecha.length !== 8) return fecha || "";
    const yyyy = fecha.substring(0, 4);
    const mm = fecha.substring(4, 6);
    const dd = fecha.substring(6, 8);
    return `${dd}/${mm}/${yyyy}`;
  }

  // Convierte base64 -> Blob PDF y lo abre en nueva pestaña
  function abrirPdfBase64(b64: string) {
    if (!b64) return;
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

      const fechaCAE = formatearFechaAAAAMMDD(resp.vencimiento);

      alert(
        `Factura generada correctamente!\n\n` +
          `CAE: ${resp.cae}\n` +
          `Vencimiento CAE: ${fechaCAE}\n\n` +
          `Número comprobante: ${resp.cbte_nro}\n\n` +
          `Se abrirá la factura en PDF en otra pestaña.`
      );

      // Abrir PDF en nueva pestaña
      if (resp.pdf_base64) {
        abrirPdfBase64(resp.pdf_base64);
      }

      setModalOpen(false);
    } catch (e: any) {
      alert("Error al generar factura: " + e.message);
    }
  }

  return (
    <div className="border p-4 rounded shadow-md bg-white">
      <h3 className="font-bold text-lg mb-1">Venta #{venta.receipt_id}</h3>
      <p className="text-sm mb-1">{venta.fecha}</p>
      <p className="text-md font-semibold">Total: ${venta.total}</p>

      <div className="mt-3">
        <button
          onClick={abrirModal}
          className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Facturar
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
