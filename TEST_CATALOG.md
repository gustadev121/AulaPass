# Catálogo de Pruebas de Caja Negra - AulaPass (UNSA) - V3 (Final)

Este documento contiene el catálogo exhaustivo y definitivo de casos de prueba de caja negra, diseñado mediante las técnicas de **Partición de Equivalencia (PE)** y **Análisis de Valores Límite (AVL)**. Cubre todas las reglas de negocio especificadas en los Requerimientos Funcionales (RF), No Funcionales (RNF) y Plan de Implementación para asegurar el 100% de cobertura lógica en la suite de pruebas automatizadas (Vitest).

## Módulo 1: Acceso, Interfaz de Marcación e Identificación

| ID Caso | Descripción | Requerimiento | Datos de Entrada / Estado | Resultado Esperado | Técnica |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-1.01 | Identificador numérico válido exacto (8 dígitos) | RF-03 | Input: "12345678" | Entrada aceptada, validación de formato exitosa. | AVL / PE |
| TC-1.02 | Identificador con espacios en blanco a los extremos | RF-03 | Input: "  12345678  " | Entrada aceptada (espacios ignorados), procesado lógicamente como "12345678". | PE |
| TC-1.03 | Identificador menor al límite (7 dígitos) | RF-03 | Input: "1234567" | Entrada rechazada inmediatamente. | AVL |
| TC-1.04 | Identificador mayor al límite (9 dígitos) | RF-03 | Input: "123456789" | Entrada rechazada inmediatamente. | AVL |
| TC-1.05 | Identificador que contiene letras | RF-03 | Input: "1234abcd" | Entrada rechazada inmediatamente. | PE |
| TC-1.06 | Identificador con caracteres especiales | RF-03 | Input: "1234567!" | Entrada rechazada inmediatamente. | PE |
| TC-1.07 | Identificador vacío o nulo | RF-03 | Input: "" | Entrada rechazada inmediatamente. | PE |
| TC-1.08 | Identificador con espacios intermedios (8 caracteres) | RF-03 | Input: "1234 567" | Entrada rechazada inmediatamente por formato inválido. | PE |
| TC-1.09 | Identificador numérico negativo (8 caracteres) | RF-03 | Input: "-1234567" | Entrada rechazada inmediatamente por contener un signo (carácter especial). | PE |
| TC-1.10 | Identificador con ceros a la izquierda (Leading Zeros) | RF-03 | Input: "01234567" | Entrada aceptada. Procesado como string numérico de 8 caracteres (no como entero de 7). | PE |
| TC-1.11 | Autenticación de Panel Docente: Código docente válido | RF-02 | Ingreso de código docente correcto (8 dígitos). | Acceso concedido al panel administrativo del aula. | PE |
| TC-1.12 | Autenticación de Panel Docente: Código docente inválido | RF-02 | Ingreso de código docente erróneo o con formato inválido. | Acceso denegado. Se muestra mensaje de error. | PE |

## Módulo 2: Flexibilidad de Grupos Académicos y Registro Automatizado

| ID Caso | Descripción | Requerimiento | Datos de Entrada / Estado | Resultado Esperado | Técnica |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-2.01 | Alumno matriculado en la sección oficial activa | RF-04 | ID de un alumno regular de la sesión. | Registro de asistencia exitoso y asociado a la sesión. | PE |
| TC-2.02 | Alumno matriculado en otra sección del mismo curso (Flexibilidad) | RF-04 | ID de un alumno de grupo paralelo (Ej: Grupo B asiste a Grupo A). | Registro de asistencia exitoso (acuerdo excepcional autorizado). | PE |
| TC-2.03 | Alumno no matriculado en el curso en absoluto | RF-04 | ID de alumno ajeno a la asignatura. | Registro rechazado por el sistema. | PE |
| TC-2.04 | Autogeneración de sesión: Alumno válido ingresa primero | RF-05 | Sesión inactiva. Ingresa un ID de alumno válido (TC-2.01/2.02). | Creación automática de la sesión basada en el horario oficial. Asistencia registrada. | PE |
| TC-2.05 | Autogeneración de sesión: Alumno inválido ingresa primero | RF-05 | Sesión inactiva. Ingresa un ID de alumno ajeno. | La sesión no se crea. Entrada rechazada. | PE |
| TC-2.06 | Ingreso con sesión ya generada | RF-05 | Sesión ya activa. Ingresa alumno válido. | No se duplica la sesión. Asistencia registrada con normalidad en la sesión en curso. | PE |

