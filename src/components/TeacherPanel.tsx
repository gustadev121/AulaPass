"use client";

import type React from "react";
import { useCallback, useEffect, useState } from "react";

interface AttendanceRecord {
  id: string;
  studentCui: string;
  name?: string;
  checkIn: string;
  status: "PUNTUAL" | "TARDANZA" | "FALTA" | "AMBIENTE_ESTUDIO";
  observation?: string | null;
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
  toleranceMinutes: string;
  toleranceLimit?: string | null;
}

interface GroupConfig {
  toleranceType: "STATIC" | "DYNAMIC";
  toleranceMinutes: string;
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
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [availableSessions, setAvailableSessions] = useState<Session[]>([]);
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

  const fetchSessionData = useCallback(
    async (selectedGroupId?: string, selectedSessionId?: string) => {
      setIsLoading(true);
      try {
        let url = `/api/teacher/session?teacherCode=${teacherData.code}`;
        if (selectedGroupId) url += `&groupId=${selectedGroupId}`;
        if (selectedSessionId) url += `&sessionId=${selectedSessionId}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.groups) {
          setGroups(data.groups);
        }
        if (data.group) {
          setGroup(data.group);
        }
        if (data.sessions) {
          setAvailableSessions(data.sessions);
        }

        setSelectedSession(data.session || null);
        setAttendances(data.attendances || []);

        if (data.session) {
          setToleranceMode(data.session.toleranceType);
          setToleranceMinutes(Number.parseInt(data.session.toleranceMinutes));
        } else if (data.config) {
          setToleranceMode(data.config.toleranceType);
          setToleranceMinutes(Number.parseInt(data.config.toleranceMinutes));
        }
      } catch (_error) {
        setMessage("Error al cargar datos del panel.");
      } finally {
        setIsLoading(false);
      }
    },
    [teacherData.code],
  );

  useEffect(() => {
    fetchSessionData();
  }, [fetchSessionData]);

  const handleGroupChange = (newGroupId: string) => {
    fetchSessionData(newGroupId);
  };

  const handleSessionChange = (newSessionId: string) => {
    fetchSessionData(group?.id, newSessionId);
  };

  const handleUpdateConfig = async () => {
    try {
      const response = await fetch("/api/teacher/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: selectedSession ? selectedSession.groupId : group?.id,
          toleranceType: toleranceMode,
          toleranceMinutes: toleranceMinutes,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setMessage(
          isCurrentSessionActive
            ? "Configuración de sesión actualizada."
            : "Configuración predeterminada actualizada.",
        );
        if (data.session) {
          setSelectedSession(data.session);
          if (data.session.toleranceType) {
            setToleranceMode(data.session.toleranceType);
          }
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
    if (!selectedSession) {
      setMessage("No hay sesión seleccionada.");
      return;
    }
    try {
      const response = await fetch("/api/teacher/attendance/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "UPDATE",
          studentCui,
          sessionId: selectedSession.id,
          newStatus,
          reason: "Corrección manual por docente",
          actorCode: teacherData.code,
        }),
      });
      const data = await response.json();
      if (data.success) {
        fetchSessionData(group?.id, selectedSession.id); // Recargar datos de la misma sesión
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
    if (!selectedSession) {
      setMessage("No hay sesión seleccionada.");
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
          sessionId: selectedSession.id,
          reason: "Anulación manual por docente",
          actorCode: teacherData.code,
        }),
      });
      const data = await response.json();
      if (data.success) {
        fetchSessionData(group?.id, selectedSession.id);
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
    if (!selectedSession) {
      setMessage("No hay sesión seleccionada.");
      return;
    }

    try {
      const response = await fetch("/api/teacher/attendance/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "CREATE",
          studentCui: newStudentCui,
          sessionId: selectedSession.id,
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
        fetchSessionData(group?.id, selectedSession.id);
        setMessage(`Registro creado para ${newStudentCui}.`);
      } else {
        setMessage(data.message || "Error al crear registro.");
      }
    } catch (_error) {
      setMessage("Error al crear registro.");
    }
  };

  if (isLoading)
    return (
      <div className="p-8 text-center text-2xl font-bold">
        Cargando Panel Docente...
      </div>
    );

  const isCurrentSessionActive = selectedSession?.status === "ACTIVE";

  return (
    <div className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen text-gray-900">
      <header className="mb-8 flex justify-between items-end border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Panel Docente - AulaPass
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <div>
              <label
                htmlFor="group-select"
                className="block text-xs font-medium text-gray-500 uppercase"
              >
                Grupo a Gestionar
              </label>
              <select
                id="group-select"
                value={group?.id || ""}
                onChange={(e) => handleGroupChange(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm py-1"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.courseId} - {g.courseName} ({g.id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">
                Aula
              </p>
              <p className="text-sm font-semibold text-gray-700">
                {group?.classroom || "101"}
              </p>
            </div>
          </div>
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
                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
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
                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                min="0"
                max="60"
              />
            </div>
            <button
              type="button"
              onClick={handleUpdateConfig}
              className="w-full py-2 rounded-lg transition bg-blue-600 text-white hover:bg-blue-700"
            >
              {isCurrentSessionActive
                ? "Aplicar a Sesión"
                : "Guardar Configuración"}
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
        </div>

        {/* Alta rápida de asistencia manual (RF-14) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 col-span-1 md:col-span-3">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-700">
              Registro Manual de Asistencia (Excepción/Contingencia)
            </h2>
            {selectedSession && (
              <span
                className={`px-3 py-1 rounded-lg text-sm font-bold ${
                  isCurrentSessionActive
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                }`}
                suppressHydrationWarning
              >
                {isCurrentSessionActive
                  ? "Sesión Activa"
                  : `Sesión: ${new Date(selectedSession.date).toLocaleDateString()} ${new Date(selectedSession.expectedStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
              </span>
            )}
          </div>
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
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-700">
              Control Detallado de Asistencia
            </h2>
            <div className="flex items-center gap-2">
              <label
                htmlFor="session-select"
                className="text-xs font-medium text-gray-500 uppercase"
              >
                Sesión:
              </label>
              <select
                id="session-select"
                value={selectedSession?.id || ""}
                onChange={(e) => handleSessionChange(e.target.value)}
                className="text-sm border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 py-1"
              >
                {availableSessions.length === 0 && (
                  <option value="">Sin sesiones registradas</option>
                )}
                {availableSessions.map((s) => (
                  <option key={s.id} value={s.id} suppressHydrationWarning>
                    {new Date(s.date).toLocaleDateString()} -{" "}
                    {new Date(s.expectedStart).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    ({s.status})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => fetchSessionData(group?.id, selectedSession?.id)}
              className="text-sm text-blue-600 hover:underline font-medium"
            >
              Refrescar
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
                <th className="px-6 py-4">Motivo / Obs.</th>
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
                  <td className="px-6 py-4" suppressHydrationWarning>
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
                  <td
                    className="px-6 py-4 italic text-xs text-gray-500 max-w-xs truncate"
                    title={record.observation || ""}
                  >
                    {record.observation || "-"}
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
                    colSpan={6}
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
