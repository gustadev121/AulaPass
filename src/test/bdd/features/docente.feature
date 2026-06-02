Feature: Panel del Docente

  Scenario Outline: Autenticación del Docente en el Panel Administrativo
    Given que el docente está en la pantalla de inicio de sesión
    When ingresa su usuario "<usuario>" y clave "<clave>"
    Then el sistema debe permitir el resultado "<resultado>"

    Examples:
      | usuario | clave | resultado       | ID           |
      | jperez  | pass  | Ingreso exitoso | P_DocLog_01 |
      | jperez  | bad   | Acceso denegado | P_DocLog_02 |

  Scenario Outline: Configuración de la longitud del código y tiempo de expiración
    Given que el docente está autenticado y selecciona el grupo "<grupo>"
    When configura la longitud del código en <longitud>
    And configura la duración de expiración en <duracion> segundos
    Then el sistema responde con "<resultado>"

    Examples:
      | grupo | longitud | duracion | caso                           | resultado              | ID            |
      | A     | 6        | 15       | Valores por Defecto Válidos    | Configuración aceptada | P_Conf_Lon_02 |
      | Z     | 6        | 15       | Grupo No Asignado / Inexistente| Error de validación    | P_Conf_Grp_02 |
      | A     | 5        | 15       | Longitud de Código < 6         | Error de validación    | P_Conf_Lon_01 |
      | A     | 6        | 15       | Longitud Mínima Exacta (6)     | Configuración aceptada | P_Conf_Lon_02 |
      | A     | 7        | 15       | Longitud Mínima + 1 (7)        | Configuración aceptada | P_Conf_Lon_03 |
      | A     | 11       | 15       | Longitud Máxima - 1 (11)       | Configuración aceptada | P_Conf_Lon_04 |
      | A     | 12       | 15       | Longitud Máxima Exacta (12)    | Configuración aceptada | P_Conf_Lon_05 |
      | A     | 13       | 15       | Longitud de Código > 12        | Error de validación    | P_Conf_Lon_06 |
      | A     | 6        | 4        | Duración de Código < 5s        | Error de validación    | P_Conf_Dur_01 |
      | A     | 6        | 5        | Duración Mínima Exacta (5s)    | Configuración aceptada | P_Conf_Dur_02 |
      | A     | 6        | 6        | Duración Mínima + 1 (6s)       | Configuración aceptada | P_Conf_Dur_03 |
      | A     | 6        | 29       | Duración Máxima - 1 (29s)      | Configuración aceptada | P_Conf_Dur_04 |
      | A     | 6        | 30       | Duración Máxima Exacta (30s)   | Configuración aceptada | P_Conf_Dur_05 |
      | A     | 6        | 31       | Duración de Código > 30s       | Error de validación    | P_Conf_Dur_06 |
