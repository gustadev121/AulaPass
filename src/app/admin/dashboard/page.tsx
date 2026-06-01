"use client";

import {
  Alert,
  Button,
  Card,
  FileInput,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from "flowbite-react";
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
          color="red"
          onClick={() => {
            logout();
            router.push("/");
          }}
        >
          Cerrar Sesión
        </Button>
      </header>

      <main className="grow p-6 max-w-6xl w-full mx-auto space-y-6">
        {success && <Alert color="success">{success}</Alert>}
        {error && <Alert color="failure">{error}</Alert>}

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          <Button
            onClick={() => setActiveTab("courses")}
            color={activeTab === "courses" ? "blue" : "alternative"}
            className="border-0 focus:ring-0"
          >
            Cursos
          </Button>
          <Button
            onClick={() => setActiveTab("teachers")}
            color={activeTab === "teachers" ? "blue" : "alternative"}
            className="border-0 focus:ring-0"
          >
            Docentes
          </Button>
          <Button
            onClick={() => setActiveTab("students")}
            color={activeTab === "students" ? "blue" : "alternative"}
            className="border-0 focus:ring-0"
          >
            Estudiantes
          </Button>
          <Button
            onClick={() => setActiveTab("audit")}
            color={activeTab === "audit" ? "blue" : "alternative"}
            className="border-0 focus:ring-0"
          >
            Auditoría
          </Button>
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
                <Label htmlFor="csv-file" className="sr-only">
                  Subir Archivo CSV
                </Label>
                <FileInput
                  id="csv-file"
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
                <TableHead>
                  <TableRow>
                    <TableHeadCell>Código</TableHeadCell>
                    <TableHeadCell>Nombre del Curso</TableHeadCell>
                    <TableHeadCell>Abreviatura</TableHeadCell>
                    <TableHeadCell>Grupos</TableHeadCell>
                  </TableRow>
                </TableHead>
                <TableBody className="divide-y">
                  {courses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">
                        No hay cursos registrados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    courses.map((course) => (
                      <TableRow key={course.code} className="bg-white">
                        <TableCell className="font-mono">
                          {course.code}
                        </TableCell>
                        <TableCell className="font-medium text-gray-900">
                          {course.name}
                        </TableCell>
                        <TableCell>{course.abbreviation}</TableCell>
                        <TableCell>{course.groups}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}

            {activeTab === "teachers" && (
              <Table hoverable>
                <TableHead>
                  <TableRow>
                    <TableHeadCell>Usuario</TableHeadCell>
                    <TableHeadCell>Nombre Completo</TableHeadCell>
                    <TableHeadCell>Código de Curso</TableHeadCell>
                  </TableRow>
                </TableHead>
                <TableBody className="divide-y">
                  {teachers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4">
                        No hay docentes registrados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    teachers.map((teacher) => (
                      <TableRow key={teacher.username} className="bg-white">
                        <TableCell className="font-semibold text-gray-900">
                          {teacher.username}
                        </TableCell>
                        <TableCell>{teacher.name}</TableCell>
                        <TableCell className="font-mono text-gray-500">
                          {teacher.courseCode || "No asignado"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}

            {activeTab === "students" && (
              <Table hoverable>
                <TableHead>
                  <TableRow>
                    <TableHeadCell>CUI</TableHeadCell>
                    <TableHeadCell>Nombre Estudiante</TableHeadCell>
                  </TableRow>
                </TableHead>
                <TableBody className="divide-y">
                  {students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-4">
                        No hay estudiantes registrados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    students.map((student) => (
                      <TableRow key={student.cui} className="bg-white">
                        <TableCell className="font-mono text-gray-900">
                          {student.cui}
                        </TableCell>
                        <TableCell>{student.name}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}

            {activeTab === "audit" && (
              <Table hoverable>
                <TableHead>
                  <TableRow>
                    <TableHeadCell>ID</TableHeadCell>
                    <TableHeadCell>Fecha / Hora</TableHeadCell>
                    <TableHeadCell>Curso</TableHeadCell>
                    <TableHeadCell>Grupo</TableHeadCell>
                    <TableHeadCell>Estudiante (CUI)</TableHeadCell>
                  </TableRow>
                </TableHead>
                <TableBody className="divide-y">
                  {auditLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        No hay registros de asistencia en la auditoría.
                      </TableCell>
                    </TableRow>
                  ) : (
                    auditLogs.map((log) => (
                      <TableRow key={log.id} className="bg-white">
                        <TableCell>{log.id}</TableCell>
                        <TableCell>
                          {new Date(log.timestamp).toLocaleString("es-PE")}
                        </TableCell>
                        <TableCell>
                          {log.courseName} ({log.courseCode})
                        </TableCell>
                        <TableCell className="text-center">
                          {log.groupLetter}
                        </TableCell>
                        <TableCell>
                          {log.studentName} ({log.studentCui})
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
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
              color="red"
              onClick={handleClearSystemData}
              disabled={loading}
              size="sm"
            >
              Vaciar Datos del Sistema (Cursos, Docentes, Alumnos)
            </Button>
            <Button
              color="yellow"
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
