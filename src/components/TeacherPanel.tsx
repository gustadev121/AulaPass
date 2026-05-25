'use client';

import React, { useState, useEffect } from 'react';

interface AttendanceRecord {
  id: string;
  studentCui: string;
  name?: string; // Vendrá del UniversityService en un mundo ideal, pero aquí lo manejamos
  checkIn: string;
  status: 'PUNTUAL' | 'TARDANZA' | 'FALTA' | 'AMBIENTE_ESTUDIO';
}

interface TeacherPanelProps {
  teacherData: {
    cui: string;
    name: string;
  };
  onLogout: () => void;
}

export default function TeacherPanel({ teacherData, onLogout }: TeacherPanelProps) {
  const [activeSession, setActiveSession] = useState<any>(null);
  const [group, setGroup] = useState<any>(null);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [toleranceMode, setToleranceMode] = useState<'STATIC' | 'DYNAMIC'>('STATIC');
  const [toleranceMinutes, setToleranceMinutes] = useState(15);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');

  const fetchSessionData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/teacher/session');
      const data = await response.json();
      if (data.active) {
        setActiveSession(data.session);
        setGroup(data.group);
        setAttendances(data.attendances);
        setToleranceMode(data.session.toleranceType);
        // Podríamos inferir los minutos si tuviéramos ese dato guardado,
        // por ahora dejamos el default de 15.
      }
    } catch (error) {
      console.error('Error fetching session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionData();
  }, []);

  const handleUpdateConfig = async () => {
    try {
      const response = await fetch('/api/teacher/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toleranceType: toleranceMode,
          toleranceMinutes: toleranceMinutes,
        })
      });
      const data = await response.json();
      if (data.success) {
        setMessage('Configuración actualizada.');
        setActiveSession(data.session);
      }
    } catch (error) {
      setMessage('Error al actualizar configuración.');
    }
  };

  const handleStatusChange = async (studentCui: string, newStatus: AttendanceRecord['status']) => {
    try {
      const response = await fetch('/api/teacher/attendance/correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentCui,
          sessionId: activeSession.id,
          newStatus,
          reason: 'Corrección manual por docente',
          actorCui: teacherData.cui
        })
      });
      const data = await response.json();
      if (data.success) {
        fetchSessionData(); // Recargar datos
        setMessage(`Estado de ${studentCui} actualizado.`);
      }
    } catch (error) {
      setMessage('Error al actualizar estado.');
    }
  };

  const handleCloseSession = async () => {
    if (!confirm('¿Está seguro de cerrar la sesión? Se registrará la salida automática de los alumnos.')) return;
    
    try {
      const response = await fetch('/api/teacher/session/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSession?.id })
      });
      const data = await response.json();
      if (data.success) {
        onLogout();
      }
    } catch (error) {
      setMessage('Error al cerrar sesión.');
    }
  };

  const handleActivateVirtual = async () => {
    try {
      const response = await fetch('/api/teacher/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ virtualMode: true })
      });
      const data = await response.json();
      if (data.success) {
        setActiveSession(data.session);
        setMessage('Modo virtual activado.');
      }
    } catch (error) {
      setMessage('Error al activar modo virtual.');
    }
  };

  if (isLoading) return <div className="p-8 text-center text-2xl font-bold">Cargando Panel Docente...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen text-gray-900">
      <header className="mb-8 flex justify-between items-end border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Panel Docente - AulaPass</h1>
          <p className="text-gray-500 mt-1">
            Docente: {teacherData.name} | 
            Curso: {group?.courseId || 'N/A'} - {group?.name || 'N/A'} | 
            Aula: {group?.classroom || 'N/A'}
          </p>
          {message && <p className="text-blue-600 font-semibold mt-2">{message}</p>}
        </div>
        <button 
          onClick={handleCloseSession}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
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
                onChange={(e) => setToleranceMode(e.target.value as 'STATIC' | 'DYNAMIC')}
                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="STATIC">Estática (Desde inicio oficial)</option>
                <option value="DYNAMIC">Dinámica (Desde mi ingreso)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Minutos de Tolerancia</label>
              <input 
                type="number" 
                value={toleranceMinutes}
                onChange={(e) => setToleranceMinutes(parseInt(e.target.value))}
                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                min="0"
                max="60"
              />
            </div>
            <button 
              onClick={handleUpdateConfig}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Guardar Configuración
            </button>
          </div>
        </div>

        {/* Métrica rápida */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 col-span-2 flex items-center justify-around text-center">
          <div>
            <p className="text-sm text-gray-500 uppercase tracking-wide">Asistentes</p>
            <p className="text-4xl font-bold text-green-600">{attendances.filter(a => a.status === 'PUNTUAL').length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 uppercase tracking-wide">Tardanzas</p>
            <p className="text-4xl font-bold text-amber-600">{attendances.filter(a => a.status === 'TARDANZA').length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 uppercase tracking-wide">Faltas</p>
            <p className="text-4xl font-bold text-red-600">{attendances.filter(a => a.status === 'FALTA').length}</p>
          </div>
          <div className="border-l pl-6">
            <p className="text-sm text-gray-500 uppercase tracking-wide">Contingencia</p>
            {activeSession?.virtualCode ? (
              <div className="mt-2">
                <p className="text-2xl font-mono font-bold text-purple-600">{activeSession.virtualCode}</p>
                <p className="text-xs text-gray-400">Código Virtual Activo</p>
              </div>
            ) : (
              <button 
                onClick={handleActivateVirtual}
                className="mt-2 px-4 py-1 text-sm border border-purple-600 text-purple-600 rounded-md hover:bg-purple-50"
              >
                Activar QR (Virtual)
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Cuadrícula de Modificación de Asistencia (RF-14) */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-700">Registro de Marcaciones</h2>
          <div className="flex space-x-2">
            <button onClick={fetchSessionData} className="text-sm text-blue-600 hover:underline">Actualizar Tabla</button>
            <input type="text" placeholder="Buscar CUI..." className="border-gray-300 rounded-lg text-sm" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-100 text-gray-700 uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">CUI</th>
                <th className="px-6 py-4">Hora Ingreso</th>
                <th className="px-6 py-4">Estado Actual</th>
                <th className="px-6 py-4">Acción / Corrección</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {attendances.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-900">{record.studentCui}</td>
                  <td className="px-6 py-4">{new Date(record.checkIn).toLocaleTimeString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      record.status === 'PUNTUAL' ? 'bg-green-100 text-green-700' :
                      record.status === 'TARDANZA' ? 'bg-amber-100 text-amber-700' :
                      record.status === 'FALTA' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      value={record.status}
                      onChange={(e) => handleStatusChange(record.studentCui, e.target.value as AttendanceRecord['status'])}
                      className="text-sm border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="PUNTUAL">Puntual</option>
                      <option value="TARDANZA">Tardanza</option>
                      <option value="FALTA">Falta</option>
                      <option value="AMBIENTE_ESTUDIO">Ambiente Estudio</option>
                    </select>
                  </td>
                </tr>
              ))}
              {attendances.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No hay marcaciones registradas aún.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}