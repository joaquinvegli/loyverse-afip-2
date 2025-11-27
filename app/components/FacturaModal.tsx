"use client";

import React, { useState } from "react";

interface ClienteData {
  exists: boolean;
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
}

interface FacturaModalProps {
  open: boolean;
  onClose: () => void;
  venta: any;
  cliente: ClienteData | null;
  onEmailChange: (email: string) => void;
  onFacturar: () => void;
}

export default function FacturaModal({
  open,
  onClose,
  venta,
  cliente,
  onEmailChange,
  onFacturar,
}: FacturaModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white shadow-xl p-6 rounded-xl w-[400px] relative">

        <h2 className="text-xl font-bold mb-4">
          Facturar venta #{venta?.receipt_id}
        </h2>

        {/* DATOS DEL CLIENTE */}
        <div className="mb-4">
          <p className="text-sm mb-1 font-semibold">Cliente:</p>
          <p>{cliente?.name || "Consumidor Final"}</p>

          <p className="text-sm mt-3 font-semibold">Email:</p>
          <input
            type="email"
            className="border p-2 rounded w-full"
            value={cliente?.email || ""}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="cliente@example.com"
          />

          <p className="text-sm mt-3 font-semibold">Teléfono:</p>
          <p>{cliente?.phone || "-"}</p>
        </div>

        {/* BOTONES */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            onClick={onClose}
          >
            Cancelar
          </button>

          <button
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            onClick={onFacturar}
          >
            Generar factura
          </button>
        </div>
      </div>
    </div>
  );
}
