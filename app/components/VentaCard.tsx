"use client";

import { useState } from "react";
import FacturaModal from "./FacturaModal";
import { facturarVenta } from "../lib/api";

const showToast = (msg: string) => {
  const toast = document.createElement("div");
  toast.innerText = msg;
  Object.assign(toast.style, {
    position: "fixed", bottom: "30px", right: "20px",
    padding: "12px 18px", background: "rgba(0,0,0,0.85)",
    color: "white", borderRadius: "12px", fontSize: "14px",
    zIndex: "9999", opacity: "0", transition: "opacity 0.4s",
    maxWidth: "280px",
  });
  document.body.appendChild(toast);
  setTimeout(() => (toast.style.opacity = "1"), 50);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 400);
  }, 2500);
};

export default function VentaCard({ venta, onFacturada, modoSeleccion, seleccionada, onToggleSeleccion }: any) {
  const esReembolso = venta.receipt_type === "REFUND";
  const [modalOpen, setModalOpen] = useState(false);
  const [cliente, setCliente] = useState<any>(null);
  const [invoice, setInvoice] = useState(venta.invoice ?? null);
  const [yaFacturada, setYaFacturada] = useState(venta.already_invoiced === true);
  const [mostrarEmailBox, setMostrarEmailBox] = useState(false);
  const [emailAEnviar, setEmailAEnviar] = useState("");
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [mostrarNCBox, setMostrarNCBox] = useState(false);
  const [emitiendoNC, setEmitiendoNC] = useState(false);
  const [ncEmitida, setNcEmitida] = useState(venta.nota_credito ?? null);

  const tieneReembolso = venta.refund_status === "PARTIAL" || venta.refund_status === "TOTAL";
  const esReembolsoFacturable = esReembolso && venta.refund_for;
  const pagos = Array.isArray(venta.pagos) ? venta.pagos : [];

  function docLabel() {
    if (venta.cliente_cuit) return `🪪 CUIT/CUIL: ${venta.cliente_cuit}`;
    if (venta.cliente_dni) return `🪪 DNI: ${venta.cliente_dni}`;
    return null;
  }

  async function abrirModal() {
    if (yaFacturada || esReembolso) return;
    setCliente({
      id: venta.cliente_id ?? null,
      name: venta.cliente_nombre || "Consumidor Final",
      email: venta.cliente_email || "",
      dni: venta.cliente_dni ?? null,
      cuit: venta.cliente_cuit ?? null,
      domicilio: venta.cliente_domicilio ?? null,
    });
    setModalOpen(true);
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
          cuit: cliente.cuit,
          domicilio: cliente.domicilio,
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

  async function abrirEnviarMail() {
    const emailInicial = invoice?.email_cliente || venta.cliente_email || "";
    setEmailAEnviar(emailInicial);
    setMostrarEmailBox(true);
  }

  async function confirmarEnvioEmail() {
    if (!emailAEnviar.trim()) return alert("Ingresá un email válido.");
    setEnviandoEmail(true);
    try {
      const resp = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/enviar_email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ receipt_id: venta.receipt_id, email: emailAEnviar }),
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

  async function emitirNotaCredito() {
    setEmitiendoNC(true);
    try {
      // Buscar la venta original facturada usando refund_for
      const saleReceiptId = venta.refund_for;
      const resp = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/nota_credito`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            refund_receipt_id: venta.receipt_id,
            sale_receipt_id: saleReceiptId,
            cliente: {
              name: venta.cliente_nombre || "Consumidor Final",
              email: venta.cliente_email || "",
              dni: venta.cliente_dni ?? null,
              cuit: venta.cliente_cuit ?? null,
            },
            items: venta.items.map((it: any) => ({
              nombre: it.nombre,
              cantidad: it.cantidad,
              precio_unitario: it.precio_unitario,
            })),
            total: venta.total,
          }),
        }
      );
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || "Error emitiendo NC");
      setNcEmitida(data.nota_credito);
      setMostrarNCBox(false);
      showToast("✅ Nota de Crédito emitida correctamente");
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setEmitiendoNC(false);
    }
  }

  function metodoBadges() {
    if (!pagos.length) return null;
    return pagos.map((pago: any, idx: number) => {
      const nombre = (pago.nombre || "").toUpperCase();
      let color = "bg-gray-100 text-gray-700";
      let icono = "💳";
      let label = pago.nombre || "Otro";

      if (pago.tipo === "CASH") {
        color = "bg-green-100 text-green-800"; icono = "💵"; label = "Efectivo";
      } else if (nombre.includes("QR") || nombre.includes("MERCADO")) {
        color = "bg-blue-100 text-blue-800"; icono = "📱";
      } else if (nombre.includes("TRANSFER")) {
        color = "bg-purple-100 text-purple-800"; icono = "🏦"; label = "Transferencia";
      } else if (nombre.includes("TARJETA") || nombre.includes("CARD") || nombre.includes("CREDITO") || nombre.includes("DEBITO")) {
        color = "bg-orange-100 text-orange-800"; icono = "💳";
      } else if (nombre.includes("GIFT") || nombre.includes("REGALO")) {
        color = "bg-cyan-100 text-cyan-800"; icono = "🎁"; label = "Gift Card";
      }

      return (
        <span key={idx} className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${color}`}>
          {icono} {label} · ${Number(pago.monto ?? 0).toFixed(2)}
        </span>
      );
    });
  }

  return (
    <div
      className={`relative bg-white rounded-2xl shadow border p-4 transition ${
        modoSeleccion && !esReembolso && !yaFacturada
          ? seleccionada
            ? "border-blue-400 bg-blue-50"
            : "border-gray-200 hover:border-blue-300"
          : esReembolso
          ? "border-red-200 bg-red-50"
          : yaFacturada
          ? "border-green-200"
          : "border-gray-100"
      }`}
      onClick={modoSeleccion && !esReembolso && !yaFacturada ? onToggleSeleccion : undefined}
    >
      {/* CHECKBOX */}
      {modoSeleccion && !esReembolso && !yaFacturada && (
        <div className={`absolute top-3 right-3 w-7 h-7 rounded-full border-2 flex items-center justify-center transition ${
          seleccionada ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300 bg-white"
        }`}>
          {seleccionada && <span className="text-xs font-bold">✓</span>}
        </div>
      )}

      {/* CABECERA */}
      <div className="flex items-start justify-between gap-2 pr-8">
        <div>
          <p className="text-xs text-gray-400 font-mono">#{venta.receipt_id}</p>
          <p className="text-sm text-gray-500 mt-0.5">{venta.fecha}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {esReembolso && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">🔴 REEMBOLSO</span>
          )}
          {ncEmitida && (
            <span className="bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded-full">✓ NC #{ncEmitida.cbte_nro}</span>
          )}
          {yaFacturada && (
            <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">✓ Factura #{invoice?.cbte_nro}</span>
          )}
          {!yaFacturada && !esReembolso && (
            <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-1 rounded-full">⏳ Pendiente</span>
          )}
        </div>
      </div>

      {/* MONTO */}
      <p className="text-2xl font-bold text-gray-900 mt-3">
        ${Number(venta.max_facturable ?? venta.total).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
      </p>

      {/* CLIENTE */}
      {venta.cliente_nombre && venta.cliente_nombre !== "Consumidor Final" && (
        <div className="mt-1 space-y-0.5">
          <p className="text-sm text-gray-600">👤 {venta.cliente_nombre}</p>
          {venta.cliente_email && (
            <p className="text-xs text-gray-400">✉️ {venta.cliente_email}</p>
          )}
          {docLabel() && (
            <p className="text-xs text-gray-400">{docLabel()}</p>
          )}
          {venta.cliente_domicilio && (
            <p className="text-xs text-gray-400">📍 {venta.cliente_domicilio}</p>
          )}
        </div>
      )}

      {/* REEMBOLSO INFO */}
      {tieneReembolso && !esReembolso && (
        <p className="text-xs text-red-600 mt-1">
          ⚠️ Reembolsado: ${venta.refunded_amount} · Máx facturable: ${venta.max_facturable}
        </p>
      )}

      {/* REFERENCIA REEMBOLSO */}
      {esReembolso && venta.refund_for && (
        <p className="text-xs text-red-500 mt-1">↩️ Reembolso de venta #{venta.refund_for}</p>
      )}

      {/* MÉTODOS DE PAGO */}
      <div className="flex flex-wrap gap-1 mt-3">
        {metodoBadges()}
      </div>

      {/* BOTONES VENTA NORMAL */}
      {!modoSeleccion && !esReembolso && (
        <div className="grid grid-cols-3 gap-2 mt-4">
          <button
            disabled={yaFacturada}
            onClick={abrirModal}
            className={`py-3 rounded-xl text-sm font-semibold transition active:scale-95 ${
              yaFacturada
                ? "bg-green-100 text-green-700 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            }`}
          >
            {yaFacturada ? "✓ Emitida" : "📄 Facturar"}
          </button>

          <button
            disabled={!invoice?.drive_url}
            onClick={() => invoice?.drive_url && window.open(invoice.drive_url, "_blank")}
            className={`py-3 rounded-xl text-sm font-semibold transition active:scale-95 ${
              invoice?.drive_url
                ? "bg-gray-800 hover:bg-gray-900 text-white shadow-sm"
                : "bg-gray-100 text-gray-300 cursor-not-allowed"
            }`}
          >
            🔍 Ver PDF
          </button>

          <button
            disabled={!yaFacturada}
            onClick={yaFacturada ? abrirEnviarMail : undefined}
            className={`py-3 rounded-xl text-sm font-semibold transition active:scale-95 ${
              yaFacturada
                ? "bg-green-600 hover:bg-green-700 text-white shadow-sm"
                : "bg-gray-100 text-gray-300 cursor-not-allowed"
            }`}
          >
            📧 Mail
          </button>
        </div>
      )}

      {/* BOTONES REEMBOLSO */}
      {!modoSeleccion && esReembolso && venta.refund_for && (
        <div className="mt-4">
          {ncEmitida ? (
            <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-sm text-purple-700 font-semibold">
              ✓ Nota de Crédito #{ncEmitida.cbte_nro} emitida
            </div>
          ) : (
            <button
              onClick={() => setMostrarNCBox(true)}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold text-sm transition active:scale-95"
            >
              📋 Emitir Nota de Crédito
            </button>
          )}
        </div>
      )}

      {/* EMAIL BOX */}
      {mostrarEmailBox && (
        <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-sm font-semibold text-gray-700 mb-2">📧 Enviar factura por mail</p>
          <input
            type="email"
            value={emailAEnviar}
            onChange={(e) => setEmailAEnviar(e.target.value)}
            placeholder="email@ejemplo.com"
            className="w-full px-3 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-green-500 mb-3"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={confirmarEnvioEmail}
              disabled={enviandoEmail}
              className="py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-sm disabled:opacity-60"
            >
              {enviandoEmail ? "Enviando…" : "✅ Confirmar"}
            </button>
            <button
              onClick={() => setMostrarEmailBox(false)}
              className="py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* NOTA DE CRÉDITO BOX */}
      {mostrarNCBox && (
        <div className="mt-4 p-4 bg-purple-50 rounded-xl border border-purple-200">
          <p className="text-sm font-semibold text-purple-800 mb-1">📋 Emitir Nota de Crédito</p>
          <p className="text-xs text-purple-600 mb-3">
            Se emitirá una NC asociada a la factura de la venta #{venta.refund_for}.
            Solo es posible si esa venta fue facturada.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={emitirNotaCredito}
              disabled={emitiendoNC}
              className="py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold text-sm disabled:opacity-60"
            >
              {emitiendoNC ? "Emitiendo…" : "✅ Confirmar"}
            </button>
            <button
              onClick={() => setMostrarNCBox(false)}
              className="py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <FacturaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        venta={venta}
        cliente={cliente}
        onFacturar={generarFactura}
      />
    </div>
  );
}