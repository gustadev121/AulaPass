"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { identifierSchema } from "../lib/validations";

type ScreenState = "IDLE" | "GREEN" | "AMBER" | "BLUE" | "RED";

interface Teacher {
  code: string;
  name: string;
}

export default function KioskScreen({
  onTeacherLogin,
}: {
  onTeacherLogin: (teacherData: Teacher) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const [screenState, setScreenState] = useState<ScreenState>("IDLE");
  const [message, setMessage] = useState("Ingrese su CUI o DNI");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginCode, setLoginCode] = useState("");
  const [loginError, setLoginError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const loginInputRef = useRef<HTMLInputElement>(null);

  // Auto-enfoque persistente (RF-01)
  useEffect(() => {
    if (screenState === "IDLE" && !isLoginModalOpen) {
      inputRef.current?.focus();
    }
  }, [screenState, isLoginModalOpen]);

  // Focus login input when modal opens
  useEffect(() => {
    if (isLoginModalOpen) {
      setTimeout(() => loginInputRef.current?.focus(), 100);
    }
  }, [isLoginModalOpen]);

  // Temporizador de 3 segundos (RF-16)
  useEffect(() => {
    if (screenState !== "IDLE") {
      const timer = setTimeout(() => {
        setScreenState("IDLE");
        setInputValue("");
        setMessage("Ingrese su CUI o DNI");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [screenState]);

  // Polling de inasistencia docente (RF-08)
  useEffect(() => {
    const checkAbsence = async () => {
      try {
        const response = await fetch("/api/teacher/session/check-absence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ maxTeacherDelayMinutes: 20 }),
        });
        const data = await response.json();

        if (data.suspended) {
          setScreenState("RED");
          setMessage("Clase Suspendida: Inasistencia Docente");
        }
      } catch (_error) {
        // Silently fail polling
      }
    };

    const interval = setInterval(checkAbsence, 60000); // Cada 60 segundos
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = identifierSchema.safeParse(inputValue);
    if (!validation.success) {
      setScreenState("RED");
      setMessage("Formato inválido. Ingrese 8 dígitos numéricos.");
      return;
    }

    try {
      const response = await fetch("/api/kiosk/swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ DniCui: inputValue }),
      });

      const data = await response.json();

      if (data.color) {
        setScreenState(data.color as ScreenState);
      } else {
        setScreenState(data.success ? "GREEN" : "RED");
      }

      setMessage(
        data.message ||
          (data.success ? "Registro exitoso" : "Error en el registro"),
      );

      if (data.role === "TEACHER") {
        console.log("Docente detectado:", data.name);
      }
    } catch (_error) {
      setScreenState("RED");
      setMessage("Error de conexión con el servidor.");
    }
  };

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    try {
      const response = await fetch("/api/kiosk/swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ DniCui: loginCode }),
      });

      const data = await response.json();

      if (data.success && data.role === "TEACHER") {
        onTeacherLogin(data);
      } else {
        setLoginError("Identificador no válido para acceso docente.");
      }
    } catch (_error) {
      setLoginError("Error de conexión.");
    }
  };

  const bgColors = {
    IDLE: "bg-gray-50 text-gray-900",
    GREEN: "bg-green-500 text-white",
    AMBER: "bg-amber-500 text-white",
    BLUE: "bg-blue-500 text-white",
    RED: "bg-red-500 text-white",
  };

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center transition-colors duration-200 ${bgColors[screenState]}`}
    >
      <button
        type="button"
        onClick={() => setIsLoginModalOpen(true)}
        className="absolute bottom-4 right-4 w-8 h-8 opacity-10 hover:opacity-100 transition-opacity text-gray-400 focus:outline-none"
        title="Acceso Docente"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
          role="img"
          aria-labelledby="lock-icon-title"
        >
          <title id="lock-icon-title">Acceso Docente</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25-2.25v6.75a2.25 2.25 0 002.25 2.25z"
          />
        </svg>
      </button>

      {isLoginModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md text-gray-900">
            <h2 className="text-2xl font-bold mb-4">Acceso Docente</h2>
            <form onSubmit={handleTeacherLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="teacher-code"
                  className="block text-sm font-medium text-gray-700"
                >
                  CUI o DNI del Docente
                </label>
                <input
                  id="teacher-code"
                  ref={loginInputRef}
                  type="text"
                  value={loginCode}
                  onChange={(e) => setLoginCode(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-2xl p-3"
                  placeholder="12345678"
                />
              </div>
              {loginError && (
                <p className="text-red-600 text-sm">{loginError}</p>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Ingresar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="text-center space-y-8">
        <h1 className="text-6xl font-bold tracking-tight">{message}</h1>

        {screenState === "IDLE" && (
          <form onSubmit={handleSubmit} className="mt-8">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={screenState !== "IDLE"}
              className="text-center text-5xl p-6 border-4 border-gray-300 rounded-2xl shadow-lg focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-200 w-full max-w-lg transition-all"
              placeholder="12345678"
              maxLength={8}
              autoComplete="off"
            />
            <button type="submit" className="hidden">
              Registrar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
