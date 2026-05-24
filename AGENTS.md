<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Instrucciones de Inicio para Agentes de Desarrollo

Si eres un agente de IA asignado a este repositorio, **DEBES** seguir estos pasos obligatorios antes de realizar cualquier cambio en el código:

## 1. Fase de Inducción y Lectura de Documentación
Antes de escribir cualquier línea de código, lee en su totalidad los siguientes archivos para comprender el contexto operativo, las reglas de negocio y las responsabilidades del equipo:
*   @REQUIREMENTS.md: Especificación detallada de requerimientos del sistema AulaPass, incluyendo tolerancia dinámica, faltas automáticas y cierres de sesión por olvido.
*   @IMPLEMENTATION_PLAN.md: Plan de implementación del equipo. Identifica qué integrante/rol representas y cuál es tu tarea asignada.

## 2. Reglas de Desarrollo Estandarizado
*   **Gestor de Paquetes**: Utiliza siempre `bun` para ejecutar tareas y añadir dependencias.
*   **Persistencia Local**: Usa el esquema de base de datos local SQLite configurado con Drizzle ORM en `src/db/schema.ts`.
*   **Integración Universitaria**: No intentes conectar con bases de datos externas reales de la universidad. Utiliza y expande la capa de servicios mock definida en `src/lib/university-service.ts`.
*   **Lógica Desacoplada**: La lógica de negocio temporal y matemática debe residir estrictamente en funciones puras en `src/lib/attendance-rules.ts`. El cálculo de asistencias debe ser determinista e inyectar `currentTime: Date`.
*   **Testing de Caja Negra**: Escribe tus pruebas utilizando **Vitest** en archivos `.test.ts`. El objetivo es cubrir el 100% de las Particiones de Equivalencia y Valores Límite diseñados por el Analista de QA. No implementes pruebas visuales de UI.
*   **Calidad de Código**: Ejecuta `bun run format` y `bun run lint` (utilizando Biome) antes de finalizar tu tarea para mantener el estándar del repositorio.
