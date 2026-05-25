# Especificación de Requerimientos - AulaPass (UNSA)

## 1. Resumen del Sistema

**AulaPass** es un sistema de control de acceso y registro de asistencia diseñado específicamente para la realidad operativa de las aulas de la Universidad Nacional de San Agustín (UNSA). El sistema se ejecuta en un dispositivo físico (computadora o tablet) ubicado en la entrada de cada salón de clases, funcionando bajo un concepto de "Tótem de Autoservicio" complementado con un panel de administración para el docente.

A diferencia de los sistemas de asistencia rígidos tradicionales, **AulaPass** equilibra el control estricto de puntualidad con la flexibilidad de los acuerdos cotidianos entre alumnos y profesores de la UNSA (como la asistencia intergrupal, los cambios de horario improvisados y el uso de las aulas como ambientes de estudio durante las horas hueco). El sistema está diseñado para capturar la identidad mediante el Código Único de Identidad (CUI), procesar de manera inteligente la hora del registro respecto al horario oficial (obtenido mediante la integración mockeada con el sistema de la universidad) y las acciones del docente, y notificar visualmente el resultado de forma instantánea.

---

## 2. Requerimientos Funcionales (RF)

A continuación, se presentan las tablas de requerimientos funcionales del sistema, enfocados estrictamente en las reglas de negocio y comportamiento del producto.

### Módulo 1: Acceso, Interfaz de Marcación e Identificación

| ID | Nombre | Descripción |
| :--- | :--- | :--- |
| **RF-01** | Interfaz de Marcación en Puerta | El sistema debe mostrar en pantalla completa una interfaz simplificada de espera que contenga un único campo de ingreso activo, optimizado para recibir la lectura rápida del identificador del usuario sin necesidad de navegación previa. |
| **RF-02** | Acceso al Panel de Control de Aula | El sistema debe permitir al docente cambiar de la interfaz de marcación general a un panel administrativo local de manera segura mediante el uso de credenciales de acceso, permitiendo configurar los parámetros específicos de la sesión en curso. |
| **RF-03** | Validación de Formato de Identificación | El sistema debe rechazar inmediatamente cualquier ingreso que no cumpla estrictamente con una longitud de 8 caracteres numéricos enteros. El sistema procesará la entrada ignorando espacios en blanco accidentales antes o después del número y bloqueará letras o caracteres especiales. |

### Módulo 2: Flexibilidad de Grupos Académicos y Registro Automatizado

| ID | Nombre | Descripción |
| :--- | :--- | :--- |
| **RF-04** | Validación de Matrícula y Flexibilidad de Grupo | El sistema debe comprobar que el identificador ingresado corresponda a un alumno formalmente matriculado en el curso dictado (obtenido del sistema simulado de la universidad). Se permitirá registrar la asistencia de alumnos matriculados en secciones o grupos diferentes (A, B, C, etc.) que asistan a una sesión distinta debido a acuerdos excepcionales autorizados por el docente. |
| **RF-05** | Autogeneración de Sesión de Emergencia | En caso de que el docente no haya configurado o iniciado la sesión del día en el sistema, el ingreso del primer estudiante matriculado válido (verificado mediante la API simulada de la universidad) creará de forma automática la sesión actual basándose en los horarios del plan de estudios oficial, impidiendo que los alumnos se queden sin registrar su asistencia en la puerta. |

### Módulo 3: Control de Asistencia del Docente y Tolerancia Dinámica

| ID | Nombre | Descripción |
| :--- | :--- | :--- |
| **RF-06** | Registro de Ingreso del Docente | El sistema debe identificar el ingreso del identificador numérico del profesor a cargo (verificado contra el sistema simulado de la universidad). Su marcación registrará su asistencia laboral del día y habilitará formalmente el inicio oficial del dictado en el aula para esa sesión. El docente puede marcar hasta 30 minutos antes del inicio programado. |
| **RF-07** | Activación de Tolerancia Dinámica | El docente podrá configurar en el panel de control si la tolerancia de llegada de los alumnos inicia de forma **Estática** (desde la hora oficial calendarizada de la clase) o de forma **Dinámica** (los minutos de tolerancia comienzan a contar únicamente a partir del momento exacto en que el docente registra su propio ingreso al salón). Por defecto, la tolerancia es de 15 minutos. |
| **RF-08** | Declaración de Inasistencia Docente | Si transcurren 20 minutos (valor por defecto configurable) posteriores a la hora de inicio oficial de la clase sin que el docente haya registrado su ingreso, el sistema cerrará la sesión asignando automáticamente el estado de "Clase Suspendida / Inasistencia Docente", y etiquetará las marcaciones de los alumnos de ese bloque como "Falta" con esta observación. |

