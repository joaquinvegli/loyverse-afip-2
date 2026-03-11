"use client";

import { useState } from "react";
import FacturaModal from "./FacturaModal";
import { fetchCliente, facturarVenta } from "../lib/api";

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

  const [modalOpen, setModalOpen] = useState(false);
  const [cliente, setCliente] = useState<any>(null);
  const [invoice, setInvoice] = useState(venta.invoice ?? null);
  const [yaFacturada, setYaFacturada] = useState(venta.already_invoiced === true);

  const [mostrarEmailBox, setMostrarEmailBox] = useState(false);
  const [emailAEnviar, setEmailAEnviar] = useState("");
  const [enviandoEmail, setEnviandoEmail] = useState(false);

  const tieneReembolso = venta.refund_status === "PARTIAL" || venta.refund_status === "TOTAL";

  // =========================
  // Facturación
  // =========================
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
      setYaFacturada(true);
      onFacturada(resp.invoice);
      setModalOpen(false);
    } catch (e: any) {
      alert("Error al generar factura: " + e.message);
    }
  }

  // =========================
  // Email
  // =========================
  async function abrirEnviarMail() {
    const emailInicial = invoice?.email_cliente || cliente?.email || "";
    if (!emailInicial && venta.cliente_id) {
      const data = await fetchCliente(venta.cliente_id);
      setCliente(data);
      setEmailAEnviar(data?.email || "");
    } else {
      setEmailAEnviar(emailInicial);
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

  // =========================
  // Método de pago
  // =========================
  const pagos = Array.isArray(venta.pagos) ? venta.pagos : [];

  function metodoBadges() {
    if (!pagos.length) return null;
    return pagos.map((pago: any, idx: number) => {
      let label = pago.nombre || "Otro medio";
      let color = "bg-gray-200 text-gray-700";
      let icono = "💳";

      const nombre = (pago.nombre || "").toUpperCase();

      if (pago.tipo === "CASH") {
        color = "bg-green-200 text-green-800";
        icono = "💵";
        label = "Efectivo";
      } else if (nombre.includes("QR") || nombre.includes("MERCADO")) {
        color = "bg-blue-200 text-blue-800";
        icono = "📱";
        label = pago.nombre;
      } else if (nombre.includes("TRANSFER")) {
        color = "bg-purple-200 text-purple-800";
        icono = "🏦";
        label = "Transferencia";
      } else if (nombre.includes("TARJETA") || nombre.includes("CARD") || nombre.includes("CREDITO") || nombre.includes("DEBITO")) {
        color = "bg-orange-200 text-orange-800";
        icono = "💳";
        label = pago.nombre;
      } else if (nombre.includes("GIFT") || nombre.includes("REGALO")) {
        color = "bg-cyan-200 text-cyan-800";
        icono = "🎁";
        label = "Gift Card";
      }

      return (
        <span key={idx} className={`inline-block px-2 py-1 text-xs rounded-full mr-1 ${color}`}>
          {icono} {label} ${pago.monto?.toFixed(2) ?? ""}
        </span>
      );
    });
  }

  // =========================
  // Render
  // =========================
  return (
    <div className="border p-4 rounded shadow bg-white relative mb-3">
      <h3 className="font-bold text-lg">
        {esReembolso ? "🔴 Reembolso" : "🛒 Venta"} #{venta.receipt_id}
      </h3>

      <p className="text-sm text-gray-600">{venta.fecha}</p>

      <div className="mt-1 flex flex-wrap gap-1">{metodoBadges()}</div>

      {esReembolso && (
        <span className="inline-block mt-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
          REEMBOLSO
        </span>
      )}

      {yaFacturada && invoice && (
        <span className="inline-block mt-2 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded ml-1">
          ✓ Facturada #{invoice.cbte_nro}
        </span>
      )}

      {tieneReembolso && !esReembolso && (
        <div className="mt-2 text-sm text-red-700">
          Reembolsado: ${venta.refunded_amount} · Máx facturable: ${venta.max_facturable}
        </div>
      )}

      <p className="font-semibold mt-2">
        Monto: ${venta.max_facturable ?? venta.total}
      </p>

      {/* Botones — siempre se muestran todos, cambia el estado */}
      <div className="flex flex-wrap gap-2 mt-3">

        {/* Botón Facturar — siempre visible, desactivado si ya está facturada o es reembolso */}
        <button
          disabled={yaFacturada || esReembolso}
          onClick={abrirModal}
          className={`px-3 py-2 rounded text-white text-sm ${
            yaFacturada || esReembolso
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {yaFacturada ? "✓ Facturada" : "Facturar"}
        </button>

        {/* Ver PDF — solo si hay invoice con URL */}
        {invoice?.drive_url && (
          <button
            onClick={() => window.open(invoice.drive_url, "_blank")}
            className="px-3 py-2 bg-gray-800 text-white rounded text-sm"
          >
            📄 Ver PDF
          </button>
        )}

        {/* Enviar por mail — solo si está facturada */}
        {yaFacturada && (
          <button
            onClick={abrirEnviarMail}
            className="px-3 py-2 bg-green-600 text-white rounded text-sm"
          >
            📧 Enviar por mail
          </button>
        )}
      </div>

      {/* Campo email */}
      {mostrarEmailBox && (
        <div className="mt-3 p-3 border rounded bg-gray-50">
          <p className="text-sm font-medium mb-1">Email del cliente:</p>
          <input
            type="email"
            value={emailAEnviar}
            onChange={(e) => setEmailAEnviar(e.target.value)}
            placeholder="email@ejemplo.com"
            className="w-full border rounded p-2 mb-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={confirmarEnvioEmail}
              disabled={enviandoEmail}
              className="flex-1 py-2 bg-green-700 text-white rounded text-sm"
            >
              {enviandoEmail ? "Enviando…" : "Confirmar envío"}
            </button>
            <button
              onClick={() => setMostrarEmailBox(false)}
              className="px-3 py-2 bg-gray-300 text-gray-700 rounded text-sm"
            >
              Cancelar
            </button>
          </div>
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