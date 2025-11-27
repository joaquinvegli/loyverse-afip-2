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
