"use client";

import {
  Alert,
  Button,
  Card,
  Label,
  Progress,
  Select,
  TextInput,
} from "flowbite-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/AuthContext";
import { generateCodeAction } from "@/lib/actions/active-code-actions";
import { getCourseDetailsAction } from "@/lib/actions/attendance-actions";

export default function TeacherDashboardPage() {
  const { teacherUsername, teacherName, teacherCourseCode, logout } = useAuth();
  const router = useRouter();

  const [courseName, setCourseName] = useState("");
  const [groups, setGroups] = useState<string[]>([]);

  // Config fields
  const [selectedGroup, setSelectedGroup] = useState("");
  const [codeLength, setCodeLength] = useState(6);
  const [codeDuration, setCodeDuration] = useState(15);

  // Active code state
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Route guard - redirect to login if no teacher session
  useEffect(() => {
    if (!teacherUsername || !teacherCourseCode) {
      router.push("/docente/login");
    }
  }, [teacherUsername, teacherCourseCode, router]);

  // Load course details based on teacherCourseCode
  useEffect(() => {
    if (teacherCourseCode) {
      getCourseDetailsAction(teacherCourseCode).then((res) => {
        if (res.success && res.course) {
          setCourseName(res.course.name);
          const courseGroups = res.course.groups
            .split(",")
            .map((g) => g.trim());
          setGroups(courseGroups);
          if (courseGroups.length > 0) {
            setSelectedGroup(courseGroups[0]);
          }
        } else {
          setError(
            res.error || "No se pudieron obtener los detalles del curso.",
          );
        }
      });
    }
  }, [teacherCourseCode]);

  // Countdown timer logic
  useEffect(() => {
    if (!expiresAt) return;

    const timer = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.round((expiresAt - Date.now()) / 1000),
      );
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
        setGeneratedCode(null);
        setExpiresAt(null);
      }
    }, 100); // Frequent poll for high resolution countdown

    return () => clearInterval(timer);
  }, [expiresAt]);

  if (!teacherUsername || !teacherCourseCode) {
    return null;
  }

  const handleGenerate = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await generateCodeAction({
      courseCode: teacherCourseCode,
      groupLetter: selectedGroup,
      length: codeLength,
      durationSeconds: codeDuration,
    });
    setLoading(false);

    if (res.success && res.data) {
      setGeneratedCode(res.data.code);
      setExpiresAt(res.data.expiresAt);
      setTimeLeft(codeDuration);
    } else {
      setError(res.error || "Error al generar el código.");
    }
  };

  return (
    <main className="grow flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <div className="flex justify-between items-center border-b pb-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Panel de Docente
            </h2>
            <p className="text-xs text-gray-500">Docente: {teacherName}</p>
            <p className="text-xs text-gray-500">
              Curso: {courseName} ({teacherCourseCode})
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

        {error && (
          <Alert color="failure" className="my-2">
            {error}
          </Alert>
        )}

        {!generatedCode ? (
          <form onSubmit={handleGenerate} className="flex flex-col gap-4 mt-2">
            <div>
              <div className="mb-2 block">
                <Label htmlFor="group">Seleccionar Grupo</Label>
              </div>
              <Select
                id="group"
                required
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                disabled={loading}
              >
                {groups.map((group) => (
                  <option key={group} value={group}>
                    Grupo {group}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <div className="mb-2 block">
                <Label htmlFor="length">Longitud del Código (6 - 12)</Label>
              </div>
              <TextInput
                id="length"
                type="number"
                min={6}
                max={12}
                required
                value={codeLength}
                onChange={(e) => setCodeLength(parseInt(e.target.value, 10))}
                disabled={loading}
              />
            </div>

            <div>
              <div className="mb-2 block">
                <Label htmlFor="duration">
                  Duración en Pantalla (5s - 30s)
                </Label>
              </div>
              <TextInput
                id="duration"
                type="number"
                min={5}
                max={30}
                required
                value={codeDuration}
                onChange={(e) => setCodeDuration(parseInt(e.target.value, 10))}
                disabled={loading}
              />
            </div>

            <Button type="submit" color="success" disabled={loading}>
              {loading ? "Generando..." : "Generar Código"}
            </Button>
          </form>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">
              Código de Asistencia Activo
            </h3>

            <div className="text-5xl font-black tracking-widest text-emerald-600 bg-emerald-50 px-8 py-4 rounded-xl border border-emerald-200 font-mono">
              {generatedCode}
            </div>

            <div className="w-full text-center space-y-1">
              <p className="text-sm font-semibold text-gray-500">
                Tiempo restante:{" "}
                <span className="text-red-500 font-bold font-mono">
                  {timeLeft}s
                </span>
              </p>
              <Progress
                progress={(timeLeft / codeDuration) * 100}
                color={timeLeft > 5 ? "green" : "red"}
                size="sm"
              />
            </div>

            <p className="text-xs text-gray-400 text-center">
              Grupo {selectedGroup} • Comparte este código con los estudiantes
              en el aula.
            </p>

            <Button
              color="gray"
              className="w-full"
              onClick={() => {
                setGeneratedCode(null);
                setExpiresAt(null);
              }}
            >
              Volver a Configurar
            </Button>
          </div>
        )}
      </Card>
    </main>
  );
}