## Módulo 3: Control de Asistencia del Docente y Tolerancia Dinámica

*(Nota: Tolerancia para inasistencia docente definida como 20 minutos desde inicio oficial)*

| ID Caso | Descripción | Requerimiento | Datos de Entrada / Estado | Resultado Esperado | Técnica |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-3.01 | Ingreso de docente oficial asignado al curso (CUI) | RF-06 | CUI válido del docente titular. | Registra asistencia laboral. Habilita inicio oficial del dictado. | PE |
| TC-3.02 | Ingreso de docente ajeno al curso (CUI) | RF-06 | CUI de un profesor no asignado a la sesión. | Marcación rechazada. No inicia la sesión. | PE |
| TC-3.03 | Límite de inasistencia docente (1 segundo antes del límite) | RF-08 | Docente marca en T = 19m 59s. | Marcación procesada. Sesión inicia formalmente. | AVL |
| TC-3.04 | Límite de inasistencia docente (En el límite exacto) | RF-08 | Docente marca en T = 20m 00s. | Marcación procesada. Sesión inicia formalmente. | AVL |
| TC-3.05 | Límite de inasistencia docente (1 segundo después del límite) | RF-08 | T transcurrido = 20m 01s. | El sistema cierra la sesión, asigna estado "Clase Suspendida / Inasistencia Docente". | AVL |
| TC-3.06 | Actualización retroactiva tras suspensión por inasistencia | RF-08 | Alumnos marcaron entrada a los 5m. En T = 20m 01s se suspende. | Todos los alumnos ingresados heredan la etiqueta de "Clase Suspendida" y estado "Falta". | PE |
| TC-3.07 | Llegada de docente tras límite de suspensión (Intento reapertura) | RF-08 | Sesión ya suspendida. Docente marca en T = 20m 02s. | El sistema rechaza la marcación del docente y mantiene la sesión como clausurada. | AVL |
| TC-3.08 | Tolerancia Dinámica Automática por Llegada Tardía Docente | RF-07, 10 | Docente llega tarde (Ej: T=09:10 para clase 08:50). Alumno llega a T=09:11. | El sistema activa automáticamente la modalidad dinámica. Alumno marcado como **PUNTUAL** (dentro de los 15 min de tolerancia dinámica). | PE |


## Módulo 4: Flujos de Permanencia, Salida y Horas Hueco

*(Nota: Horario ficticio de Clase Inicia = 08:00:00, Tolerancia Máxima = 15 min, Cierre = 09:30:00)*

