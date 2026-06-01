import { Button, Card } from "flowbite-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="grow flex items-center justify-center p-4">
      <div className="max-w-4xl w-full text-center space-y-8">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            AulaPass UNSA
          </h1>
          <p className="mt-3 text-lg text-gray-500">
            Control de asistencia estudiantil rápido y sencillo
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto pt-6">
          <Card className="flex flex-col justify-between">
            <h5 className="text-xl font-bold tracking-tight text-gray-900">
              Estudiante
            </h5>
            <p className="font-normal text-gray-700 text-sm my-2">
              Ingresa con tu CUI para registrar tu asistencia en clase usando el
              código proporcionado por el docente.
            </p>
            <Link href="/estudiante/login">
              <Button color="green">Ingresar como Estudiante</Button>
            </Link>
          </Card>

          <Card className="flex flex-col justify-between">
            <h5 className="text-xl font-bold tracking-tight text-gray-900">
              Docente
            </h5>
            <p className="font-normal text-gray-700 text-sm my-2">
              Configura tus clases y genera códigos dinámicos y temporales de
              asistencia para tus alumnos.
            </p>
            <Link href="/docente/login">
              <Button color="blue">Ingresar como Docente</Button>
            </Link>
          </Card>

          <Card className="flex flex-col justify-between">
            <h5 className="text-xl font-bold tracking-tight text-gray-900">
              Administrador
            </h5>
            <p className="font-normal text-gray-700 text-sm my-2">
              Sube la información de la universidad (Cursos, Docentes,
              Estudiantes) y consulta el registro de auditoría.
            </p>
            <Link href="/admin/login">
              <Button color="purple">Ingresar como Admin</Button>
            </Link>
          </Card>
        </div>
      </div>
    </main>
  );
}
