<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Instrucciones de Inicio para Agentes de Desarrollo

Si eres un agente de IA asignado a este repositorio, **DEBES** seguir estos pasos obligatorios antes de realizar cualquier cambio en el código:

## 1. Fase de Inducción y Lectura de Documentación
Antes de escribir cualquier línea de código, lee en su totalidad el siguiente archivos para comprender el contexto operativo y las reglas de negocio:
*   @REQUIREMENTS.md: Especificación detallada de requerimientos del sistema AulaPass.

## 2. Reglas de Desarrollo Estandarizado
*   **Gestor de Paquetes**: Utiliza siempre `bun` para ejecutar tareas y añadir dependencias.
*   **Calidad de Código**: Ejecuta `bun run format` y `bun run lint` (utilizando Biome) antes de finalizar tu tarea para mantener el estándar del repositorio.
