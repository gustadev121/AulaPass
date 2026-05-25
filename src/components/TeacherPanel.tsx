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
          setToleranceMinutes(
            Number.parseInt(data.session.toleranceMinutes, 10),
          );
        } else if (data.config) {
          setToleranceMode(data.config.toleranceType);
          setToleranceMinutes(
            Number.parseInt(data.config.toleranceMinutes, 10),
          );
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
      </section>

      {/* --- SECCIÓN DE GESTIÓN DE ASISTENCIA --- */}
      <section className="mt-12 relative">
        <div className="absolute inset-0 bg-blue-50/30 rounded-[2rem] -m-4 border border-blue-100/50 pointer-events-none" />

        <div className="relative space-y-8">
          {/* Selector Maestro de Sesión (Control de Contexto) */}
          <div className="bg-white p-8 rounded-2xl shadow-md shadow-blue-900/5 border border-blue-100 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest mb-3">
                <span className="relative flex h-2 w-2">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isCurrentSessionActive ? "bg-green-400" : "bg-amber-400"}`}
                  ></span>
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${isCurrentSessionActive ? "bg-green-500" : "bg-amber-500"}`}
                  ></span>
                </span>
                Contexto de Trabajo
              </div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Gestión de Sesión Seleccionada
              </h2>
              <p className="text-gray-500 mt-1 max-w-md mx-auto lg:mx-0">
                Los registros manuales y el control detallado a continuación se
                aplican exclusivamente a la sesión que elija aquí.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-200 w-full lg:w-auto shadow-inner">
              <div className="flex-1 sm:flex-none px-6 py-3 bg-white rounded-xl shadow-sm border border-gray-200">
                <label
                  htmlFor="session-select-master"
                  className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 text-center sm:text-left"
                >
                  Seleccionar Sesión
                </label>
                <select
                  id="session-select-master"
                  value={selectedSession?.id || ""}
                  onChange={(e) => handleSessionChange(e.target.value)}
                  className="bg-transparent border-none font-black text-gray-800 focus:ring-0 p-0 text-lg cursor-pointer w-full"
                >
                  {availableSessions.length === 0 && (
                    <option value="">Sin sesiones registradas</option>
                  )}
                  {availableSessions.map((s) => (
                    <option key={s.id} value={s.id} suppressHydrationWarning>
                      {new Date(s.date).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "short",
                      })}{" "}
                      -{" "}
                      {new Date(s.expectedStart).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </option>
                  ))}
                </select>
              </div>

              {selectedSession && (
                <div className="flex flex-col items-center px-8 py-3">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    Estado Actual
                  </span>
                  <span
                    className={`text-sm font-black px-4 py-1 rounded-lg uppercase border-2 shadow-sm ${
                      isCurrentSessionActive
                        ? "bg-green-50 text-green-700 border-green-200 shadow-green-100"
                        : "bg-amber-50 text-amber-700 border-amber-200 shadow-amber-100"
                    }`}
                  >
                    {selectedSession.status === "ACTIVE"
                      ? "Sesión Activa"
                      : selectedSession.status}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {/* Alta rápida de asistencia manual (RF-14) */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:border-blue-200 transition-colors">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black">
                  +
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-800">
                    Registro Manual de Asistencia
                  </h3>
                  <p className="text-sm text-gray-500">
                    Habilitado para la sesión seleccionada arriba.
                  </p>
                </div>
              </div>
              <form
                onSubmit={handleCreateAttendance}
                className="grid grid-cols-1 md:grid-cols-4 gap-6"
              >
                <div className="space-y-1">
                  <label
                    htmlFor="new-student-cui"
                    className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1"
                  >
                    CUI Estudiante
                  </label>
                  <input
                    id="new-student-cui"
                    type="text"
                    value={newStudentCui}
                    onChange={(e) => setNewStudentCui(e.target.value)}
                    placeholder="8 dígitos"
                    className="w-full border-gray-200 bg-gray-50/50 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    maxLength={8}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="new-status"
                    className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1"
                  >
                    Estado
                  </label>
                  <select
                    id="new-status"
                    value={newStatus}
                    onChange={(e) =>
                      setNewStatus(e.target.value as AttendanceRecord["status"])
                    }
                    className="w-full border-gray-200 bg-gray-50/50 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  >
                    <option value="PUNTUAL">Presente (Puntual)</option>
                    <option value="TARDANZA">Tardanza</option>
                    <option value="FALTA">Falta</option>
                    <option value="AMBIENTE_ESTUDIO">
                      Ambiente de Estudio
                    </option>
                  </select>
                </div>
                <div className="space-y-1 md:col-span-1">
                  <label
                    htmlFor="new-reason"
                    className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1"
                  >
                    Observación
                  </label>
                  <input
                    id="new-reason"
                    type="text"
                    value={newReason}
                    onChange={(e) => setNewReason(e.target.value)}
                    placeholder="Motivo del registro"
                    className="w-full border-gray-200 bg-gray-50/50 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    required
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-3.5 rounded-xl hover:bg-blue-700 transition font-black shadow-lg shadow-blue-200 text-sm uppercase tracking-widest"
                  >
                    Registrar Asistencia
                  </button>
                </div>
              </form>
            </div>

            {/* Cuadrícula de Modificación de Asistencia (RF-14) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-50 bg-gray-50/30 flex flex-col xl:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-gray-800 rounded-xl flex items-center justify-center text-white font-black">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <title>Icono de lista de asistencia</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      ></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-800">
                      Control Detallado
                    </h3>
                    <p className="text-sm text-gray-500">
                      Listado completo de marcaciones registradas.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
                  <div className="relative w-full sm:w-80">
                    <label htmlFor="attendance-search" className="sr-only">
                      Buscar por CUI o Nombre
                    </label>
                    <input
                      id="attendance-search"
                      type="text"
                      placeholder="Buscar por CUI o Nombre..."
                      className="w-full border-gray-200 bg-white rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <svg
                      className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <title>Icono de búsqueda</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      ></path>
                    </svg>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      fetchSessionData(group?.id, selectedSession?.id)
                    }
                    className="w-full sm:w-auto px-6 py-2.5 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition text-sm font-bold border border-gray-200 shadow-sm flex items-center justify-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <title>Icono de actualizar</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      ></path>
                    </svg>
                    Actualizar
                  </button>
                </div>{" "}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] font-black tracking-widest border-b border-gray-100">
                    <tr>
                      <th className="px-8 py-5">CUI</th>
                      <th className="px-8 py-5">Estudiante</th>
                      <th className="px-8 py-5">Marcación</th>
                      <th className="px-8 py-5">Estado</th>
                      <th className="px-8 py-5">Observaciones</th>
                      <th className="px-8 py-5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredAttendances.map((record) => (
                      <tr
                        key={record.id}
                        className="hover:bg-blue-50/30 transition-colors group"
                      >
                        <td className="px-8 py-5 font-black text-gray-900">
                          {record.studentCui}
                        </td>
                        <td className="px-8 py-5">
                          <div className="font-bold text-gray-700 group-hover:text-blue-700 transition-colors">
                            {record.name || "Sin nombre registrado"}
                          </div>
                        </td>
                        <td
                          className="px-8 py-5 text-gray-500 font-medium"
                          suppressHydrationWarning
                        >
                          {new Date(record.checkIn).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-8 py-5">
                          <span
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wider uppercase border-b-2 shadow-sm ${
                              record.status === "PUNTUAL"
                                ? "bg-green-100 text-green-700 border-green-200 shadow-green-50"
                                : record.status === "TARDANZA"
                                  ? "bg-amber-100 text-amber-700 border-amber-200 shadow-amber-50"
                                  : record.status === "FALTA"
                                    ? "bg-red-100 text-red-700 border-red-200 shadow-red-50"
                                    : "bg-blue-100 text-blue-700 border-blue-200 shadow-blue-50"
                            }`}
                          >
                            {record.status}
                          </span>
                        </td>
                        <td
                          className="px-8 py-5 italic text-xs text-gray-400 max-w-[200px] truncate font-medium"
                          title={record.observation || ""}
                        >
                          {record.observation || "-"}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-4">
                            <select
                              value={record.status}
                              onChange={(e) =>
                                handleStatusChange(
                                  record.studentCui,
                                  e.target.value as AttendanceRecord["status"],
                                  record.name,
                                )
                              }
                              className="text-[10px] font-bold border-gray-200 bg-gray-50 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 py-1.5 uppercase tracking-tighter cursor-pointer"
                              title="Cambiar estado"
                            >
                              <option value="PUNTUAL">Puntual</option>
                              <option value="TARDANZA">Tardanza</option>
                              <option value="FALTA">Falta</option>
                              <option value="AMBIENTE_ESTUDIO">Estudio</option>
                            </select>
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteAttendance(
                                  record.studentCui,
                                  record.name,
                                )
                              }
                              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Anular registro"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <title>Anular registro</title>
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                ></path>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredAttendances.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-8 py-20 text-center text-gray-400 italic bg-gray-50/20"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <svg
                              className="w-12 h-12 text-gray-200"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <title>Sin registros</title>
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="1"
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              ></path>
                            </svg>
                            <p className="font-bold tracking-tight">
                              No se encontraron marcaciones
                            </p>
                            <p className="text-xs">
                              Intente con otro término de búsqueda o verifique
                              la sesión.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
