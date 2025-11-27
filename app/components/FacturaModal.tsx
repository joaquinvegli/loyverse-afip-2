"use client";

export default function FacturaModal({
  open,
  onClose,
  venta,
  cliente,
  onEmailChange,
  onFacturar,
}) {
  if (!open) return null;

  const items = venta?.items || [];
  const total = venta?.total || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white w-full max-w-md rounded-lg shadow-lg p-6 relative">

        {/* Cerrar modal */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          ✖
        </button>

        <h2 className="text-xl font-bold mb-4">Facturar Venta #{venta?.receipt_id}</h2>

        {/* Cliente */}
        <div className="mb-3">
          <label className="block text-sm font-semibold">Cliente:</label>
          <p className="text-gray-800">
            {cliente?.name || "Consumidor Final"}
          </p>
        </div>

        {/* DNI */}
        <div className="mb-3">
          <label className="block text-sm font-semibold">DNI:</label>
          <input
            type="text"
            value={cliente?.dni || ""}
            readOnly
            className="w-full border rounded p-2 bg-gray-100"
          />
        </div>

        {/* Email editable */}
        <div className="mb-3">
          <label className="block text-sm font-semibold">Email (para enviar factura):</label>
          <input
            type="email"
            value={cliente?.email || ""}
            onChange={(e) => onEmailChange(e.target.value)}
            className="w-full border rounded p-2"
            placeholder="example@gmail.com"
          />
        </div>

        {/* Teléfono */}
        <div className="mb-3">
          <label className="block text-sm font-semibold">Teléfono:</label>
          <input
            type="text"
            value={cliente?.phone || ""}
            readOnly
            className="w-full border rounded p-2 bg-gray-100"
          />
        </div>

        {/* Items */}
        <div className="mb-3">
          <label className="block text-sm font-semibold">Productos:</label>

          <div className="border rounded p-2 max-h-32 overflow-y-auto bg-gray-50">
            {items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm border-b py-1">
                <span>{item.nombre}</span>
                <span>{item.cantidad} x ${item.precio_unitario}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="mb-4">
          <p className="text-lg font-semibold">
            Total: <span className="text-green-700">${total}</span>
          </p>
        </div>

        {/* Botón Facturar */}
        <button
          onClick={onFacturar}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Generar Factura
        </button>

      </div>
    </div>
  );
}
