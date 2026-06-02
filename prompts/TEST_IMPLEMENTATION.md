## Plan de Implementación de las Pruebas 

## Objetivo

Implementar una suite de pruebas automatizadas que valide el comportamiento **observable** del sistema AulaPass desde el exterior, manteniendo la perspectiva de un tester externo. La fuente de verdad absoluta para este desarrollo será la combinación de `REQUIREMENTS.md` y `TEST_CATALOG.md`. Las pruebas se organizarán estrictamente por **grupo funcional** en lugar de seguir la estructura de carpetas del código fuente.

## Archivos Clave y Contexto

* `src/test/unit/__mocks__/db.ts`: **Nuevo archivo.** Mock centralizado y compartido del cliente Drizzle (`@/db`) para aislar los tests de la base de datos PostgreSQL.
* `src/lib/auth/admin-auth.ts`: **Nuevo archivo.** Contendrá la función pura `validateAdminCredentials` extraída de la UI para posibilitar las pruebas de caja negra.
* `src/lib/validations/csv-schemas.ts`: Archivo existente que contiene los esquemas de validación Zod (`CourseCSVSchema`, `TeacherCSVSchema`, `StudentCSVSchema`) a testear.
* `src/test/unit/`: **Nueva carpeta.** Contenedora de toda la suite de pruebas unitarias y de integración black box con prefijos numéricos para ordenar el reporte de ejecución.
* `vitest.config.ts`: Requiere una extensión multi-proyecto para dar soporte al nuevo entorno de ejecución (`node`) sin alterar el entorno visual existente (`jsdom`).

## Pasos de Implementación

### 1. Refactorización de Arquitectura y Configuración del Entorno

**Objetivo:** `src/app/admin/login/page.tsx`, `src/lib/auth/admin-auth.ts` y `vitest.config.ts`

* **Extracción de Lógica Pura:** Mover la lógica de comparación de credenciales de administrador (`username === "admin" && password === "admin"`) fuera del componente de React hacia `src/lib/auth/admin-auth.ts` bajo la función `validateAdminCredentials(username, password)`.
* **Aislamiento de Entornos en Vitest:** Modificar `vitest.config.ts` para separar la ejecución de los tests existentes de los nuevos mediante `projects`:

```ts
test: {
  projects: [
    { environment: 'jsdom', include: ['src/test/bdd/**'] },
    { environment: 'node', include: ['src/test/unit/**'] }
  ]
}

```

* **Creación de Mock Global:** Configurar el mock de Drizzle ORM en `src/test/unit/__mocks__/db.ts` utilizando `vi.mock('@/db')` y `vi.fn()` para interceptar de forma genérica las consultas y operaciones de persistencia.

### 2. Implementación de Tests de Autenticación y Validación de CSVs

**Objetivo:** `src/test/unit/` (Archivos `01` al `05`)

* **`01-admin-login.test.ts` (REQ-01):** Validar la función pura de credenciales del administrador. Probar el escenario de éxito (`P_Adm_Login_01`) y el escenario de rechazo por contraseña inválida (`P_Adm_Login_02`).
* **`02-csv-cursos.test.ts` (REQ-03, REQ-04):** Testear de manera directa `CourseCSVSchema.safeParse()`. Aplicar Análisis de Valores Límite (AVL) sobre la longitud del código (6, 7 y 8 caracteres) y la estructura de los grupos (vacío, letras separadas por comas, múltiples letras juntas). Verificar que `uploadCoursesAction` aborte y no interactúe con la base de datos si el esquema falla.
* **`03-csv-docentes.test.ts` (REQ-05, REQ-06):** Validar los campos de formato con `TeacherCSVSchema`. Configurar el mock de `@/db` en `uploadTeachersAction` para simular un fallo por violación de clave foránea (FK) cuando el código del curso provisto en el CSV no exista en el sistema (`P_Doc_Cod_02`).
* **`04-csv-estudiantes.test.ts` (REQ-07, REQ-08):** Testear de manera directa `StudentCSVSchema.safeParse()`. Comprobar mediante AVL que el CUI cumpla estrictamente con la restricción de longitud de 8 caracteres (`P_Est_CUI_01` a `03`).
* **`05-login-docente.test.ts` (REQ-10):** Probar `validateTeacherLoginAction` inyectando respuestas controladas en `db.query.teachers.findFirst`. Validar el retorno correcto del objeto de datos en credenciales válidas y el mensaje de error estructurado ante una contraseña errónea.

### 3. Implementación de Tests de Reglas de Negocio Complejas

**Objetivo:** `src/test/unit/` (Archivos `06` al `09`)

* **`06-configuracion-clase.test.ts` (REQ-11):** Probar `generateCodeAction`. Mockear la respuesta del curso para simular los grupos permitidos (`"A,B"`). Aplicar AVL exhaustivo sobre los límites exactos de los campos:
* **Longitud del código:** Fronteras en 5, 6, 7, 11, 12 y 13 caracteres.
* **Duración del código:** Fronteras en 4s, 5s, 6s, 29s, 30s y 31s.


* **`07-login-estudiante.test.ts` (REQ-13):** Probar `validateStudentCuiAction` interceptando `db.query.students.findFirst` para verificar los flujos de CUI registrado y CUI no registrado.
* **`08-marcacion-expiracion.test.ts` (REQ-14, REQ-15):** Testear `registerAttendanceAction` controlando los valores de `clientTimestamp` en relación a `codeExpiration`. Validar las tres fronteras de tiempo críticas:
* **F-1 (Antes de expirar):** `now - 1000ms` $\rightarrow$ Retorna éxito.
* **F Exacta (Límite):** `now === codeExpiration` $\rightarrow$ Retorna éxito.
* **F+1 (Expirado):** `now + 1000ms` $\rightarrow$ Retorna error por expiración.


* **`09-prevencion-duplicados.test.ts` (REQ-16, REQ-17):** Testear `registerAttendanceAction` controlando la respuesta de `db.query.attendanceAudit.findFirst`. Asegurar que si devuelve `undefined`, se efectúe la llamada a `db.insert`, y si devuelve un registro preexistente para el mismo día, la acción lo deniegue y nunca ejecute la inserción.

## Verificación

* **Ejecución del Runner:** Utilizar exclusivamente el comando configurado bajo el entorno runtime optimizado:
```bash
bun --bun run test

```


* **Reporte Funcional:** Verificar que los 9 archivos secuenciales se ejecuten en el orden establecido, sin colisiones de entornos ESM (`ERR_REQUIRE_ESM`) ni dependencias colgadas del DOM, mostrando toda la matriz en verde.
