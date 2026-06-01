import type { Metadata } from "next";
import { AuthProvider } from "./AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "AulaPass - Control de Asistencia UNSA",
  description: "Sistema MVP de asistencia de alumnos para la UNSA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="bg-gray-50 text-gray-900 min-h-screen flex flex-col antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
