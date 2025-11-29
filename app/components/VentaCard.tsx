"use client";

type FacturaModalProps = {
  open: boolean;
  onClose: () => void;
  venta: any;
  cliente: any;
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
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center">
      <div className="bg-white p-6 rounded shadow-xl w-96 relative">
        <button
          className="absolute right-2 top-2 text-gray-600"
          onClick={onClose}
        >
          ✕
        </button>

        <h2 className="text-xl font-bold mb-4">Confirmar Facturación</h2>

        <p className="mb-2">
          <span className="font-semibold">Cliente:</span>{" "}
          {cliente?.name || "Consumidor Final"}
        </p>

        <label className="block mb-3">
          <span className="text-sm font-semibold">Email (opcional):</span>
          <input
            type="email"
            value={cliente?.email || ""}
            onChange={(e) => onEmailChange(e.target.value)}
            className="border p-2 rounded w-full mt-1"
            placeholder="cliente@mail.com"
          />
        </label>

        <button
          onClick={onFacturar}
          className="mt-4 w-full py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Generar Factura
        </button>
      </div>
    </div>
  );
}
