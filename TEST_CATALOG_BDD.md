# Catálogo de Pruebas en BDD (Gherkin) - AulaPass

Este documento contiene la especificación de los escenarios de prueba basados en el comportamiento del sistema, utilizando Particiones de Equivalencia (PE) y Análisis de Valores Límite (AVL).

---

### Escenario: Login de Administrador
```gherkin
Scenario Outline: Autenticación del Administrador en la Plataforma
  Given que el administrador está en la página de login
  When ingresa el usuario "<usuario>" y la contraseña "<password>"
  Then el sistema debe mostrar el resultado "<resultado>"

  Examples:
    | usuario | password | resultado       |
    | admin   | admin    | Ingreso exitoso |
    | admin   | 1234     | Acceso denegado |

Scenario Outline: Validación de longitud de código de curso en la carga masiva
  Given que el administrador sube un archivo CSV de cursos
  When el registro contiene un código de curso de longitud <longitud> ("<valor>")
  Then el sistema debe procesar el archivo con resultado "<resultado>"

  Examples:
    | longitud | valor    | tipo         | resultado                 |
    | 6        | MAT123   | Frontera - 1 | Rechaza CSV (Value Error) |
    | 7        | MAT1234  | Frontera     | CSV Procesado (Éxito)     |
    | 8        | MAT12345 | Frontera + 1 | Rechaza CSV (Value Error) |

Scenario Outline: Validación de abreviatura, nombre y grupos del curso
  Given que el administrador sube un archivo CSV de cursos
  When el registro tiene la abreviatura "<abrev>", el nombre "<nombre>" y los grupos "<grupos>"
  Then el sistema debe responder con "<resultado>"

  Examples:
    | abrev | nombre     | grupos | tipo               | resultado                 |
    | MAT   | Matemática | A,B    | Válido             | CSV Procesado (Éxito)     |
    | ""    | Matemática | A,B    | Abreviatura Vacía  | Rechaza CSV (Value Error) |
    | MAT   | ""         | A,B    | Nombre Vacío       | Rechaza CSV (Value Error) |
    | MAT   | Matemática | ""     | Sin Grupos         | Rechaza CSV (Value Error) |
    | MAT   | Matemática | AB     | Grupo > 1 Caracter | Rechaza CSV (Value Error) |
    | MAT   | Matemática | A      | Exactamente 1 Letra| CSV Procesado (Éxito)     |

Scenario Outline: Control de campos obligatorios y existencia de código del docente
  Given que el administrador sube un archivo CSV de docentes
  When el registro tiene usuario "<usr>", password "<pwd>", nombre "<nom>" y código "<cod>"
  Then el sistema debe responder con "<resultado>"

  Examples:
    | usr    | pwd     | nom        | cod     | tipo              | resultado                 |
    | jperez | pass123 | Juan Perez | 1234567 | Registro Válido   | CSV Procesado (Éxito)     |
    | ""     | pass123 | Juan Perez | 1234567 | Usuario Vacío     | Rechaza CSV (Value Error) |
    | jperez | ""      | Juan Perez | 1234567 | Password Vacío    | Rechaza CSV (Value Error) |
    | jperez | pass123 | ""         | 1234567 | Nombre Vacío      | Rechaza CSV (Value Error) |
    | jperez | pass123 | Juan Perez | 9999999 | Código No Existe  | Rechaza CSV (Value Error) |

Scenario Outline: Validación de la longitud estricta del CUI del estudiante
  Given que el administrador sube un archivo CSV de estudiantes
  When el registro contiene un CUI de longitud <longitud> ("<valor>")
  And el nombre es "<nombre>"
  Then el sistema debe procesar el archivo con resultado "<resultado>"

  Examples:
    | longitud | valor     | nombre      | tipo         | resultado                 |
    | 7        | 1234567   | Maria Lopez | Frontera - 1 | Rechaza CSV (Value Error) |
    | 8        | 12345678  | Maria Lopez | Frontera     | CSV Procesado (Éxito)     |
    | 9        | 123456789 | Maria Lopez | Frontera + 1 | Rechaza CSV (Value Error) |
    | 8        | 12345678  | ""          | Nombre Vacío | Rechaza CSV (Value Error) |

Scenario Outline: Login de Docente en el Panel Administrativo
  Given que el docente está en la pantalla de inicio de sesión
  When ingresa su usuario "<usuario>" y clave "<clave>"
  Then el sistema debe permitir el resultado "<resultado>"

  Examples:
    | usuario | clave | resultado       |
    | jperez  | pass  | Ingreso exitoso |
    | jperez  | bad   | Acceso denegado |

Scenario Outline: Configuración de la longitud del código y tiempo de expiración
  Given que el docente está autenticado y selecciona el grupo "<grupo>"
  When configura la longitud del código en <longitud>
  And configura la duración de expiración en <duracion> segundos
  Then el sistema responde con "<resultado>"

  Examples:
    | grupo | longitud | duracion | caso                         | resultado              |
    | A     | 6        | 15       | Valores por Defecto Válidos  | Configuración aceptada |
    | Z     | 6        | 15       | Grupo No Asignado / Inexistente| Error de validación    |
    | A     | 5        | 15       | Longitud de Código < 6       | Error de validación    |
    | A     | 6        | 15       | Longitud Mínima Exacta (6)   | Configuración aceptada |
    | A     | 12       | 15       | Longitud Máxima Exacta (12)  | Configuración aceptada |
    | A     | 13       | 15       | Longitud de Código > 12      | Error de validación    |
    | A     | 6        | 4        | Duración de Código < 5s      | Error de validación    |
    | A     | 6        | 5        | Duración Mínima Exacta (5s)  | Configuración aceptada |
    | A     | 6        | 30       | Duración Máxima Exacta (30s) | Configuración aceptada |
    | A     | 6        | 31       | Duración de Código > 30s     | Error de validación    |
  
Scenario Outline: Validación de acceso de estudiante en el dispositivo de marcación
  Given que el estudiante está en la pantalla de marcación
  When ingresa el CUI "<cui>"
  Then el sistema procesa el acceso mostrando "<resultado>"

  Examples:
    | cui      | caso               | resultado       |
    | 12345678 | Alumno Registrado  | Ingreso exitoso |
    | 00000000 | Alumno Inexistente | Acceso denegado |

Scenario Outline: Marcación de asistencia con base en la expiración del código dinámico
  Given que hay una sesión de asistencia activa para el estudiante "12345678"
  When el estudiante ingresa el código a los <tiempo> respecto al tiempo límite
  Then el sistema debe registrar el estado "<resultado>"

  Examples:
    | tiempo | caso                         | resultado               |
    | -1s    | Antes de expirar (A tiempo)  | Asistencia Registrada   |
    | 0s     | Límite exacto de expiración  | Asistencia Registrada   |
    | +1s    | Después de expirar           | Código expirado / Error |

Scenario: Prevención de marcas redundantes el mismo día
  Given que el estudiante con CUI "12345678" ya registró su asistencia hoy
  When el estudiante intenta ingresar su CUI por segunda vez en la misma sesión
  Then el sistema debe bloquear la acción mostrando "Rechazo (Duplicado)"
