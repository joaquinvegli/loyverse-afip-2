import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function backendUrl() {
  return process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
}

function adminKey() {
  return process.env.ADMIN_API_KEY;
}

export async function POST(req: NextRequest) {
  const backend = backendUrl();
  const key = adminKey();
  if (!backend || !key) {
    return NextResponse.json({ detail: "Faltan BACKEND_URL/ADMIN_API_KEY en Vercel." }, { status: 503 });
  }

  const body = await req.text();
  const resp = await fetch(`${backend}/api/admin/sueldos/override`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Admin-Key": key },
    body,
    cache: "no-store",
  });
  const text = await resp.text();
  return new NextResponse(text, {
    status: resp.status,
    headers: { "Content-Type": resp.headers.get("content-type") || "application/json" },
  });
}
