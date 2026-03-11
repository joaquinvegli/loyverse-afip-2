"use client";

import { useState } from "react";

export default function FacturaModal({ open, onClose, venta, cliente, onFacturar }: any) {
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function confirmar() {
    setLoading(true);
    await onFacturar();
    setLoading(false);
  }

  const items = venta.items_facturables ?? venta.items ?? [];
  const total = venta.max_facturable ?? venta.total;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 space-y-4 shadow-2xl">

        {/* Título */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">📄 Confirmar Factura</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 text-lg"
          >
            ✕
          </button>
        </div>

        {/* ID venta */}
        <p className="text-xs text-gray-400 font-mono">Venta #{venta.receipt_id}</p>

        {/* Cliente */}
        <div className="bg-gray-50 rounded-xl px-4 py-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Cliente</p>
          <p className="text-sm font-medium text-gray-800">
            {cliente?.name || "Consumidor Final"}
          </p>
          {cliente?.dni && (
            <p className="text-xs text-gray-500">DNI: {cliente.dni}</p>
          )}
        </div>

        {/* Items */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Detalle</p>
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            {items.map((item: any, idx: number) => (
              <div
                key={idx}
                className={`flex justify-between items-center px-4 py-3 text-sm ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
              >
                <span className="text-gray-700 flex-1 mr-2">{item.nombre}</span>
                <span className="text-gray-500 text-xs whitespace-nowrap">
                  {item.cantidad} × ${Number(item.precio_unitario).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="bg-blue-50 rounded-xl px-4 py-3 flex justify-between items-center">
          <span className="font-semibold text-gray-700">Total a facturar</span>
          <span className="text-xl font-bold text-blue-700">
            ${Number(total).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Botones */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={onClose}
            className="py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-base transition"
          >
            Cancelar
          </button>
          <button
            disabled={loading}
            onClick={confirmar}
            className="py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-base transition disabled:opacity-60 shadow"
          >
            {loading ? "⏳ Generando…" : "✅ Confirmar"}
          </button>
        </div>

      </div>
    </div>
  );
}