"use client";

import { Alert, Button, Card, TextInput } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/app/AuthContext";
import { validateStudentCuiAction } from "@/lib/actions/attendance-actions";

export default function StudentLoginPage() {
  const [cui, setCui] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setStudent } = useAuth();

  const handleLogin = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setError(null);

    if (cui.length !== 8) {
      setError("El CUI debe tener exactamente 8 caracteres.");
      return;
    }

    setLoading(true);
    const res = await validateStudentCuiAction(cui);
    setLoading(false);

    if (res.success && res.student) {
      setStudent(res.student.cui, res.student.name);
      router.push("/estudiante/registro");
    } else {
      setError(res.error || "CUI no registrado en el sistema.");
    }
  };

  return (
    <main className="grow flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <h2 className="text-2xl font-bold text-center text-gray-900">
          Portal de Estudiante
        </h2>
        <p className="text-gray-500 text-center text-sm">
          Ingresa tu Código Universitario de Identificación (CUI)
        </p>

        <form onSubmit={handleLogin} className="flex flex-col gap-4 mt-4">
          <div>
            <TextInput
              id="cui"
              type="text"
              placeholder="Ej: 12345678"
              required
              value={cui}
              maxLength={8}
              onChange={(e) => setCui(e.target.value.replace(/\D/g, ""))}
              disabled={loading}
            />
          </div>

          {error && <Alert color="failure">{error}</Alert>}

          <Button type="submit" disabled={loading}>
            {loading ? "Validando..." : "Ingresar"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
