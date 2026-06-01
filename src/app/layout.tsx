import type { Metadata } from "next";
import { AuthProvider } from "./AuthContext";
import "./globals.css";
import { ThemeInit } from "@flowbite-react/init";

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
    <html lang="es" suppressHydrationWarning>
      <head>
        <ThemeInit />
      </head>
      <body className="bg-gray-50 text-gray-900 min-h-screen flex flex-col antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
