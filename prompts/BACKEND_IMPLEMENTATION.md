# Plan de Implementación del Backend

## Objetivo

Implementar la funcionalidad completa del backend para el sistema AulaPass de acuerdo con la matriz de REQUIREMENTS.md, enfocándose en la Autenticación, Generación de Códigos Volátiles y Validación Estricta de Asistencia por Tiempo. El sistema dependerá de PostgreSQL para la persistencia, aplicará validación del lado del servidor para evitar manipulaciones y utilizará Estado Puro de React para la autenticación "sin sesiones" (session-less).

## Archivos Clave y Contexto

* `src/db/schema.ts`: Necesita una nueva tabla `active_codes` para almacenar los códigos volátiles generados dinámicamente.
* `src/lib/actions/auth-actions.ts`: Nuevo archivo para acciones del servidor (server actions) relacionadas con el inicio de sesión de Administradores, Profesores y Estudiantes.
* `src/lib/actions/teacher-actions.ts`: Nuevo archivo para manejar la generación de códigos volátiles.
* `src/lib/actions/attendance-actions.ts`: Archivo existente que se reestructurará (refactorizará) fuertemente para la búsqueda de códigos del lado del servidor, límites estrictos de tiempo y limpieza de códigos.

## Pasos de Implementación

### 1. Actualizaciones del Esquema de la Base de Datos

**Objetivo:** `src/db/schema.ts`

* Agregar una nueva tabla `active_codes` con las siguientes columnas:
* `code`: `text("code").primaryKey()`
* `courseCode`: `text("course_code").notNull()`
* `courseName`: `text("course_name").notNull()`
* `groupLetter`: `text("group_letter").notNull()`
* `teacherUsername`: `text("teacher_username").notNull()`
* `expiresAt`: `timestamp("expires_at").notNull()`


* Ejecutar las migraciones de la base de datos (`bun run db:generate` y `bun run db:push`).

### 2. Acciones de Autenticación

**Objetivo:** `src/lib/actions/auth-actions.ts`

* Crear `loginAdmin(username, password)`: Valida contra credenciales predefinidas (hardcoded). Devuelve un booleano indicando el éxito.
* Crear `loginTeacher(username, password)`: Consulta la tabla `teachers` buscando una coincidencia exacta. Devuelve un booleano de éxito y el `courseCode` si es válido.
* Crear `loginStudent(cui)`: Consulta la tabla `students`. Devuelve un booleano de éxito y el nombre (`name`) del estudiante si es válido.
*(Nota: Como se acordó, no se establecen cookies ni sesiones. El cliente almacenará el resultado en el estado de React).*

### 3. Acciones del Profesor (Generación de Códigos)

**Objetivo:** `src/lib/actions/teacher-actions.ts`

* Crear `generateCodeAction(courseCode, groupLetter, teacherUsername, durationSeconds)`:
* **Validación:** Buscar el curso para verificar que el `groupLetter` exista en la lista de grupos (`groups`) del curso. Asegurar que `durationSeconds` esté entre 5 y 30.
* **Generación:** Generar un código alfanumérico único (mínimo 6, máximo 12 caracteres). Verificar en `active_codes` para asegurar que sea globalmente único.
* **Persistencia:** Insertar en `active_codes` con `expiresAt = new Date(Date.now() + durationSeconds * 1000)`.
* **Limpieza:** Implementar un mecanismo en segundo plano o aprovechar las solicitudes posteriores para eliminar los códigos expirados de `active_codes`.



### 4. Refactorización de Acciones de Asistencia

**Objetivo:** `src/lib/actions/attendance-actions.ts`

* Refactorizar `registerAttendanceAction(cui, code)`:
* **Búsqueda:** Consultar `active_codes` donde coincida el `code`. Si no se encuentra, lanzar el error "Código inválido o expirado".
* **Verificación de Expiración (REQ-15):** Realizar una verificación estricta del lado del servidor: `if (new Date() > activeCode.expiresAt)`. Si ha expirado, eliminarlo de la base de datos y lanzar el error "El código ha expirado".
* **Validación:** Consultar la tabla `students` usando el `cui` para obtener el nombre del estudiante.
* **Verificación de Duplicados (REQ-16):** Consultar `attendanceAudit` para asegurar que no exista ningún registro para este `cui`, `courseCode` y `groupLetter` en el día calendario actual. Si existe, lanzar el error "Ya has registrado asistencia para este curso y grupo hoy".
* **Registro de Auditoría:** Insertar el registro en `attendanceAudit`.
* **Mantenimiento:** Ejecutar un comando rápido `DELETE FROM active_codes WHERE expires_at < NOW()` para limpiar los códigos expirados de forma asíncrona.



## Verificación

* Pruebas manuales locales de los inicios de sesión de Administrador, Profesor y Estudiante.
* Pruebas manuales locales del flujo de generación de códigos y de asistencia (incluyendo los límites de expiración y la prevención de duplicados).
