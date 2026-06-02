Feature: Pantalla de Marcación de Estudiante

  Scenario Outline: Validación de acceso de estudiante en el dispositivo de marcación
    Given que el estudiante está en la pantalla de marcación
    When ingresa el CUI "<cui>"
    Then el sistema procesa el acceso mostrando "<resultado>"

    Examples:
      | cui      | caso               | resultado       | ID           |
      | 12345678 | Alumno Registrado  | Ingreso exitoso | P_EstLog_01 |
      | 00000000 | Alumno Inexistente | Acceso denegado | P_EstLog_02 |

  Scenario Outline: Marcación de asistencia con base en la expiración del código dinámico
    Given que hay una sesión de asistencia activa para el estudiante "12345678"
    When el estudiante ingresa el código a los <tiempo> respecto al tiempo límite
    Then el sistema debe registrar el estado "<resultado>"

    Examples:
      | tiempo | caso                         | resultado               | ID            |
      | -1s    | Antes de expirar (A tiempo)  | Asistencia Registrada   | P_Asis_Tpo_01 |
      | 0s     | Límite exacto de expiración  | Asistencia Registrada   | P_Asis_Tpo_02 |
      | +1s    | Después de expirar           | Código expirado / Error | P_Asis_Tpo_03 |

  Scenario: Prevención de marcas redundantes el mismo día
    Given que el estudiante con CUI "12345678" ya registró su asistencia hoy
    When el estudiante intenta ingresar su CUI por segunda vez en la misma sesión
    Then el sistema debe bloquear la acción mostrando "Rechazo (Duplicado)"
    # ID: P_Asis_Dup_01, P_Asis_Dup_02
