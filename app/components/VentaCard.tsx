"use client";

import { useState } from "react";
import FacturaModal from "./FacturaModal";
import { fetchCliente, facturarVenta } from "../lib/api";

/* =========================
   Toast simple
========================= */
const showToast = (msg: string) => {
  const toast = document.createElement("div");
  toast.innerText = msg;
  toast.style.position = "fixed";
  toast.style.bottom = "30px";
  toast.style.right = "30px";
  toast.style.padding = "12px 18px";
  toast.style.background = "rgba(0,0,0,0.85)";
  toast.style.color = "white";
  toast.style.borderRadius = "8px";
  toast.style.fontSize = "14px";
  toast.style.zIndex = "9999";
  toast.style.opacity = "0";
  toast.style.transition = "opacity 0.4s";

  document.body.appendChild(toast);
  setTimeout(() => (toast.style.opacity = "1"), 50);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 400);
  }, 2500);
};

export default function VentaCard({ venta, onFacturada }: any) {
  const esReembolso = venta.receipt_type === "REFUND";
  const yaFacturada = venta.already_invoiced === true;
  const tieneReembolso = venta.refund_status === "PARTIAL" || venta.refund_status === "TOTAL";

  const [modalOpen, setModalOpen] = useState(false);
  const [cliente, setCliente] = useState<any>(null);
  const [invoice, setInvoice] = useState(venta.invoice);

  const [mostrarEmailBox, setMostrarEmailBox] = useState(false);
  const [emailAEnviar, setEmailAEnviar] = useState("");
  const [enviandoEmail, setEnviandoEmail] = useState(false);

  /* =========================
     Facturación
  ========================= */
  async function abrirModal() {
    if (yaFacturada || esReembolso) return;

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

  async function generarFactura() {
    if (!cliente) return alert("No se pudo cargar el cliente.");

    try {
      const resp = await facturarVenta({
        receipt_id: venta.receipt_id,
        cliente: {
          id: cliente.id,
          name: cliente.name,
          email: cliente.email,
          dni: cliente.dni,
        },
        items: venta.items_facturables ?? venta.items,
        total: venta.max_facturable ?? venta.total,
      });

      setInvoice(resp.invoice);
      onFacturada(resp.invoice);
      setModalOpen(false);
    } catch (e: any) {
      alert("Error al generar factura: " + e.message);
    }
  }

  /* =========================
     Email
  ========================= */
  async function abrirEnviarMail() {
    if (!cliente && venta.cliente_id) {
      const data = await fetchCliente(venta.cliente_id);
      setCliente(data);
      setEmailAEnviar(data?.email || "");
    } else if (cliente) {
      setEmailAEnviar(cliente.email || "");
    }
    setMostrarEmailBox(true);
  }

  async function confirmarEnvioEmail() {
    if (!emailAEnviar.trim()) {
      alert("Ingresá un email válido.");
      return;
    }

    setEnviandoEmail(true);

    try {
      const resp = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/enviar_email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            receipt_id: venta.receipt_id,
            email: emailAEnviar,
          }),
        }
      );

      if (!resp.ok) throw new Error("Error enviando email");

      showToast("📧 Email enviado correctamente");
      setMostrarEmailBox(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setEnviandoEmail(false);
    }
  }

  /* =========================
     Método de pago
  ========================= */
  const pagos = Array.isArray(venta.pagos) ? venta.pagos : [];
  const pago = pagos[0];

  function metodoBadge() {
    if (!pago) return null;

    let label = pago.nombre || "Otro medio";
    let color = "bg-gray-200 text-gray-700";

    if (pago.tipo === "CASH") color = "bg-green-200 text-green-800";
    if (pago.nombre?.toUpperCase().includes("QR"))
      color = "bg-cyan-200 text-cyan-800";
    if (pago.nombre?.toUpperCase().includes("TRANSFER"))
      color = "bg-purple-200 text-purple-800";

    return (
      <span className={`inline-block px-2 py-1 text-xs rounded-full ${color}`}>
        {label}
      </span>
    );
  }

  /* =========================
     Render
  ========================= */
  return (
    <div className="border p-4 rounded shadow bg-white relative">
      <h3 className="font-bold text-lg">
        {esReembolso ? "Reembolso" : "Venta"} #{venta.receipt_id}
      </h3>

      {/* ✅ FECHA Y HORA — EXACTO COMO EL ARCHIVO VIEJO */}
      <p className="text-sm text-gray-600">{venta.fecha}</p>

      {/* Método de pago */}
      <div className="mt-1">{metodoBadge()}</div>

      {/* Estado */}
      {esReembolso && (
        <span className="inline-block mt-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
          REEMBOLSO
        </span>
      )}

      {yaFacturada && invoice && (
        <span className="inline-block mt-2 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded ml-2">
          ✓ Facturada #{invoice.cbte_nro}
        </span>
      )}

      {/* Reembolso info */}
      {tieneReembolso && !esReembolso && (
        <div className="mt-2 text-sm text-red-700">
          Reembolsado: ${venta.refunded_amount} · Máx facturable: $
          {venta.max_facturable}
        </div>
      )}

      <p className="font-semibold mt-2">
        Monto: ${venta.max_facturable ?? venta.total}
      </p>

      {/* Botones */}
      <div className="flex flex-wrap gap-2 mt-3">
        <button
          disabled={yaFacturada || esReembolso}
          onClick={abrirModal}
          className={`px-3 py-2 rounded text-white ${
            yaFacturada || esReembolso
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          Facturar
        </button>

        {invoice?.drive_url && (
          <button
            onClick={() => window.open(invoice.drive_url, "_blank")}
            className="px-3 py-2 bg-gray-800 text-white rounded"
          >
            Ver PDF
          </button>
        )}

        {yaFacturada && (
          <button
            onClick={abrirEnviarMail}
            className="px-3 py-2 bg-green-600 text-white rounded"
          >
            Enviar por mail
          </button>
        )}
      </div>

      {/* Email */}
      {mostrarEmailBox && (
        <div className="mt-3 p-3 border rounded bg-gray-50">
          <input
            type="email"
            value={emailAEnviar}
            onChange={(e) => setEmailAEnviar(e.target.value)}
            className="w-full border rounded p-2 mb-2"
          />
          <button
            onClick={confirmarEnvioEmail}
            disabled={enviandoEmail}
            className="w-full py-2 bg-green-700 text-white rounded"
          >
            {enviandoEmail ? "Enviando…" : "Confirmar envío"}
          </button>
        </div>
      )}

      <FacturaModal
        open={modalOpen}
        onClose={cerrarModal}
        venta={venta}
        cliente={cliente}
        onFacturar={generarFactura}
      />
    </div>
  );
}