| ID Caso | Descripción | Requerimiento | Datos de Entrada / Estado | Resultado Esperado | Técnica |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-4.01 | Alternancia de flujo: Primera marcación | RF-09 | Identificador válido sin registros previos en el día. | Estado de marcación evaluado y registrado como **Entrada**. | PE |
| TC-4.02 | Alternancia de flujo: Segunda marcación | RF-09 | Identificador válido con un registro de Entrada existente. | Estado de marcación evaluado y registrado como **Salida**. | PE |
| TC-4.03 | Alternancia de flujo: Tercera marcación | RF-09 | Identificador con registros de Entrada y Salida completados. | Estado de marcación evaluado y registrado como **Entrada** (reingreso). | PE |
| TC-4.04 | Tolerancia Estática: Puntualidad (Antes de hora inicio) | RF-07, 10 | Modalidad Estática. Alumno marca a las 07:59:59. | Clasificado como **PUNTUAL**. | PE |
| TC-4.05 | Tolerancia Estática: Puntualidad (Límite exacto de inicio) | RF-07, 10 | Modalidad Estática. Alumno marca a las 08:00:00. | Clasificado como **PUNTUAL** (último milisegundo de puntualidad). | AVL |
| TC-4.06 | Tolerancia Estática: Puntualidad dentro de tolerancia (10 min post inicio) | RF-07, 10 | Modalidad Estática. Alumno marca a las 08:10:00. | Clasificado como **PUNTUAL** (dentro de los 15 min). | AVL |
| TC-4.07 | Tolerancia Estática: Puntualidad (Límite exacto de tolerancia) | RF-07, 10 | Modalidad Estática. Alumno marca a las 08:15:00. | Clasificado como **PUNTUAL** (último milisegundo aceptable). | AVL |
| TC-4.08 | Tolerancia Estática: Transición a Tardanza (1 seg post tolerance) | RF-07, 10 | Modalidad Estática. Alumno marca a las 08:15:01. | Clasificado como **TARDANZA** (fuera de límite de tolerancia). | AVL |
| TC-4.09 | Tolerancia Dinámica: Puntualidad (Límite exacto llegada prof) | RF-07, 10 | Docente llega a las 08:05:00. Alumno marca a las 08:05:00. | Clasificado como **PUNTUAL**. | AVL |
| TC-4.10 | Tolerancia Dinámica: Puntualidad (10 min post llegada docente) | RF-07, 10 | Docente llega a las 08:05:00. Alumno marca a las 08:15:00. | Clasificado como **PUNTUAL**. | AVL |
| TC-4.11 | Tolerancia Dinámica: Límite recalcula exacto | RF-07, 10 | Límite desplazado a 08:20:00. Alumno marca a las 08:20:00. | Clasificado como **PUNTUAL**. | AVL |
| TC-4.12 | Tolerancia Dinámica: Tardanza (1 seg post límite recalculado) | RF-07, 10 | Límite desplazado a 08:20:00. Alumno marca a las 08:20:01. | Clasificado como **TARDANZA**. | AVL |
| TC-4.13 | Uso de aula en bloque sin programación académica | RF-11 | Horario libre en sistema oficial. Alumno marca ingreso. | Estado neutral asignado: Entrada a **Ambiente de Estudio**. | PE |

| TC-4.14 | Llegada excesivamente temprana a clase futura | RF-11 | Clase inicia a las 10:00. Alumno ingresa a las 08:45. | Estado neutral asignado: Entrada a **Ambiente de Estudio**. | PE |
| TC-4.15 | Alternancia Entrada/Salida en Hora Hueco | RF-09, 11 | Alumno con registro previo de "Ambiente de Estudio" vuelve a marcar en el bloque libre. | Estado neutral asignado: Salida de **Ambiente de Estudio**. | PE |
| TC-4.16 | Day Rollover (Reinicio diario de historial de flujos) | RF-09 | Alumno marca Entrada a las 23:50 (día 1) sin marcar Salida. Marca el día 2 a las 08:00. | La marca del día 2 se registra como una nueva **Entrada**, reiniciando el flujo diario. | PE |
| TC-4.17 | Colisión de Entrada y Cierre de Bloque (Exact millisecond) | RF-13, 11 | T = 09:30:00. Alumno marca Entrada exactamente al cierre oficial. | El sistema NO lo registra en la clase que cierra; lo clasifica como inicio de **Ambiente de Estudio**. | AVL |

## Módulo 5: Resiliencia ante Errores Humanos y Modificaciones Manuales

*(Nota: Para el cierre de bloque, se asume que la clase finaliza a las 09:30:00).*

| ID Caso | Descripción | Requerimiento | Datos de Entrada / Estado | Resultado Esperado | Técnica |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-5.01 | Salida de estudiante justo antes del cierre del bloque | RF-12 | T = 09:29:59. Alumno marca salida normalmente. | Salida registrada por el usuario en el timestamp exacto. | AVL |
| TC-5.02 | Salida de estudiante en el límite exacto del cierre | RF-12 | T = 09:30:00. Alumno marca salida en ese segundo. | Salida registrada por el usuario con normalidad (previo al cierre automático de huérfanos). | AVL |
| TC-5.03 | Cierre Automático forzado por olvido (1 seg post cierre) | RF-12 | T = 09:30:01. Hay alumnos con estado "dentro del aula". | El sistema autocompleta la salida de todos. Etiqueta: "Salida por Cierre de Sesión" en T = 09:30:00. | AVL |
| TC-5.04 | Marcación física posterior al cierre automático | RF-12, 11 | T = 09:35:00. Alumno (que fue auto-retirado a las 09:30) vuelve a marcar físicamente. | Se registra como una nueva Entrada bajo el concepto de **Ambiente de Estudio**. | AVL/PE |
| TC-5.05 | Modificación manual autorizada: Alteración de estado | RF-13 | Panel docente. Se cambia estado de Falta a Tardanza. | Cambio guardado en BD. Se inserta un registro en el log de auditoría. | PE |
| TC-5.06 | Modificación manual autorizada: Anulación de registro | RF-13 | Panel docente. Se anula una marcación previa. | Marca eliminada/invalidada. Se inserta un registro en el log de auditoría. | PE |
| TC-5.07 | Modificación manual autorizada: Añadir nuevo registro | RF-13 | Panel docente. El profesor inserta a un alumno sin marcas previas en el día. | Registro de asistencia creado exitosamente desde cero en la BD con su log de auditoría. | PE |

