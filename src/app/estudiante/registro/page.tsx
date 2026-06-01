"use client";

import { Alert, Button, Card, Label, TextInput } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/AuthContext";
import { lookupCodeAction } from "@/lib/actions/active-code-actions";
import { registerAttendanceAction } from "@/lib/actions/attendance-actions";

export default function StudentRegistrationPage() {
  const { studentCui, studentName, logout } = useAuth();
  const router = useRouter();

  const [code, setCode] = useState("");
  const [activeCodeDetails, setActiveCodeDetails] = useState<{
    courseCode: string;
    courseName: string;
    groupLetter: string;
    expiresAt: number;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Guard route - redirect to login if no CUI is stored in context
  useEffect(() => {
    if (!studentCui) {
      router.push("/estudiante/login");
    }
  }, [studentCui, router]);

  if (!studentCui) {
    return null;
  }

  const handleLookup = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setActiveCodeDetails(null);

    if (!code.trim()) {
      setError("Por favor ingresa un código.");
      return;
    }

    setLoading(true);
    const res = await lookupCodeAction(code);
    setLoading(false);

    if (res.success && res.data) {
      setActiveCodeDetails(res.data);
    } else {
      setError(res.error || "Código inválido o expirado.");
    }
  };

  const handleRegister = async () => {
    if (!activeCodeDetails) return;
    setError(null);
    setSuccess(null);
    setLoading(true);

    const clientTimestamp = Date.now();

    const res = await registerAttendanceAction({
      cui: studentCui,
      courseCode: activeCodeDetails.courseCode,
      courseName: activeCodeDetails.courseName,
      groupLetter: activeCodeDetails.groupLetter,
      clientTimestamp,
      codeExpiration: activeCodeDetails.expiresAt,
    });
    setLoading(false);

    if (res.success) {
      setSuccess("¡Asistencia registrada con éxito!");
      setCode("");
      setActiveCodeDetails(null);
    } else {
      setError(res.error || "No se pudo registrar la asistencia.");
    }
  };

  return (
    <main className="grow flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <div className="flex justify-between items-center border-b pb-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Registrar Asistencia
            </h2>
            <p className="text-xs text-gray-500">
              Estudiante: {studentName} ({studentCui})
            </p>
          </div>
          <Button
            size="xs"
            color="gray"
            onClick={() => {
              logout();
              router.push("/");
            }}
          >
            Salir
          </Button>
        </div>

        {success && (
          <Alert color="success" className="my-2">
            {success}
          </Alert>
        )}
        {error && (
          <Alert color="failure" className="my-2">
            {error}
          </Alert>
        )}

        {!activeCodeDetails ? (
          <form onSubmit={handleLookup} className="flex flex-col gap-4 mt-2">
            <div>
              <div className="mb-2 block">
                <Label htmlFor="code">Código de Asistencia</Label>
              </div>
              <TextInput
                id="code"
                type="text"
                placeholder="Ej: W9R2T8"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={loading}
              />
            </div>
            <Button type="submit" color="info" disabled={loading}>
              {loading ? "Verificando..." : "Buscar Código"}
            </Button>
          </form>
        ) : (
          <div className="flex flex-col gap-4 mt-2">
            <div className="bg-gray-100 p-4 rounded-lg space-y-2">
              <h3 className="font-bold text-gray-800 text-lg">
                Detalles del Curso
              </h3>
              <p className="text-sm text-gray-700">
                <strong>Nombre:</strong> {activeCodeDetails.courseName}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Código:</strong> {activeCodeDetails.courseCode}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Grupo:</strong> {activeCodeDetails.groupLetter}
              </p>
              <p className="text-xs text-red-500">
                <strong>Expiración:</strong>{" "}
                {new Date(activeCodeDetails.expiresAt).toLocaleTimeString()}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                color="success"
                className="flex-1"
                onClick={handleRegister}
                disabled={loading}
              >
                {loading ? "Registrar Asistencia" : "Registrando..."}
              </Button>
              <Button
                color="gray"
                onClick={() => setActiveCodeDetails(null)}
                disabled={loading}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </Card>
    </main>
  );
}
