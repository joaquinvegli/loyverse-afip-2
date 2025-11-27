"use client";

import { useState } from "react";
import FacturaModal from "./FacturaModal";
import { fetchCliente, facturarVenta } from "../lib/api";

export default function VentaCard({ venta }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [cliente, setCliente] = useState(null);

  async function abrirModal() {
    if (venta.cliente_id) {
      const data = await fetchCliente(venta.cliente_id);

      setCliente({
        exists: data.exists,
        id: data.id,
        name: data.name,
        email: data.email || "",
        phone: data.phone || "",
        dni: data.dni || null,
      });
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

    setModalOpen(true);
  }

  function cerrarModal() {
    setModalOpen(false);
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
        items: venta.items.map((item) => ({
          nombre: item.nombre,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
        })),
        total: venta.total,
      };

      const resp = await facturarVenta(payload);

      alert(
        `Factura generada correctamente\n\nCAE: ${resp.cae}\nVencimiento: ${resp.vto_cae}`
      );

      setModalOpen(false);
    } catch (e) {
      alert("Error al generar factura: " + e.message);
    }
  }

  return (
    <div className="border p-4 rounded shadow-md bg-white">

      {/* 🔥 DEBUG VISUAL — MOSTRAR CLIENTE_ID */}
      <p className="text-xs text-gray-500 mb-1">
        <b>cliente_id:</b> {String(venta.cliente_id)}
      </p>

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
        onEmailChange={(nuevoEmail) =>
          setCliente((c) => ({ ...c, email: nuevoEmail }))
        }
        onFacturar={generarFactura}
      />
    </div>
  );
}
