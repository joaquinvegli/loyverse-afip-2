"use client";

import { useEffect, useState } from "react";

type VentaItem = {
  nombre: string;
  cantidad: number;
  precio_unitario: number;
};

type Venta = {
  receipt_id: string;
  fecha: string;
  total: number;
  max_facturable?: number;
  items: VentaItem[];
  items_facturables?: VentaItem[];
};

type Cliente = {
  exists?: boolean;
  id: string | null;
  name: string;
  email: string;
  phone?: string;
  dni: string | null;
};

type FacturaModalProps = {
  open: boolean;
  onClose: () => void;
  venta: Venta;
  cliente: Cliente | null;
  onEmailChange: (email: string) => void;
  onFacturar: () => void;
};

export default function FacturaModal({
  open,
  onClose,
  venta,
  cliente,
  onEmailChange,
  onFacturar,
}: FacturaModalProps) {
  const [localCliente, setLocalCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cliente) setLocalCliente(cliente);
  }, [cliente]);

  if (!open || !localCliente) return null;

  // ✅ COMPATIBLE CON REEMBOLSOS
  const items =
    venta.items_facturables ?? venta.items ?? [];

  const total =
    venta.max_facturable ?? venta.total ?? 0;

  async function handleFacturar() {
    setLoading(true);
    try {
      await onFacturar();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white w-full max-w-md rounded-lg shadow-lg p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          ✖
        </button>

        <h2 className="text-xl font-bold mb-4">
          Facturar Venta #{venta.receipt_id}
        </h2>

        <div className="mb-3">
          <label className="block text-sm font-semibold">Cliente:</label>
          <p>{localCliente.name || "Consumidor Final"}</p>
        </div>

        <div className="mb-3">
          <label className="block text-sm font-semibold">DNI:</label>
          <input
            value={localCliente.dni || ""}
            readOnly
            className="w-full border rounded p-2 bg-gray-100"
          />
        </div>

        <div className="mb-3">
          <label className="block text-sm font-semibold">Email:</label>
          <input
            type="email"
            value={localCliente.email || ""}
            onChange={(e) => {
              setLocalCliente({ ...localCliente, email: e.target.value });
              onEmailChange(e.target.value);
            }}
            className="w-full border rounded p-2"
          />
        </div>

        <div className="mb-3">
          <label className="block text-sm font-semibold">Productos:</label>
          <div className="border rounded p-2 max-h-32 overflow-y-auto bg-gray-50">
            {items.map((it, i) => (
              <div key={i} className="flex justify-between text-sm border-b py-1">
                <span>{it.nombre}</span>
                <span>
                  {it.cantidad} × ${it.precio_unitario}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-lg font-semibold mb-4">
          Total: <span className="text-green-700">${total}</span>
        </p>

        <button
          onClick={handleFacturar}
          disabled={loading}
          className={`w-full py-2 rounded text-white ${
            loading
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Cargando…" : "Generar Factura"}
        </button>
      </div>
    </div>
  );
}
