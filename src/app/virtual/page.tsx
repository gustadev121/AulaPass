"use client";

import type React from "react";
import { useState } from "react";

export default function VirtualSwipePage() {
  const [cui, setCui] = useState("");
  const [virtualCode, setVirtualCode] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"IDLE" | "SUCCESS" | "ERROR">("IDLE");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    setStatus("IDLE");

    try {
      const response = await fetch("/api/virtual/swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ DniCui: cui, virtualCode: virtualCode }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus("SUCCESS");
        setMessage(data.message);
        setCui("");
        setVirtualCode("");
      } else {
        setStatus("ERROR");
        setMessage(data.message);
      }
    } catch (_error) {
      setStatus("ERROR");
      setMessage("Error de conexión con el servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          AulaPass Virtual
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Registro de Asistencia por Contingencia
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="cui-input"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              CUI (8 dígitos)
            </label>
            <input
              id="cui-input"
              type="text"
              value={cui}
              onChange={(e) => setCui(e.target.value)}
              className="w-full text-gray-700 text-center text-2xl p-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500"
              placeholder="20210001"
              maxLength={8}
              required
            />
          </div>

          <div>
            <label
              htmlFor="session-code"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Código de Sesión (6 dígitos)
            </label>
            <input
              id="session-code"
              type="text"
              value={virtualCode}
              onChange={(e) => setVirtualCode(e.target.value)}
              className="w-full text-center text-2xl p-3 border text-gray-700 border-gray-300 rounded-xl focus:ring-purple-500 focus:border-purple-500 font-mono"
              placeholder="000000"
              maxLength={6}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-4 rounded-xl text-white font-bold text-xl transition shadow-lg ${
              isLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isLoading ? "Registrando..." : "Registrar Asistencia"}
          </button>
        </form>

        {message && (
          <div
            className={`mt-6 p-4 rounded-xl text-center font-semibold ${
              status === "SUCCESS"
                ? "bg-green-100 text-green-700 border border-green-200"
                : "bg-red-100 text-red-700 border border-red-200"
            }`}
          >
            {message}
          </div>
        )}

        <div className="mt-8 text-center text-xs text-gray-400">
          <p>Solo use este modo si el docente lo indica.</p>
          <p>Su ubicación y dispositivo pueden ser registrados.</p>
        </div>
      </div>
    </div>
  );
}