## Módulo 6: Respuesta Visual en Pantalla

| ID Caso | Descripción | Requerimiento | Datos de Entrada / Estado | Resultado Esperado | Técnica |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-6.01 | Respuesta UI para registro exitoso Puntual | RF-14 | Motor lógico devuelve estado: Puntual. | La interfaz muta a color **Verde**. | PE |
| TC-6.02 | Respuesta UI para registro exitoso Tardanza | RF-14 | Motor lógico devuelve estado: Tardanza. | La interfaz muta a color **Ámbar**. | PE |
| TC-6.03 | Respuesta UI para registro Salida o Ambiente de Estudio | RF-14 | Motor lógico devuelve estado: Salida / Ambiente Estudio. | La interfaz muta a color **Azul**. | PE |
| TC-6.04 | Respuesta UI para registro denegado / Falta | RF-14 | Motor lógico devuelve estado: Falta, Inválido o Error. | La interfaz muta a color **Rojo**. | PE |
| TC-6.05 | Temporizador de Restablecimiento UI (10ms antes de reset) | RF-15 | T = 2.99 segundos tras marcación. | La pantalla mantiene el color de respuesta asignado. | AVL |
| TC-6.06 | Temporizador de Restablecimiento UI (En el límite exacto) | RF-15 | T = 3.00 segundos exactos. | La interfaz visual se limpia y regresa al estado base. | AVL |
| TC-6.07 | Temporizador de Restablecimiento UI (10ms después del reset)| RF-15 | T = 3.01 segundos. | La interfaz permanece en estado base. | AVL |
| TC-6.08 | Auto-Focus del Campo de Ingreso Post-Restablecimiento | RF-01 | UI acaba de restablecerse tras 3 segundos. | El input HTML recupera el `focus` automáticamente, listo para capturar sin interacción de mouse/teclado. | PE |

## Casos Transversales de Robustez (RNF)

| ID Caso | Descripción | Requerimiento | Datos de Entrada / Estado | Resultado Esperado | Técnica |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-7.01 | Sobrecarga de longitud en input | RNF-01 | Input recibe un string numérico de 1000 caracteres. | Procesamiento truncado/rechazado seguro. Muestra pantalla de error sin caída (crash). | PE |
| TC-7.02 | Doble marcación por concurrencia extrema | RNF-01 | Mismo ID se envía 2 veces en menos de 50 milisegundos. | Resuelve concurrencia descartando la duplicidad (Error 429). | PE |

| TC-7.03 | Inaccesibilidad del servicio mock universitario | RNF-01 | API mock `university-service` no responde o falla. | Sistema captura excepción, muestra notificación roja y se recupera de inmediato. | PE |
| TC-7.04 | Rendimiento de Procesamiento (1ms antes del umbral) | RNF-02 | Tiempo total de respuesta de 149 milisegundos. | Procesado validado exitosamente dentro del margen esperado. | AVL |
| TC-7.05 | Rendimiento de Procesamiento (Límite exacto de umbral) | RNF-02 | Tiempo total de respuesta de 150 milisegundos. | Procesado validado exitosamente (en el límite exigido). | AVL |
| TC-7.06 | Rendimiento de Procesamiento (1ms después del umbral) | RNF-02 | Tiempo total de respuesta de 151 milisegundos. | Supera el umbral. Ejecución del manejador de timeout/advertencia si aplica, o registro en logs. | AVL |
| TC-5.08 | Marcación física detona cierre automático diferido | Sesión expirada y alumno marca. | El sistema cierra la sesión expirada, realiza auto-checkouts, y procesa la nueva marcación. | AVL/PE |

