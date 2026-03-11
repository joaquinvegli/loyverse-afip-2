// lib/api.ts

export interface ClienteData {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  dni?: string | null;
  cuit?: string | null;
  domicilio?: string | null;
}

export interface ItemData {
  nombre: string;
  cantidad: number;
  precio_unitario: number;
}

export interface FacturaRequest {
  receipt_id: string;
  cliente: ClienteData;
  items: ItemData[];
  total: number;
}

export async function fetchVentas(desde: string, hasta: string) {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ventas?desde=${desde}&hasta=${hasta}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("No se pudieron cargar ventas");
  return resp.json();
}

export async function fetchCliente(id: string) {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/clientes/${id}`;
  const resp = await fetch(url);
  if (!resp.ok) return null;
  return resp.json();
}

export async function facturarVenta(data: FacturaRequest) {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/facturar`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || "Error al facturar");
  }
  return resp.json();
}