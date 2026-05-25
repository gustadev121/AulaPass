# Plan de Implementación Armonizado - AulaPass (UNSA)

Este plan de implementación integra los roles del equipo original con la arquitectura técnica estandarizada para el desarrollo con agentes. Se define un **Hito Inicial** (Starter Kit) que provee las interfaces y bases de código comunes para que los integrantes puedan trabajar de forma totalmente paralela e independiente utilizando **Bun**, **SQLite**, **Drizzle ORM** y **Vitest**.

---

## Hito Inicial: Configuración del Starter Kit (Agente de IA)
**Objetivo:** Establecer la infraestructura, las dependencias comunes y los contratos de datos (interfaces TypeScript y esquemas de base de datos) que servirán como punto de partida y puente de comunicación entre todos los desarrolladores.

- **Tarea 0.1: Instalación de Herramientas Estándar:** Inicializar las dependencias del proyecto usando `bun`: `zod`, `drizzle-orm`, `better-sqlite3`, `date-fns` y `qrcode`. Configurar `vitest` y `drizzle-kit` como dependencias de desarrollo.
- **Tarea 0.2: Esquemas de Persistencia Local [src/db/schema.ts]:** Configurar Drizzle ORM para SQLite local que contenga las tablas transaccionales del aula: `sessions`, `attendances` y `audit_logs`.
- **Tarea 0.3: Definición del Contrato del Servicio Universitario [src/lib/university-service.ts]:** Diseñar las interfaces TypeScript y las funciones mockeadas que simulan las consultas de alumnos, profesores, cursos y horarios al sistema central de la UNSA.
- **Tarea 0.4: Firmas del Motor de Reglas de Asistencia [src/lib/attendance-rules.ts]:** Declarar las firmas de las funciones puras encargadas del cálculo del estado de asistencia con inyección obligatoria de tiempo (`currentTime`), permitiendo al Frontend y al Ingeniero de QA trabajar sobre contratos estables.

---

## Integrante 1: Desarrollador Frontend (Capa de Presentación)
**Objetivo:** Construir la experiencia visual del usuario en el aula y en el panel docente en base a las interfaces del Starter Kit, utilizando datos simulados (mock data).
*Herramienta Visual:* Íconos nativos de **Flowbite React**.

- **Tarea 1.1: Vista del Quiosco de Entrada [RF-01, RF-03]:**
  * Implementar la interfaz del tótem en pantalla completa con campo de texto autoenfocado y activo.
  * Validar en el cliente (usando `zod` e inputs nativos) que el identificador ingresado contenga únicamente 8 caracteres numéricos, impidiendo el envío si es inválido.
- **Tarea 1.2: Panel Administrativo del Aula [RF-02, RF-07, RF-14]:**
  * Diseñar el panel seguro del docente para la configuración de tolerancias (estática/dinámica).
  * Construir la cuadrícula para la modificación de estados de asistencia y visualización de logs de auditoría basada en las interfaces del Starter Kit.
- **Tarea 1.3: Motor de Estados Visuales y Temporizador [RF-15, RF-16]:**
  * Programar el cambio temporal de color a pantalla completa (Verde, Ámbar, Rojo, Azul) en respuesta al estado de la marcación.
  * Implementar un temporizador exacto de 3 segundos para el restablecimiento automático de la interfaz.

---

## Integrante 2: Desarrollador Backend (Infraestructura de API y Datos)
**Objetivo:** Configurar el servidor local, los endpoints de la API en NextJS y la persistencia en la base de datos SQLite usando Drizzle.
*Dependencia:* Consume los esquemas transaccionales del Starter Kit e invoca la API del servicio universitario mockeado.

- **Tarea 2.1: Endpoints de Marcación del Kiosco [RF-04, RF-05, RF-06, RNF-02]:**
  * Implementar la ruta API para procesar el ingreso de identificadores del tótem en menos de 150ms.
  * Consumir las funciones de `university-service.ts` para verificar la validez del estudiante/docente y usar la base de datos local SQLite para registrar la marcación.
- **Tarea 2.2: Endpoints de Sesión y Contingencia [RF-08, RF-12, RF-14]:**
  * Programar los endpoints para registrar el ingreso docente, activar la contingencia virtual (generando el código QR) y guardar las modificaciones manuales con su respectivo historial de auditoría.
- **Tarea 2.3: Control de Excepciones y Robustez [RNF-01]:**
  * Asegurar que los endpoints capturen de forma segura las excepciones lógicas (como dobles marcaciones o formatos corruptos) y retornen respuestas de error estructuradas que el frontend pueda pintar en rojo (RF-15).

---

## Integrante 3: Analista de QA (Diseño Teórico de Pruebas de Caja Negra)
**Objetivo:** Diseñar la documentación de calidad y las matrices detalladas de casos de prueba. Su trabajo define las reglas que debe validar el código desarrollado por el Integrante 4.

- **Tarea 3.1: Matriz de Particiones de Equivalencia (PE) [RF-03, RF-04, RF-11]:**
  * Identificar clases de equivalencia válidas e inválidas para los CUI de 8 dígitos.
  * Definir combinaciones de entrada (alumno matriculado en grupo, alumno de otra sección por flexibilidad, y alumno en hora hueco).
- **Tarea 3.2: Matriz de Análisis de Valores Límite (AVL) [RF-07, RF-10, RF-13]:**
  * Diseñar la casuística de tiempos límite exactos (1 segundo antes, al límite, y 1 segundo después del límite de tolerancia estática/dinámica, inasistencia docente y cierre de bloque).
- **Tarea 3.3: Casos de Robustez y Fraude [RF-09, RNF-01]:**
  * Mapear secuencias lógicas anómalas (dos entradas consecutivas sin salida, reintento de marcación tardía o ingresos con la sesión suspendida).

---

## Integrante 4: Ingeniero de QA y Core Lógico (Cerebro del Sistema)
**Objetivo:** Desarrollar el motor matemático/temporal y automatizar la suite de pruebas unitarias enfocada al 100% en pruebas de Caja Negra.
*Herramienta:* **Vitest**.

- **Tarea 4.1: Implementación del Motor Lógico [RF-07, RF-10, RF-11, RF-13, RNF-03]:**
  * Completar el archivo `src/lib/attendance-rules.ts` asegurando que las funciones sean puras y reciban un parámetro explícito `currentTime` para simular cualquier momento temporal.
- **Tarea 4.2: Lógica de Permanencia y Cierre Automático [RF-09, RF-13]:**
  * Implementar el algoritmo de alternancia automática Entrada/Salida basado en el historial diario del alumno.
  * Desarrollar la lógica que calcula la salida forzada por cierre de sesión al fin de la hora de clase.
- **Tarea 4.3: Automatización de Pruebas Unitarias [RNF-01, RNF-03]:**
  * Crear los archivos de tests (`.test.ts`) utilizando Vitest para automatizar las matrices de Particiones de Equivalencia y Valores Límite diseñadas por el Integrante 3, logrando una cobertura del 100% de los casos lógicos.
