'use client';

import React, { useState, useRef, useEffect } from 'react';
import { identifierSchema } from '../lib/validations';

type ScreenState = 'IDLE' | 'GREEN' | 'AMBER' | 'BLUE' | 'RED';

export default function KioskScreen() {
  const [inputValue, setInputValue] = useState('');
  const [screenState, setScreenState] = useState<ScreenState>('IDLE');
  const [message, setMessage] = useState('Ingrese su CUI o DNI');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-enfoque persistente (RF-01)
  useEffect(() => {
    if (screenState === 'IDLE') {
      inputRef.current?.focus();
    }
  }, [screenState]);

  // Temporizador de 3 segundos (RF-16)
  useEffect(() => {
    if (screenState !== 'IDLE') {
      const timer = setTimeout(() => {
        setScreenState('IDLE');
        setInputValue('');
        setMessage('Ingrese su CUI o DNI');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [screenState]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validación estricta en cliente (RF-03)
    const validation = identifierSchema.safeParse(inputValue);
    if (!validation.success) {
      setScreenState('RED');
      setMessage('Formato inválido. Ingrese 8 dígitos numéricos.');
      return;
    }

    // Aquí iría la llamada al endpoint del Integrante 2 (fetch).
    // Simulamos la respuesta visual para probar el motor de estados.
    const mockResponseStatus: ScreenState = 'GREEN'; // Cambiar para probar: GREEN, AMBER, BLUE, RED
    
    setScreenState(mockResponseStatus);
    
    const messages = {
      GREEN: 'Registro exitoso: Puntual',
      AMBER: 'Registro exitoso: Tardanza',
      BLUE: 'Registro de Salida / Ambiente de Estudio',
      RED: 'Error: No matriculado o Falta',
      IDLE: ''
    };
    setMessage(messages[mockResponseStatus]);
  };

  // Diccionario de colores (RF-15)
  const bgColors = {
    IDLE: 'bg-gray-50 text-gray-900',
    GREEN: 'bg-green-500 text-white',
    AMBER: 'bg-amber-500 text-white',
    BLUE: 'bg-blue-500 text-white',
    RED: 'bg-red-500 text-white',
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center transition-colors duration-200 ${bgColors[screenState]}`}>
      <div className="text-center space-y-8">
        <h1 className="text-6xl font-bold tracking-tight">{message}</h1>
        
        {screenState === 'IDLE' && (
          <form onSubmit={handleSubmit} className="mt-8">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={screenState !== 'IDLE'}
              className="text-center text-5xl p-6 border-4 border-gray-300 rounded-2xl shadow-lg focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-200 w-full max-w-lg transition-all"
              placeholder="12345678"
              maxLength={8}
              autoComplete="off"
            />
            {/* Ocultamos el botón físico para incentivar el uso de lector de barras o tecla Enter */}
            <button type="submit" className="hidden">Registrar</button>
          </form>
        )}
      </div>
    </div>
  );
}