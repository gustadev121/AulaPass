'use client';

import React, { useState } from 'react';

// Interfaces basadas en el Starter Kit
interface AttendanceRecord {
  id: string;
  cui: string;
  name: string;
  time: string;
  status: 'Puntual' | 'Tardanza' | 'Falta' | 'Estudio';
}

export default function TeacherPanel() {
  const [toleranceMode, setToleranceMode] = useState<'Estática' | 'Dinámica'>('Estática');
  
  // Data mockeada (hasta que el Integrante 2 conecte la API)
  const [records, setRecords] = useState<AttendanceRecord[]>([
    { id: '1', cui: '20210001', name: 'Ana Flores', time: '07:55 AM', status: 'Puntual' },
    { id: '2', cui: '20210002', name: 'Carlos Mendoza', time: '08:10 AM', status: 'Tardanza' },
    { id: '3', cui: '20210003', name: 'Luis Paredes', time: '08:25 AM', status: 'Falta' },
  ]);

  const handleStatusChange = (id: string, newStatus: AttendanceRecord['status']) => {
    // Aquí se enviaría la actualización al backend (RF-14: Auditoría)
    setRecords(records.map(rec => rec.id === id ? { ...rec, status: newStatus } : rec));
  };

  return (
    <div className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <header className="mb-8 flex justify-between items-end border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Panel Docente - AulaPass</h1>
          <p className="text-gray-500 mt-1">Curso: Ingeniería de Software II | Aula: 104-B</p>
        </div>
        <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
          Cerrar Sesión
        </button>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Tarjeta de Configuración de Tolerancia (RF-07) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 col-span-1">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Configuración de Sesión</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Modo de Tolerancia</label>
              <select 
                value={toleranceMode}
                onChange={(e) => setToleranceMode(e.target.value as 'Estática' | 'Dinámica')}
                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Estática">Estática (Desde inicio oficial)</option>
                <option value="Dinámica">Dinámica (Desde mi ingreso)</option>
              </select>
            </div>
            <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">
              Guardar Configuración
            </button>
          </div>
        </div>

        {/* Métrica rápida */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 col-span-2 flex items-center justify-around text-center">
          <div>
            <p className="text-sm text-gray-500 uppercase tracking-wide">Asistentes</p>
            <p className="text-4xl font-bold text-green-600">24</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 uppercase tracking-wide">Faltas</p>
            <p className="text-4xl font-bold text-red-600">3</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 uppercase tracking-wide">Contingencia</p>
            <button className="mt-2 px-4 py-1 text-sm border border-purple-600 text-purple-600 rounded-md hover:bg-purple-50">
              Activar QR (Virtual)
            </button>
          </div>
        </div>
      </section>

      {/* Cuadrícula de Modificación de Asistencia (RF-14) */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-700">Registro de Marcaciones</h2>
          <input type="text" placeholder="Buscar CUI..." className="border-gray-300 rounded-lg text-sm" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-100 text-gray-700 uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">CUI</th>
                <th className="px-6 py-4">Alumno</th>
                <th className="px-6 py-4">Hora</th>
                <th className="px-6 py-4">Estado Original</th>
                <th className="px-6 py-4">Acción / Corrección</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-900">{record.cui}</td>
                  <td className="px-6 py-4">{record.name}</td>
                  <td className="px-6 py-4">{record.time}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      record.status === 'Puntual' ? 'bg-green-100 text-green-700' :
                      record.status === 'Tardanza' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      value={record.status}
                      onChange={(e) => handleStatusChange(record.id, e.target.value as AttendanceRecord['status'])}
                      className="text-sm border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Puntual">Marcar Puntual</option>
                      <option value="Tardanza">Marcar Tardanza</option>
                      <option value="Falta">Marcar Falta</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}