"use client";

import { useState } from "react";
import FacturaModal from "./FacturaModal";
import { fetchCliente, facturarVenta } from "../lib/api";

// --- Toast bonito simple (sin librerías) ---
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

  setTimeout(() => {
    toast.style.opacity = "1";
  }, 50);

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 400);
  }, 2500);
};

export default function VentaCard({
  venta,
  onFacturada,
}: {
  venta: any;
  onFacturada: () => void;
}) {
  const yaFacturada = venta.already_invoiced === true;
  const invoice = venta.invoice;

  const [modalOpen, setModalOpen] = useState(false);
  const [cliente, setCliente] = useState<any>(null);

  // NUEVO → controla si se abre el cuadro de envío de mail
  const [mostrarEmailBox, setMostrarEmailBox] = useState(false);

  // NUEVO → email editable
  const [emailAEnviar, setEmailAEnviar] = useState("");

  async function abrirModal() {
    if (yaFacturada) return;

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

  function abrirPdfDrive() {
    if (!invoice?.drive_url) {
      alert("No se encontró el PDF en Google Drive.");
      return;
    }
    window.open(invoice.drive_url, "_blank");
  }

  async function generarFactura() {
    if (!cliente) {
      alert("No se pudo cargar el cliente.");
      return;
    }

    try {
      const resp = await facturarVenta({
        receipt_id: venta.receipt_id,
        cliente: {
          id: cliente.id,
          name: cliente.name,
          email: cliente.email,
          dni: cliente.dni,
        },
        items: venta.items,
        total: venta.total,
      });

      if (resp.pdf_base64) {
        try {
          const byteChars = atob(resp.pdf_base64);
          const byteNumbers = new Array(byteChars.length);
          for (let i = 0; i < byteChars.length; i++) {
            byteNumbers[i] = byteChars.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: "application/pdf" });
          const url = URL.createObjectURL(blob);
          window.open(url, "_blank");
        } catch (e) {
          console.error("Error abriendo PDF local:", e);
        }
      }

      onFacturada();
      setModalOpen(false);
    } catch (e: any) {
      if (e.message.includes("ya fue facturada")) {
        alert("Esta venta ya fue facturada anteriormente.");
        onFacturada();
        setModalOpen(false);
        return;
      }

      alert("Error al generar factura: " + e.message);
    }
  }

  // ========================================================
  // 🔥 NUEVO: Enviar email (con confirmación y campo editable)
  // ========================================================
  async function abrirEnviarMail() {
    if (!cliente) {
      if (venta.cliente_id) {
        const data = await fetchCliente(venta.cliente_id);
        setCliente(data);
        setEmailAEnviar(data.email || "");
      } else {
        const cf = {
          exists: false,
          id: null,
          name: "Consumidor Final",
          email: "",
          phone: "",
          dni: null,
        };
        setCliente(cf);
        setEmailAEnviar("");
      }
    } else {
      setEmailAEnviar(cliente.email || "");
    }

    setMostrarEmailBox(true);
  }

  async function confirmarEnvioEmail() {
    if (!emailAEnviar.trim()) {
      alert("Ingresá un email válido para enviar la factura.");
      return;
    }

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

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.detail || "Error desconocido enviando email");
      }

      showToast("📧 Email enviado correctamente ✨");
      setMostrarEmailBox(false);
    } catch (error: any) {
      alert("Error al enviar email: " + error.message);
    }
  }

  // Método de pago
  const pagos = Array.isArray(venta.pagos) ? venta.pagos : [];
  const pagoPrincipal = pagos[0] ?? null;

  function metodoBadge() {
    if (!pagoPrincipal) return null;

    const tipo = (pagoPrincipal.tipo || "").toUpperCase();
    const nombre = (pagoPrincipal.nombre || "").toUpperCase();

    let label = "Otro medio de pago";
    let color = "bg-gray-200 text-gray-700";

    if (tipo === "CASH" || nombre.includes("EFECTIVO"))
      (label = "Efectivo"), (color = "bg-green-200 text-green-800");
    else if (tipo === "CARD")
      (label = `Tarjeta (${pagoPrincipal.nombre})`),
        (color = "bg-blue-200 text-blue-800");
    else if (nombre.includes("MP") || nombre.includes("QR"))
      (label = "Mercado Pago / QR"), (color = "bg-cyan-200 text-cyan-800");
    else if (nombre.includes("TRANSFER"))
      (label = "Transferencia"), (color = "bg-purple-200 text-purple-800");

    return (
      <span
        className={`inline-block px-2 py-1 text-xs rounded-full font-semibold ${color}`}
      >
        {label}
      </span>
    );
  }

  return (
    <div className="border p-4 rounded shadow-md bg-white relative">
      <h3 className="font-bold text-lg">Venta #{venta.receipt_id}</h3>
      <p className="text-sm">{venta.fecha}</p>

      {yaFacturada && (
        <div className="relative inline-block group mt-1">
          <span className="inline-block bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full cursor-pointer">
            ✓ Facturada #{invoice?.cbte_nro || ""}
          </span>

          <div
            className="absolute left-0 top-7 hidden group-hover:block bg-black text-white text-xs p-2 rounded shadow-lg whitespace-pre-line z-50 border border-gray-700"
            style={{ minWidth: "180px" }}
          >
            {`Factura C emitida
-----------------
Comprobante: ${invoice?.cbte_nro}
Punto de venta: ${invoice?.pto_vta}
Fecha: ${invoice?.fecha}
CAE: ${invoice?.cae}
Vto CAE: ${invoice?.vencimiento}`}
          </div>
        </div>
      )}

      <div className="mt-2">{metodoBadge()}</div>

      <p className="font-semibold mt-2">Total: ${venta.total}</p>

      <div className="flex gap-2 mt-3">
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

        {yaFacturada && invoice?.drive_url && (
          <button
            onClick={abrirPdfDrive}
            className="px-3 py-2 bg-gray-800 text-white rounded hover:bg-black"
          >
            Ver PDF
          </button>
        )}

        {yaFacturada && (
          <button
            onClick={abrirEnviarMail}
            className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Enviar por mail
          </button>
        )}
      </div>

      {mostrarEmailBox && (
        <div className="mt-3 p-3 border rounded bg-gray-50">
          <label className="block text-sm font-semibold mb-1">
            Email del cliente:
          </label>
          <input
            type="email"
            value={emailAEnviar}
            onChange={(e) => setEmailAEnviar(e.target.value)}
            className="w-full border rounded p-2 mb-2"
            placeholder="cliente@example.com"
          />

          <button
            onClick={confirmarEnvioEmail}
            className="w-full py-2 bg-green-700 text-white rounded hover:bg-green-800"
          >
            Confirmar envío
          </button>
        </div>
      )}

      <FacturaModal
        open={modalOpen}
        onClose={cerrarModal}
        venta={venta}
        cliente={cliente}
        onEmailChange={(email) => setCliente((c: any) => ({ ...c, email }))}
        onFacturar={generarFactura}
      />
    </div>
  );
}
