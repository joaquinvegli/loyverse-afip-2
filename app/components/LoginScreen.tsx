"use client";

import { useState } from "react";

export default function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);

  function handleSubmit() {
    const correctPassword = process.env.NEXT_PUBLIC_APP_PASSWORD;
    if (password === correctPassword) {
      const expiry = Date.now() + 60 * 60 * 1000; // 1 hora
      localStorage.setItem("session_expiry", String(expiry));
      onLogin();
    } else {
      setError(true);
      setShaking(true);
      setPassword("");
      setTimeout(() => setShaking(false), 500);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSubmit();
  }

  return (
    <div className="min-h-screen bg-blue-900 flex flex-col items-center justify-center px-6">

      {/* LOGO */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <img
          src="https://raw.githubusercontent.com/joaquinvegli/loyverse-afip/refs/heads/main/static/logo_fixed.png"
          alt="Top Fundas"
          className="w-20 h-20 rounded-2xl object-contain bg-white p-2 shadow-lg"
        />
        <div className="text-center">
          <h1 className="text-white text-2xl font-bold tracking-tight">Top Fundas</h1>
          <p className="text-blue-300 text-sm mt-1">Sistema de facturación AFIP</p>
        </div>
      </div>

      {/* CARD LOGIN */}
      <div className={`bg-white rounded-2xl shadow-2xl p-7 w-full max-w-sm transition ${shaking ? "animate-bounce" : ""}`}>
        <h2 className="text-gray-800 text-lg font-semibold mb-1">Acceso</h2>
        <p className="text-gray-400 text-sm mb-5">Ingresá la contraseña para continuar</p>

        <input
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(false); }}
          onKeyDown={handleKey}
          placeholder="Contraseña"
          autoFocus
          className={`w-full px-4 py-3 border-2 rounded-xl text-base focus:outline-none transition ${
            error
              ? "border-red-400 bg-red-50 focus:border-red-400"
              : "border-gray-200 focus:border-blue-500"
          }`}
        />

        {error && (
          <p className="text-red-500 text-sm mt-2">❌ Contraseña incorrecta</p>
        )}

        <button
          onClick={handleSubmit}
          className="mt-4 w-full py-3 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-semibold rounded-xl text-base transition"
        >
          Ingresar
        </button>
      </div>

      <p className="text-blue-400 text-xs mt-8">Top Fundas · Bahía Blanca</p>
    </div>
  );
}