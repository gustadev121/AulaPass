"use client";

import { Alert, Button, Card, Label, TextInput } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/app/AuthContext";
import { validateAdminCredentials } from "@/lib/auth/admin-auth";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setAdminAuthenticated } = useAuth();

  const handleLogin = (e: React.SubmitEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (validateAdminCredentials(username, password)) {
      setAdminAuthenticated(true);
      router.push("/admin/dashboard");
    } else {
      setError("Usuario o contraseña incorrectos.");
    }
    setLoading(false);
  };

  return (
    <main className="grow flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <h2 className="text-2xl font-bold text-center text-gray-900">
          Portal de Administración
        </h2>
        <p className="text-gray-500 text-center text-sm">
          Ingresa las credenciales de administrador
        </p>

        <form onSubmit={handleLogin} className="flex flex-col gap-4 mt-4">
          <div>
            <div className="mb-2 block">
              <Label htmlFor="username">Usuario</Label>
            </div>
            <TextInput
              id="username"
              type="text"
              placeholder="Ej: admin"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <div className="mb-2 block">
              <Label htmlFor="password">Contraseña</Label>
            </div>
            <TextInput
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && <Alert color="failure">{error}</Alert>}

          <Button type="submit" color="dark" disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
