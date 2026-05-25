"use client";

import type React from "react";
import { useCallback, useEffect, useState } from "react";

interface AttendanceRecord {
  id: string;
  studentCui: string;
  name?: string; // Vendrá del UniversityService en un mundo ideal, pero aquí lo manejamos
  checkIn: string;
  status: "PUNTUAL" | "TARDANZA" | "FALTA" | "AMBIENTE_ESTUDIO";
}

interface Session {
  id: string;
  groupId: string;
  date: string;
  expectedStart: string;
  expectedEnd: string;
  teacherCheckIn?: string | null;
  status: "ACTIVE" | "CLOSED" | "SUSPENDED";
  toleranceType: "STATIC" | "DYNAMIC";
  toleranceLimit?: string | null;
  virtualCode?: string | null;
}

interface Group {
  id: string;
  courseId: string;
  courseName: string;
  teacherCode: string;
  classroom?: string;
}

interface TeacherPanelProps {
  teacherData: {
    code: string;
    name: string;
  };
  onLogout: () => void;
}

export default function TeacherPanel({
  teacherData,
  onLogout,
}: TeacherPanelProps) {
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [toleranceMode, setToleranceMode] = useState<"STATIC" | "DYNAMIC">(
    "STATIC",
  );
  const [toleranceMinutes, setToleranceMinutes] = useState(15);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [newStudentCui, setNewStudentCui] = useState("");
  const [newStatus, setNewStatus] =
    useState<AttendanceRecord["status"]>("FALTA");
  const [newReason, setNewReason] = useState("Registro manual por docente");

  const [searchTerm, setSearchTerm] = useState("");

  const fetchSessionData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/teacher/session?teacherCode=${teacherData.code}`,
      );
      const data = await response.json();
      if (data.group) {
        setGroup(data.group);
      }
      if (data.active) {
        setActiveSession(data.session);
        setAttendances(data.attendances);
        setToleranceMode(data.session.toleranceType);
        // Podríamos inferir los minutos si tuviéramos ese dato guardado,
        // por ahora dejamos el default de 15.
      }
    } catch (_error) {
      // console.error("Error fetching session:", error);
    } finally {
      setIsLoading(false);
    }
  }, [teacherData.code]);

  useEffect(() => {
    fetchSessionData();
  }, [fetchSessionData]);

  const handleUpdateConfig = async () => {
    try {
      const response = await fetch("/api/teacher/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: activeSession ? activeSession.groupId : group?.id,
          toleranceType: toleranceMode,
          toleranceMinutes: toleranceMinutes,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setMessage(
          activeSession
            ? "Configuración actualizada."
            : "Sesión iniciada manualmente.",
        );
        setActiveSession(data.session);
        if (data.session.toleranceType) {
          setToleranceMode(data.session.toleranceType);
        }
      } else {
        setMessage(data.message || "Error al procesar solicitud.");
      }
    } catch (_error) {
      setMessage("Error al actualizar configuración.");
    }
  };

  const handleStatusChange = async (
    studentCui: string,
    newStatus: AttendanceRecord["status"],
    studentName?: string,
  ) => {
    if (!activeSession) {
      setMessage("No hay sesión activa.");
      return;
    }
    try {
      const response = await fetch("/api/teacher/attendance/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "UPDATE",
          studentCui,
          sessionId: activeSession.id,
          newStatus,
          reason: "Corrección manual por docente",
          actorCode: teacherData.code,
        }),
      });
      const data = await response.json();
      if (data.success) {
        fetchSessionData(); // Recargar datos
        setMessage(`Estado de ${studentName || studentCui} actualizado.`);
      }
    } catch (_error) {
      setMessage("Error al actualizar estado.");
    }
  };

  const handleDeleteAttendance = async (
    studentCui: string,
    studentName?: string,
  ) => {
    if (!activeSession) {
      setMessage("No hay sesión activa.");
      return;
    }
    if (
      !confirm(`¿Desea anular la asistencia de ${studentName || studentCui}?`)
    )
      return;

    try {
      const response = await fetch("/api/teacher/attendance/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "DELETE",
          studentCui,
          sessionId: activeSession.id,
          reason: "Anulación manual por docente",
          actorCode: teacherData.code,
        }),
      });
      const data = await response.json();
      if (data.success) {
        fetchSessionData();
        setMessage(`Registro de ${studentName || studentCui} anulado.`);
      } else {
        setMessage(data.message || "Error al anular registro.");
      }
    } catch (_error) {
      setMessage("Error al anular registro.");
    }
  };

  const filteredAttendances = attendances.filter(
    (a) =>
      a.studentCui.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.name || "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleCreateAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) {
      setMessage("No hay sesión activa.");
      return;
    }

    try {
      const response = await fetch("/api/teacher/attendance/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "CREATE",
          studentCui: newStudentCui,
          sessionId: activeSession.id,
          newStatus,
          reason: newReason,
          actorCode: teacherData.code,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setNewStudentCui("");
        setNewStatus("FALTA");
        setNewReason("Registro manual por docente");
        fetchSessionData();
        setMessage(`Registro creado para ${newStudentCui}.`);
      } else {
        setMessage(data.message || "Error al crear registro.");
      }
    } catch (_error) {
      setMessage("Error al crear registro.");
    }
  };

  const handleCloseSession = async () => {
    if (!activeSession) {
      setMessage("No hay sesión activa.");
      return;
    }
    if (
      !confirm(
        "¿Está seguro de FINALIZAR la clase? \n\nEsto cerrará el registro de asistencia y marcará la salida automática de los alumnos presentes. \n\nSi solo desea salir del panel sin terminar la clase, use 'Volver al Kiosko'.",
      )
    )
      return;

    try {
      const response = await fetch("/api/teacher/session/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeSession?.id }),
      });
      const data = await response.json();
      if (data.success) {
        onLogout();
      }
    } catch (_error) {
      setMessage("Error al cerrar sesión.");
    }
  };

  const handleActivateVirtual = async () => {
    try {
      const response = await fetch("/api/teacher/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ virtualMode: true }),
      });
      const data = await response.json();
      if (data.success) {
        setActiveSession(data.session);
        setMessage("Modo virtual activado.");
      }
    } catch (_error) {
      setMessage("Error al activar modo virtual.");
    }
  };

  if (isLoading)
    return (
      <div className="p-8 text-center text-2xl font-bold">
        Cargando Panel Docente...
      </div>
    );

  return (
    <div className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen text-gray-900">
      <header className="mb-8 flex justify-between items-end border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Panel Docente - AulaPass
          </h1>
          <p className="text-gray-500 mt-1">
            Docente: {teacherData.name} | Curso: {group?.courseId || "N/A"} -{" "}
            {group?.courseName || "N/A"} | Aula: {group?.classroom || "101"}
          </p>
          {message && (
            <p className="text-blue-600 font-semibold mt-2">{message}</p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
            title="Regresa a la pantalla principal sin terminar la clase actual"
          >
            Volver al Kiosko
          </button>
          <button
            type="button"
            onClick={handleCloseSession}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
            title="Finaliza la clase actual y registra la salida de todos los alumnos"
          >
            Finalizar Clase
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Tarjeta de Configuración de Tolerancia (RF-07) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 col-span-1">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">
            Ajustes de Tolerancia y Sesión
          </h2>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="tolerance-mode"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Criterio de Tolerancia
              </label>
              <select
                id="tolerance-mode"
                value={toleranceMode}
                onChange={(e) =>
                  setToleranceMode(e.target.value as "STATIC" | "DYNAMIC")
                }
                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="STATIC">Estática (Desde inicio oficial)</option>
                <option value="DYNAMIC">Dinámica (Desde mi ingreso)</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="tolerance-minutes"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Minutos Permitidos
              </label>
              <input
                id="tolerance-minutes"
                type="number"
                value={toleranceMinutes}
                onChange={(e) =>
                  setToleranceMinutes(Number.parseInt(e.target.value, 10))
                }
                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                min="0"
                max="60"
              />
            </div>
            <button
              type="button"
              onClick={handleUpdateConfig}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Aplicar Ajustes
            </button>
          </div>
        </div>

        {/* Métrica rápida */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 col-span-2 flex items-center justify-around text-center">
          <div>
            <p className="text-sm text-gray-500 uppercase tracking-wide">
              Asistentes
            </p>
            <p className="text-4xl font-bold text-green-600">
              {attendances.filter((a) => a.status === "PUNTUAL").length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 uppercase tracking-wide">
              Tardanzas
            </p>
            <p className="text-4xl font-bold text-amber-600">
              {attendances.filter((a) => a.status === "TARDANZA").length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 uppercase tracking-wide">
              Faltas
            </p>
            <p className="text-4xl font-bold text-red-600">
              {attendances.filter((a) => a.status === "FALTA").length}
            </p>
          </div>
          <div className="border-l pl-6">
            <p className="text-sm text-gray-500 uppercase tracking-wide">
              Modo Contingencia
            </p>
            {activeSession?.virtualCode ? (
              <div className="mt-2">
                <p className="text-2xl font-mono font-bold text-purple-600">
                  {activeSession.virtualCode}
                </p>
                <p className="text-xs text-gray-400">Código de Acceso Remoto</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleActivateVirtual}
                className="mt-2 px-4 py-1 text-sm border border-purple-600 text-purple-600 rounded-md hover:bg-purple-50 font-medium"
                title="Habilita un código para que los alumnos marquen asistencia desde sus dispositivos si el QR físico falla"
              >
                Habilitar Código Virtual
              </button>
            )}
          </div>
        </div>

        {/* Alta rápida de asistencia manual (RF-14) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 col-span-1 md:col-span-3">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">
            Registro Manual de Asistencia (Excepción/Contingencia)
          </h2>
          <form
            onSubmit={handleCreateAttendance}
            className="grid grid-cols-1 md:grid-cols-4 gap-4"
          >
            <input
              type="text"
              value={newStudentCui}
              onChange={(e) => setNewStudentCui(e.target.value)}
              placeholder="CUI del Alumno (8 dígitos)"
              className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
              maxLength={8}
              required
            />
            <select
              value={newStatus}
              onChange={(e) =>
                setNewStatus(e.target.value as AttendanceRecord["status"])
              }
              className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="PUNTUAL">Presente (Puntual)</option>
              <option value="TARDANZA">Tardanza</option>
              <option value="FALTA">Falta</option>
              <option value="AMBIENTE_ESTUDIO">Ambiente de Estudio</option>
            </select>
            <input
              type="text"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="Justificación del registro manual"
              className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <button
              type="submit"
              className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition font-medium"
            >
              Registrar Asistencia
            </button>
          </form>
        </div>
      </section>

      {/* Cuadrícula de Modificación de Asistencia (RF-14) */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-700">
            Control Detallado de Asistencia
          </h2>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={fetchSessionData}
              className="text-sm text-blue-600 hover:underline font-medium"
            >
              Refrescar Lista
            </button>
            <input
              type="text"
              placeholder="Filtrar por CUI o Nombre..."
              className="border-gray-300 rounded-lg text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-100 text-gray-700 uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">CUI</th>
                <th className="px-6 py-4">Estudiante</th>
                <th className="px-6 py-4">Hora de Registro</th>
                <th className="px-6 py-4">Estado Actual</th>
                <th className="px-6 py-4">Acciones de Corrección</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAttendances.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {record.studentCui}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {record.name || "Sin nombre registrado"}
                  </td>
                  <td className="px-6 py-4">
                    {new Date(record.checkIn).toLocaleTimeString()}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${
                        record.status === "PUNTUAL"
                          ? "bg-green-100 text-green-700"
                          : record.status === "TARDANZA"
                            ? "bg-amber-100 text-amber-700"
                            : record.status === "FALTA"
                              ? "bg-red-100 text-red-700"
                              : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <select
                        value={record.status}
                        onChange={(e) =>
                          handleStatusChange(
                            record.studentCui,
                            e.target.value as AttendanceRecord["status"],
                            record.name,
                          )
                        }
                        className="text-sm border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        title="Cambiar estado de asistencia manualmente"
                      >
                        <option value="PUNTUAL">Puntual</option>
                        <option value="TARDANZA">Tardanza</option>
                        <option value="FALTA">Falta</option>
                        <option value="AMBIENTE_ESTUDIO">
                          Ambiente de Estudio
                        </option>
                      </select>
                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteAttendance(record.studentCui, record.name)
                        }
                        className="text-sm text-red-600 hover:underline font-medium"
                        title="Eliminar este registro de asistencia permanentemente"
                      >
                        Anular
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredAttendances.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No se encontraron marcaciones para los criterios de
                    búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
