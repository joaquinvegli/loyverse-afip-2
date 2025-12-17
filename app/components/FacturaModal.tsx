"use client";

import { useState } from "react";

export default function FacturaModal({
  open,
  onClose,
  venta,
  cliente,
  onFacturar,
}: any) {
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function confirmar() {
    setLoading(true);
    await onFacturar();
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md rounded p-4 space-y-3">
        <h2 className="font-bold text-lg">
          Facturar #{venta.receipt_id}
        </h2>

        <p className="text-sm">
          Cliente: {cliente?.name || "Consumidor Final"}
        </p>

        <div className="border rounded p-2 max-h-40 overflow-y-auto text-sm">
          {venta.items_facturables.map((i: any, idx: number) => (
            <div key={idx} className="flex justify-between">
              <span>{i.nombre}</span>
              <span>
                {i.cantidad} × ${i.precio_unitario}
              </span>
            </div>
          ))}
        </div>

        <p className="font-semibold">
          Total a facturar: ${venta.max_facturable}
        </p>

        <button
          disabled={loading}
          onClick={confirmar}
          className="w-full bg-blue-600 text-white py-2 rounded"
        >
          {loading ? "Generando…" : "Confirmar factura"}
        </button>

        <button
          onClick={onClose}
          className="w-full text-sm text-gray-500"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
