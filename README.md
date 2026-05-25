# 🏫 AulaPass (UNSA)

**Sistema Integral de Control de Asistencia y Acceso para Aulas Universitarias**

AulaPass es un sistema de control de acceso y registro de asistencia diseñado específicamente para las aulas de la Universidad Nacional de San Agustín (UNSA). Opera como un **Tótem de Autoservicio** en puerta para estudiantes y se integra con un **Panel de Administración** completo para el docente. 

El sistema está diseñado para equilibrar la puntualidad con la flexibilidad horaria universitaria, soportando asistencia intergrupo y permitiendo el control de permanencia en ambientes de estudio.

---

## ✨ Características Principales

*   **Tótem Kiosko (Autoservicio)**: Interfaz de pantalla completa para que los estudiantes registren su entrada y salida de manera rápida.
*   **Panel Docente**: Interfaz administrativa protegida para abrir/cerrar sesiones de clase, modificar asistencias y ver estadísticas en tiempo real.
*   **Reglas de Tolerancia Dinámicas**: Soporte para tolerancia estática (ej. 15 minutos) y dinámica (basada en la hora de llegada real del docente).
*   **Gestión de Estados**: Clasificación automática en `PUNTUAL`, `TARDANZA`, `FALTA`, o `AMBIENTE_ESTUDIO`.
*   **Auditoría y Correcciones**: Registro inmutable de cualquier cambio manual de asistencia realizado por el docente (Audit Logs).
*   **Modo Local Offline-First**: Almacenamiento rápido en SQLite, ideal para entornos con conectividad inestable.

---

## 🚀 Stack Tecnológico

El proyecto utiliza tecnologías modernas y de alto rendimiento:

*   **Framework Core**: [Next.js 16](https://nextjs.org/) (App Router) + [React 19](https://react.dev/) + TypeScript
*   **Estilos y UI**: [Tailwind CSS v4](https://tailwindcss.com/) + [Flowbite React](https://flowbite-react.com/)
*   **Base de Datos**: [SQLite](https://sqlite.org/) (vía `better-sqlite3`)
*   **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
*   **Gestor de Paquetes y Runtime**: [Bun](https://bun.sh/)
*   **Pruebas Unitarias/Integración**: [Vitest](https://vitest.dev/)
*   **Linter y Formateador**: [Biome](https://biomejs.dev/)

---

## 📋 Requisitos Previos

Asegúrate de tener instalado en tu sistema:
*   [Bun](https://bun.sh/) (Recomendado v1.1 o superior)
*   [Node.js 20+](https://nodejs.org/) (Como respaldo para algunas herramientas del ecosistema)

---

## 🛠️ Instalación y Configuración

1. **Clonar el repositorio**
   ```bash
   git clone <url-del-repositorio>
   cd AulaPass
   ```

2. **Instalar dependencias**
   Utilizando Bun para una instalación ultrarrápida:
   ```bash
   bun install
   ```

3. **Inicializar la Base de Datos**
   El sistema utiliza SQLite. Crea la base de datos y empuja el esquema inicial:
   ```bash
   bun run db:push
   ```

4. **Ejecutar el Servidor de Desarrollo**
   ```bash
   bun run dev
   ```
   El sistema estará disponible en [http://localhost:3000](http://localhost:3000).

---

## 📂 Estructura del Proyecto

```text
src/
├── app/          # Rutas de Next.js (App Router) e integraciones de API
├── components/   # Componentes React (KioskScreen, TeacherPanel, etc.)
├── db/           # Configuración de Drizzle ORM y Esquemas de Base de Datos
├── lib/          # Lógica de negocio (Reglas de asistencia, servicios)
└── test/         # Configuración y utilidades de Vitest
```

---

## 🗄️ Gestión de Base de Datos (Drizzle)

El sistema utiliza SQLite local (`better-sqlite3`). Para gestionar el esquema de la base de datos durante el desarrollo, usa los siguientes comandos:

*   `bun run db:push`: Sincroniza el esquema de Drizzle (`src/db/schema.ts`) directamente con la base de datos (ideal para desarrollo rápido).
*   `bun run db:generate`: Genera archivos de migración basados en los cambios del esquema.
*   `bun run db:migrate`: Ejecuta las migraciones pendientes en la base de datos.

---

## 🧪 Pruebas y Calidad de Código

El proyecto tiene un enfoque fuerte en pruebas de lógica de negocio y APIs mediante Vitest, garantizando que las reglas de tolerancia y registros funcionen correctamente.

*   **Ejecutar todas las pruebas**:
    ```bash
    bun run test
    ```
*   **Ejecutar pruebas en modo Watch** (para desarrollo continuo):
    ```bash
    bun run test:watch
    ```

**Análisis Estático (Biome)**
Utilizamos Biome.js para asegurar un estilo de código consistente y rápido.
*   **Formatear código**:
    ```bash
    bun run format
    ```
*   **Analizar código (Linter)**:
    ```bash
    bun run lint
    ```

---

## 📦 Construcción para Producción

Para compilar el proyecto y optimizarlo para producción:

```bash
bun run build
bun run start
```
