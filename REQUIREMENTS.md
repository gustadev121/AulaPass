## Matriz de Requerimientos

### Módulo: Administración

| ID | Requerimiento | Reglas de Negocio / Validaciones |
| --- | --- | --- |
| **REQ-01** | Autenticación Admin | - Usuario y contraseña hardcodeados.<br>- No maneja sesión (al recargar pide login). |
| **REQ-02** | Navegación Admin | - Menú lateral para navegar entre: Cursos, Docentes, Estudiantes y Auditoría. |
| **REQ-03** | Carga CSV: Cursos | - Upsert: Si el código existe, actualiza.<br>- Duplicados en CSV: predomina el último.<br>- Invalidez: Si una fila es inválida, se rechaza todo el CSV. |
| **REQ-04** | Validaciones: CSV Cursos | - Código: Exactamente 7 caracteres.<br>- Abreviatura: No vacío.<br>- Nombre: No vacío.<br>- Grupos: Separados por comas, mínimo 1 grupo, cada grupo de exactamente 1 letra. |
| **REQ-05** | Carga CSV: Docentes | - Upsert: Si el usuario existe, actualiza.<br>- Invalidez: Si una fila es inválida, se rechaza todo el CSV. |
| **REQ-06** | Validaciones: CSV Docentes | - Usuario: No vacío.<br>- Contraseña: No vacío.<br>- Nombre: No vacío.<br>- Código de curso: Debe existir en el sistema. |
| **REQ-07** | Carga CSV: Estudiantes | - Upsert: Si el CUI existe, actualiza.<br>- Invalidez: Si una fila es inválida, se rechaza todo el CSV. |
| **REQ-08** | Validaciones: CSV Estudiantes | - CUI: Exactamente 8 caracteres.<br>- Nombre: No vacío. |
| **REQ-09** | Gestión de Tablas y Limpieza | - Vistas de Cursos, Docentes, Estudiantes y Auditoría son solo tablas.<br>- Hay un boton para vaciar todos los datos (cursos, docentes, estudiantes) y uno separado para vaciar los registros de auditoria, las tablas usan on delete set null. |

### Módulo: Docente

| ID | Requerimiento | Reglas de Negocio / Validaciones |
| --- | --- | --- |
| **REQ-10** | Autenticación Docente | - Login contra los datos cargados en el CSV de docentes.<br>- Sin manejo de sesión. |
| **REQ-11** | Configuración de Clase | - Letra del grupo: Debe existir en los grupos del curso asignado.<br>- Longitud de código: Mínimo 6, máximo 12 caracteres.<br>- Duración del código: Mínimo 5s, máximo 30s en pantalla.<br>- Esta configuración es volátil y se pierde al salir/refrescar. |
| **REQ-12** | Generación de Código Dinámico | - Acción manual mediante un botón "Generar".<br>- El código debe ser único globalmente en el sistema en ese instante.<br>- Se muestra en pantalla el codigo y un contador regresivo basado en la duración. |

### Módulo: Estudiante

| ID | Requerimiento | Reglas de Negocio / Validaciones |
| --- | --- | --- |
| **REQ-13** | Autenticación Estudiante | - El estudiante ingresa únicamente con su CUI (debe estar registrado).<br>- Sin manejo de sesión. |
| **REQ-14** | Registro de Asistencia | - El sistema no valida si el estudiante pertenece formalmente al curso/grupo.<br>- Si el código coincide y está activo, se registra. |
| **REQ-15** | Validaciones de Tiempo (Límites) | - Prueba de límites: +1s (Inválido), 0s (Válido, en el límite exacto de expiración), -1s (Válido). |
| **REQ-16** | Control de Duplicados | - Si un estudiante intenta registrar asistencia con un código en el que ya firmó (mismo dia+curso+grupo+estudiante), el sistema rechaza el registro y muestra un mensaje específico. |
| **REQ-17** | Auditoría de Asistencia | - Al registrarse con éxito, se crea una entrada en la tabla de auditoría guardando: Fecha, Curso, NombreCurso, Grupo, NombreGrupo, Estudiante, NombreEstudiante. |
