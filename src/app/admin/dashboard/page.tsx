"use client";

import { Alert, Button, Card, Label, Table } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/app/AuthContext";
import {
  clearAuditLogsAction,
  clearSystemDataAction,
  getAuditLogsAction,
  getCoursesAction,
  getStudentsAction,
  getTeachersAction,
  uploadCoursesAction,
  uploadStudentsAction,
  uploadTeachersAction,
} from "@/lib/actions/admin-actions";

type TabName = "courses" | "teachers" | "students" | "audit";

function parseCSV(text: string): Record<string, string>[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  // Clean headers (remove BOM if present)
  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().replace(/^\uFEFF/, ""));

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || "";
    });
    return obj;
  });
}

export default function AdminDashboardPage() {
  const { adminAuthenticated, logout } = useAuth();
  const router = useRouter();

  interface CourseRow {
    code: string;
    name: string;
    abbreviation: string;
    groups: string;
  }

  interface TeacherRow {
    username: string;
    name: string;
    courseCode: string | null;
  }

  interface StudentRow {
    cui: string;
    name: string;
  }

  interface AuditLogRow {
    id: number;
    timestamp: Date | string;
    courseCode: string | null;
    courseName: string | null;
    groupLetter: string | null;
    studentCui: string | null;
    studentName: string | null;
  }

  const [activeTab, setActiveTab] = useState<TabName>("courses");
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Route guard - redirect if not authenticated
  useEffect(() => {
    if (!adminAuthenticated) {
      router.push("/admin/login");
    }
  }, [adminAuthenticated, router]);

  const loadData = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      if (activeTab === "courses") {
        const res = await getCoursesAction();
        if (res.success && res.data) setCourses(res.data);
        else setError(res.error || "Error al cargar cursos.");
      } else if (activeTab === "teachers") {
        const res = await getTeachersAction();
        if (res.success && res.data) setTeachers(res.data);
        else setError(res.error || "Error al cargar docentes.");
      } else if (activeTab === "students") {
        const res = await getStudentsAction();
        if (res.success && res.data) setStudents(res.data);
        else setError(res.error || "Error al cargar estudiantes.");
      } else if (activeTab === "audit") {
        const res = await getAuditLogsAction();
        if (res.success && res.data) setAuditLogs(res.data);
        else setError(res.error || "Error al cargar auditoría.");
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Error al conectar con la base de datos.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // Reload when tab changes
  useEffect(() => {
    if (adminAuthenticated) {
      loadData();
    }
  }, [adminAuthenticated, loadData]);

  if (!adminAuthenticated) {
    return null;
  }

  const handleCSVUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: TabName,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const parsedData = parseCSV(text);

      if (parsedData.length === 0) {
        setError("El archivo CSV está vacío o tiene formato inválido.");
        setLoading(false);
        return;
      }

      let res: { success: boolean; error?: string } | undefined;
      if (type === "courses") {
        res = await uploadCoursesAction(parsedData);
      } else if (type === "teachers") {
        res = await uploadTeachersAction(parsedData);
      } else if (type === "students") {
        res = await uploadStudentsAction(parsedData);
      }

      if (res?.success) {
        setSuccess(
          `¡Archivo CSV de ${type === "courses" ? "Cursos" : type === "teachers" ? "Docentes" : "Estudiantes"} cargado con éxito!`,
        );
        loadData();
      } else {
        setError(
          res?.error ||
            "Error al procesar el archivo. Todo el lote fue rechazado.",
        );
      }
      setLoading(false);
      // Reset file input
      e.target.value = "";
    };

    reader.onerror = () => {
      setError("Error al leer el archivo.");
      setLoading(false);
    };

    reader.readAsText(file);
  };

  const handleClearSystemData = async () => {
    if (
      !confirm(
        "¿Está seguro de vaciar todos los cursos, docentes y estudiantes? Esta acción no se puede deshacer.",
      )
    )
      return;
    setError(null);
    setSuccess(null);
    setLoading(true);
    const res = await clearSystemDataAction();
    setLoading(false);
    if (res.success) {
      setSuccess("Datos del sistema limpiados con éxito.");
      loadData();
    } else {
      setError(res.error || "Error al limpiar los datos.");
    }
  };

  const handleClearAuditLogs = async () => {
    if (
      !confirm(
        "¿Está seguro de vaciar todos los registros de auditoría? Esta acción no se puede deshacer.",
      )
    )
      return;
    setError(null);
    setSuccess(null);
    setLoading(true);
    const res = await clearAuditLogsAction();
    setLoading(false);
    if (res.success) {
      setSuccess("Registros de auditoría eliminados con éxito.");
      loadData();
    } else {
      setError(res.error || "Error al limpiar auditoría.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 text-white p-4 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-bold">Administración AulaPass</h1>
        <Button
          size="sm"
          color="failure"
          onClick={() => {
            logout();
            router.push("/");
          }}
        >
          Cerrar Sesión
        </Button>
      </header>

      <main className="flex-grow p-6 max-w-6xl w-full mx-auto space-y-6">
        {success && <Alert color="success">{success}</Alert>}
        {error && <Alert color="failure">{error}</Alert>}

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab("courses")}
            className={`py-3 px-6 font-semibold border-b-2 transition-all ${
              activeTab === "courses"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Cursos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("teachers")}
            className={`py-3 px-6 font-semibold border-b-2 transition-all ${
              activeTab === "teachers"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Docentes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("students")}
            className={`py-3 px-6 font-semibold border-b-2 transition-all ${
              activeTab === "students"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Estudiantes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            className={`py-3 px-6 font-semibold border-b-2 transition-all ${
              activeTab === "audit"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Auditoría
          </button>
        </div>

        {/* Dynamic Section Content */}
        <Card>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-4 border-b">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {activeTab === "courses" && "Gestión de Cursos"}
                {activeTab === "teachers" && "Gestión de Docentes"}
                {activeTab === "students" && "Gestión de Estudiantes"}
                {activeTab === "audit" && "Registro de Auditoría de Asistencia"}
              </h2>
              <p className="text-xs text-gray-500">
                {activeTab !== "audit" &&
                  "Puedes cargar un archivo CSV para actualizar el registro masivamente."}
                {activeTab === "audit" &&
                  "Historial de firmas de asistencia registradas."}
              </p>
            </div>

            {activeTab !== "audit" && (
              <div className="flex flex-col gap-1 w-full sm:w-auto">
                <Label
                  htmlFor="csv-file"
                  value="Subir Archivo CSV"
                  className="sr-only"
                />
                <input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
                  onChange={(e) => handleCSVUpload(e, activeTab)}
                  disabled={loading}
                />
              </div>
            )}
          </div>

          {/* Table display */}
          <div className="overflow-x-auto">
            {activeTab === "courses" && (
              <Table hoverable>
                <Table.Head>
                  <Table.HeadCell>Código</Table.HeadCell>
                  <Table.HeadCell>Nombre del Curso</Table.HeadCell>
                  <Table.HeadCell>Abreviatura</Table.HeadCell>
                  <Table.HeadCell>Grupos</Table.HeadCell>
                </Table.Head>
                <Table.Body className="divide-y">
                  {courses.length === 0 ? (
                    <Table.Row>
                      <Table.Cell colSpan={4} className="text-center py-4">
                        No hay cursos registrados.
                      </Table.Cell>
                    </Table.Row>
                  ) : (
                    courses.map((course) => (
                      <Table.Row key={course.code} className="bg-white">
                        <Table.Cell className="font-mono">
                          {course.code}
                        </Table.Cell>
                        <Table.Cell className="font-medium text-gray-900">
                          {course.name}
                        </Table.Cell>
                        <Table.Cell>{course.abbreviation}</Table.Cell>
                        <Table.Cell>{course.groups}</Table.Cell>
                      </Table.Row>
                    ))
                  )}
                </Table.Body>
              </Table>
            )}

            {activeTab === "teachers" && (
              <Table hoverable>
                <Table.Head>
                  <Table.HeadCell>Usuario</Table.HeadCell>
                  <Table.HeadCell>Nombre Completo</Table.HeadCell>
                  <Table.HeadCell>Código de Curso</Table.HeadCell>
                </Table.Head>
                <Table.Body className="divide-y">
                  {teachers.length === 0 ? (
                    <Table.Row>
                      <Table.Cell colSpan={3} className="text-center py-4">
                        No hay docentes registrados.
                      </Table.Cell>
                    </Table.Row>
                  ) : (
                    teachers.map((teacher) => (
                      <Table.Row key={teacher.username} className="bg-white">
                        <Table.Cell className="font-semibold text-gray-900">
                          {teacher.username}
                        </Table.Cell>
                        <Table.Cell>{teacher.name}</Table.Cell>
                        <Table.Cell className="font-mono text-gray-500">
                          {teacher.courseCode || "No asignado"}
                        </Table.Cell>
                      </Table.Row>
                    ))
                  )}
                </Table.Body>
              </Table>
            )}

            {activeTab === "students" && (
              <Table hoverable>
                <Table.Head>
                  <Table.HeadCell>CUI</Table.HeadCell>
                  <Table.HeadCell>Nombre Estudiante</Table.HeadCell>
                </Table.Head>
                <Table.Body className="divide-y">
                  {students.length === 0 ? (
                    <Table.Row>
                      <Table.Cell colSpan={2} className="text-center py-4">
                        No hay estudiantes registrados.
                      </Table.Cell>
                    </Table.Row>
                  ) : (
                    students.map((student) => (
                      <Table.Row key={student.cui} className="bg-white">
                        <Table.Cell className="font-mono text-gray-900">
                          {student.cui}
                        </Table.Cell>
                        <Table.Cell>{student.name}</Table.Cell>
                      </Table.Row>
                    ))
                  )}
                </Table.Body>
              </Table>
            )}

            {activeTab === "audit" && (
              <Table hoverable>
                <Table.Head>
                  <Table.HeadCell>ID</Table.HeadCell>
                  <Table.HeadCell>Fecha / Hora</Table.HeadCell>
                  <Table.HeadCell>Curso</Table.HeadCell>
                  <Table.HeadCell>Grupo</Table.HeadCell>
                  <Table.HeadCell>Estudiante (CUI)</Table.HeadCell>
                </Table.Head>
                <Table.Body className="divide-y">
                  {auditLogs.length === 0 ? (
                    <Table.Row>
                      <Table.Cell colSpan={5} className="text-center py-4">
                        No hay registros de asistencia en la auditoría.
                      </Table.Cell>
                    </Table.Row>
                  ) : (
                    auditLogs.map((log) => (
                      <Table.Row key={log.id} className="bg-white">
                        <Table.Cell>{log.id}</Table.Cell>
                        <Table.Cell>
                          {new Date(log.timestamp).toLocaleString("es-PE")}
                        </Table.Cell>
                        <Table.Cell>
                          {log.courseName} ({log.courseCode})
                        </Table.Cell>
                        <Table.Cell className="text-center">
                          {log.groupLetter}
                        </Table.Cell>
                        <Table.Cell>
                          {log.studentName} ({log.studentCui})
                        </Table.Cell>
                      </Table.Row>
                    ))
                  )}
                </Table.Body>
              </Table>
            )}
          </div>
        </Card>

        {/* Maintenance Panel */}
        <Card className="border border-red-200 bg-red-50/20">
          <h3 className="text-base font-bold text-red-800">
            Panel de Mantenimiento y Limpieza
          </h3>
          <p className="text-xs text-gray-500 mb-2">
            Herramientas para purgar registros y restablecer la base de datos de
            manera rápida.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              color="failure"
              onClick={handleClearSystemData}
              disabled={loading}
              size="sm"
            >
              Vaciar Datos del Sistema (Cursos, Docentes, Alumnos)
            </Button>
            <Button
              color="warning"
              onClick={handleClearAuditLogs}
              disabled={loading}
              size="sm"
            >
              Vaciar Historial de Auditoría
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