### Módulo 4: Flujos de Permanencia, Salida y Horas Hueco

| ID | Nombre | Descripción |
| :--- | :--- | :--- |
| **RF-09** | Alternancia de Flujo de Entrada y Salida | El sistema debe determinar el tipo de registro del alumno según su historial del día: si el identificador ingresado no posee registros previos en la sesión del día, registrará una **Entrada**; si el alumno ya cuenta con un registro de entrada previo para esa sesión, el sistema registrará una **Salida**. |
| **RF-10** | Clasificación de Puntualidad | El sistema evalúa la hora de ingreso del alumno respecto al límite de tolerancia (Estática o Dinámica) para categorizar la asistencia en dos estados de entrada: **Puntual** (ingreso dentro del límite de tolerancia) o **Tardanza** (ingreso posterior al límite establecido). El estado **Falta** se reserva para alumnos que no asistieron o cuya clase fue suspendida. |
| **RF-11** | Registro de Uso del Aula en Hora Hueco | Si un estudiante ingresa su identificador durante un periodo en el que no hay clases oficiales programadas en el aula, el sistema registrará su marca bajo el estado neutral de **Ambiente de Estudio** (Hora Hueco). Si no hay una sesión de Hora Hueco activa, se creará una automáticamente con una duración predeterminada de 2 horas. |

### Módulo 5: Resiliencia ante Errores Humanos y Modificaciones Manuales

| ID | Nombre | Descripción |
| :--- | :--- | :--- |
| **RF-12** | Cierre Automático por Olvido de Marcación de Salida | El sistema debe mitigar el olvido de los estudiantes que no marcan su salida al retirarse del salón. Al concluir oficialmente el bloque horario asignado a la clase activa, el sistema cerrará de forma automática el registro de todos los alumnos que quedaron con estado "dentro del aula", asignándoles una salida forzada correspondiente al último minuto del bloque académico oficial con la etiqueta "Salida por Cierre de Sesión". |
| **RF-13** | Corrección y Modificación Manual de Asistencia | El docente tendrá la potestad exclusiva, desde el panel de control del aula, de modificar, añadir o anular cualquier estado de asistencia registrado automáticamente por el tótem (por ejemplo, cambiar una "Falta" por "Tardanza/Puntual" debido a justificaciones excepcionales de fuerza mayor de un estudiante). Toda modificación manual quedará registrada en un historial interno para auditoría. |

### Módulo 6: Respuesta Visual en Pantalla

| ID | Nombre | Descripción |
| :--- | :--- | :--- |
| **RF-14** | Notificación de Estado por Código de Colores | Tras registrar un identificador, el sistema debe cambiar temporalmente el color de la pantalla completa para dar una respuesta inmediata: <br>- **Verde:** Registro exitoso en estado **Puntual**.<br>- **Ámbar:** Registro exitoso en estado **Tardanza**.<br>- **Azul:** Registro exitoso de **Salida** o **Ambiente de Estudio**.<br>- **Rojo:** Registro en estado **Falta**, alumno no matriculado o error de entrada. |
| **RF-15** | Temporizador de Restablecimiento de Pantalla | La pantalla de respuesta por colores debe mantenerse fija por un lapso continuo de 3 segundos para que sea legible. Pasado este tiempo, el sistema borrará automáticamente la información del usuario anterior y dejará la pantalla de espera lista para la siguiente marcación. |

---

## 3. Requerimientos No Funcionales (RNF)

| ID | Nombre | Descripción |
| :--- | :--- | :--- |
| **RNF-01** | Robustez y Tolerancia a Fallos de Entrada | El sistema no debe detener su funcionamiento general (caídas del servicio o congelamiento de pantalla) si se ingresan formatos de datos extremos, dañados, fuera de límite u horas lógicamente imposibles. Las excepciones deben capturarse y traducirse en notificaciones de error visuales de forma interna y segura. |
| **RNF-02** | Velocidad y Tiempo de Procesamiento | El tiempo total transcurrido desde que el estudiante o docente envía su identificación hasta que la pantalla se tiñe del color de respuesta no debe superar los 150 milisegundos, garantizando un flujo constante de personas en la puerta del salón de la UNSA. |
| **RNF-03** | Arquitectura Desacoplada para Pruebas de Caja Negra | La lógica de negocio encargada del cálculo de minutos de tardanza, cruces de grupos de clases, alternancias de entrada/salida y autocompletado por olvidos de salida debe estar completamente aislada de la interfaz de usuario gráfica y de las fuentes externas de datos. Esto debe permitir la ejecución independiente de pruebas de caja negra automatizadas por consola (utilizando mocks de las llamadas al sistema universitario) para verificar el 100% de las particiones de equivalencia y valores límite. |
