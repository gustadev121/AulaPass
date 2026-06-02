## Plan de Implementación de Interfaces de Usuario

El proyecto actual es un sistema de gestión de asistencia para estudiantes en los salones universitarios de la UNSA, Arequipa, Perú. Es un MVP sencillo y funcional cuyos requerimientos específicos se encuentran en @REQUIREMENTS.md. Elabora un plan detallado para implementar las interfaces de usuario requeridas considerando el contexto actual del proyecto: uso de bun y flowbite con NextJS. Revisa las skills disponibles y el estado actual del proyecto.

Este documento presenta el plan simplificado para implementar las interfaces de usuario de AulaPass, enfocado estrictamente en la funcionalidad del MVP. Usaremos los componentes predefinidos de Flowbite React sin personalizaciones de estilos adicionales para optimizar el tiempo de desarrollo.

---

### 1. Diseño Visual: Estándar y Funcional (Flowbite Out-of-the-Box)

*   **Estilo:** Se utilizará el tema por defecto de Tailwind CSS y Flowbite.
*   **Componentes:** Se emplearán los componentes estándar de Flowbite React (`Navbar`, `Sidebar`, `Button`, `Table`, `TextInput`, `Select`, `Card`, `Alert`) sin modificaciones de estilo, fuentes especiales ni animaciones customizadas.
*   **Contador del Código:** Se representará con un texto simple en pantalla o una barra de progreso lineal por defecto de Flowbite.

---

### 2. Arquitectura de Rutas (Mínima Necesaria)

El enrutamiento utilizará Next.js App Router con la siguiente estructura de archivos mínima en `src/app/`:

```text
src/app/
├── layout.tsx                     # Layout raíz (estilos básicos de Tailwind/Flowbite)
├── page.tsx                       # Selector de rol (Estudiante, Docente, Admin)
│
├── admin/
│   ├── login/
│   │   └── page.tsx               # Login de Administrador (credenciales hardcodeadas "admin"/"admin")
│   └── dashboard/
│       └── page.tsx               # Panel Admin (Carga de CSV y tablas en pestañas)
│
├── docente/
│   ├── login/
│   │   └── page.tsx               # Login de Docente
│   └── dashboard/
│       └── page.tsx               # Panel de Docente (Configuración, Generador y Contador)
│
└── estudiante/
    ├── login/
    │   └── page.tsx               # Login de Estudiante (por CUI)
    └── registro/
        └── page.tsx               # Registro de asistencia (Entrada de código y confirmación)
```

---

### 3. Manejo de Códigos Volátiles (En Memoria)

Para cumplir con la volatilidad de la configuración y generación del código (REQ-11 y REQ-12):

*   Se creará un store en memoria del servidor en `src/lib/active-codes.ts` implementando un mapa global singleton (`global.activeCodes`).
*   Se expondrán Server Actions para generar un código (`generateCodeAction`) y para verificar su validez (`lookupCodeAction`), evitando el uso de tablas persistentes en base de datos para este fin.

---

### 4. Funcionalidades Detalladas por Rol

#### 4.1. Selector de Rol ( / )
*   Tres botones simples de Flowbite (`Button`) para redirigir a los logins respectivos: Estudiante, Docente y Administrador.

#### 4.2. Flujo del Estudiante ( /estudiante/* )
*   **Login:** Un campo de texto simple para el CUI (8 caracteres). Al hacer submit, valida si existe en la base de datos y redirige a la página de registro. El CUI se mantiene en memoria del cliente (React state/Context).
*   **Registro:**
    1.  Input para el código de asistencia.
    2.  Al ingresar el código, se recuperan automáticamente los metadatos (curso, grupo).
    3.  Botón para confirmar el registro.
    4.  Envía el registro de asistencia mediante `registerAttendanceAction` enviando el `clientTimestamp` y `codeExpiration` para las validaciones de límites (REQ-15).
    5.  Maneja visualmente el error si el registro es duplicado (REQ-16).

#### 4.3. Flujo del Docente ( /docente/* )
*   **Login:** Campos de usuario y contraseña. Valida contra los docentes cargados.
*   **Dashboard:**
    *   Dropdown para seleccionar la letra del grupo (filtrado por los grupos asignados a su curso).
    *   Inputs numéricos simples para longitud (6-12) y duración (5s-30s).
    *   Botón para generar el código.
    *   Al generar, muestra el código en texto grande e inicia un contador descendente en pantalla mediante un efecto de React (`setInterval`). Al llegar a cero, inhabilita el código.

#### 4.4. Flujo de Administración ( /admin/* )
*   **Login:** Credenciales fijas `admin` / `admin`. Sin persistencia de sesión al recargar la página.
*   **Dashboard:**
    *   Navegación por pestañas (Cursos, Docentes, Estudiantes, Auditoría).
    *   Cada pestaña contiene una tabla estándar de Flowbite (`Table`) con los datos actuales.
    *   Botón para cargar archivos CSV. El parser del cliente convertirá el contenido a JSON y lo enviará a la Server Action correspondiente.
    *   Si hay un error en alguna fila del CSV, se muestra un `Alert` rojo indicando el rechazo de todo el archivo (REQ-03, REQ-05, REQ-07).
    *   Sección de mantenimiento con dos botones estándar para vaciar las tablas de datos y limpiar los logs de auditoría (REQ-09).

---

### 5. Parser CSV de Cliente Simplificado

Se usará una función básica de parsing de strings CSV a arrays de objetos JSON para enviarlos directamente a las Server Actions existentes:

```typescript
export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const headers = lines[0].split(",").map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = line.split(",").map(v => v.trim());
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || "";
    });
    return obj;
  });
}
```

*Nota: Se exigirá que los archivos CSV subidos cuenten exactamente con las cabeceras requeridas en inglés (`code`, `name`, `abbreviation`, `groups` para cursos; `username`, `password`, `name`, `courseCode` para docentes; y `cui`, `name` para estudiantes).*

---

### 6. Pruebas de Interfaces (Vitest)

Se creará una suite de pruebas con `@testing-library/react` enfocada en:

1.  **Validación de límites de tiempo (REQ-15):** Casos de frontera en el envío de asistencias (antes de expirar, límite exacto `0s`, y expirado por `+1s`).
2.  **Prevención de duplicados (REQ-16):** Doble envío del mismo estudiante.
3.  **Carga e invalidación de CSV:** Rechazo completo del lote si una fila no cumple con las reglas.
