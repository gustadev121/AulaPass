# AulaPass (UNSA) - Sistema de Control de Asistencia y Acceso

**AulaPass** es un sistema de control de acceso y registro de asistencia diseñado para las aulas de la Universidad Nacional de San Agustín (UNSA), operando como un Tótem de Autoservicio en puerta integrado con un Panel de Administración para el docente. El sistema equilibra la puntualidad con la flexibilidad horaria, la asistencia intergrupo y la permanencia en ambientes de estudio.

---

## 🚀 Stack Tecnológico

*   **Core**: Next.js (App Router, React 19) + TypeScript
*   **Estilos y Componentes**: Tailwind CSS + Flowbite React (con íconos nativos de Flowbite)
*   **Persistencia Local**: SQLite + Drizzle ORM (`better-sqlite3`)
*   **Gestor de Paquetes**: Bun
*   **Testing**: Vitest (Enfoque exclusivo en pruebas unitarias y de integración de Caja Negra)
*   **Calidad**: Biome (Linter y Formateador)

---

## 🛠️ Comandos de Ejecución

Asegúrate de tener instalado [Bun](https://bun.sh/) en tu sistema.

### Instalación de dependencias
```bash
bun install
```

### Ejecutar servidor de desarrollo
```bash
bun run dev
```

### Compilar para producción
```bash
bun run build
```

---

## 📂 Base de Datos (Drizzle)

El sistema utiliza SQLite a nivel transaccional local. Los comandos para gestionar el esquema son:

*   **Generar migraciones**: `bun run db:generate`
*   **Ejecutar migraciones**: `bun run db:migrate`
*   **Sincronizar esquema directamente**: `bun run db:push`

---

## 🧪 Calidad y Pruebas

Toda la lógica de negocio se prueba de forma aislada mediante pruebas de caja negra por consola.

*   **Ejecutar tests unitarios (Vitest)**: `bun run test`
*   **Ejecutar tests en modo watch**: `bun run test:watch`
*   **Formatear código (Biome)**: `bun run format`
*   **Ejecutar linter (Biome)**: `bun run lint`
