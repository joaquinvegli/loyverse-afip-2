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
          `El PDF se abrirá en una nueva pestaña.`
      );

      // 📌 ABRIR PDF desde backend
      if (resp.pdf_url) {
        const url = process.env.NEXT_PUBLIC_BACKEND_URL + resp.pdf_url;
        window.open(url, "_blank");
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
