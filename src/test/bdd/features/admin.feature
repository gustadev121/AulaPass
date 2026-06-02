Feature: Administración de AulaPass

  Scenario Outline: Autenticación del Administrador en la Plataforma
    Given que el administrador está en la página de login
    When ingresa el usuario "<usuario>" y la contraseña "<password>"
    Then el sistema debe mostrar el resultado "<resultado>"

    Examples:
      | usuario | password | resultado       | ID            |
      | admin   | admin    | Ingreso exitoso | P_Adm_Login_01 |
      | admin   | 1234     | Acceso denegado | P_Adm_Login_02 |

  Scenario Outline: Validación de longitud de código de curso en la carga masiva
    Given que el administrador sube un archivo CSV de cursos
    When el registro contiene un código de curso de longitud <longitud> ("<valor>")
    Then el sistema debe procesar el archivo con resultado "<resultado>"

    Examples:
      | longitud | valor    | tipo         | resultado                 | ID           |
      | 6        | MAT123   | Frontera - 1 | Rechaza CSV (Value Error) | P_Cur_Cod_01 |
      | 7        | MAT1234  | Frontera     | CSV Procesado (Éxito)     | P_Cur_Cod_02 |
      | 8        | MAT12345 | Frontera + 1 | Rechaza CSV (Value Error) | P_Cur_Cod_03 |

  Scenario Outline: Validación de abreviatura, nombre y grupos del curso
    Given que el administrador sube un archivo CSV de cursos
    When el registro tiene la abreviatura "<abrev>", el nombre "<nombre>" y los grupos "<grupos>"
    Then el sistema debe responder con "<resultado>"

    Examples:
      | abrev | nombre     | grupos | tipo               | resultado                 | ID           |
      | MAT   | Matemática | A,B    | Válido             | CSV Procesado (Éxito)     | P_Cur_Grp_02 |
      | ""    | Matemática | A,B    | Abreviatura Vacía  | Rechaza CSV (Value Error) | P_Cur_Abrev_02 |
      | MAT   | ""         | A,B    | Nombre Vacío       | Rechaza CSV (Value Error) | P_Cur_Nom_02 |
      | MAT   | Matemática | ""     | Sin Grupos         | Rechaza CSV (Value Error) | P_Cur_Grp_01 |
      | MAT   | Matemática | AB     | Grupo > 1 Caracter | Rechaza CSV (Value Error) | P_Cur_Grp_03 |
      | MAT   | Matemática | A      | Exactamente 1 Letra| CSV Procesado (Éxito)     | P_Cur_Grp_04 |

  Scenario Outline: Control de campos obligatorios y existencia de código del docente
    Given que el administrador sube un archivo CSV de docentes
    When el registro tiene usuario "<usr>", password "<pwd>", nombre "<nom>" y código "<cod>"
    Then el sistema debe responder con "<resultado>"

    Examples:
      | usr    | pwd     | nom        | cod     | tipo              | resultado                 | ID           |
      | jperez | pass123 | Juan Perez | 1234567 | Registro Válido   | CSV Procesado (Éxito)     | P_Doc_Usr_01 |
      | ""     | pass123 | Juan Perez | 1234567 | Usuario Vacío     | Rechaza CSV (Value Error) | P_Doc_Usr_02 |
      | jperez | ""      | Juan Perez | 1234567 | Password Vacío    | Rechaza CSV (Value Error) | P_Doc_Pwd_02 |
      | jperez | pass123 | ""         | 1234567 | Nombre Vacío      | Rechaza CSV (Value Error) | P_Doc_Nom_02 |
      | jperez | pass123 | Juan Perez | 9999999 | Código No Existe  | Rechaza CSV (Value Error) | P_Doc_Cod_02 |

  Scenario Outline: Validación de la longitud estricta del CUI del estudiante
    Given que el administrador sube un archivo CSV de estudiantes
    When el registro contiene un CUI de longitud <longitud> ("<valor>")
    And el nombre es "<nombre>"
    Then el sistema debe procesar el archivo con resultado "<resultado>"

    Examples:
      | longitud | valor     | nombre      | tipo         | resultado                 | ID           |
      | 7        | 1234567   | Maria Lopez | Frontera - 1 | Rechaza CSV (Value Error) | P_Est_CUI_01 |
      | 8        | 12345678  | Maria Lopez | Frontera     | CSV Procesado (Éxito)     | P_Est_CUI_02 |
      | 9        | 123456789 | Maria Lopez | Frontera + 1 | Rechaza CSV (Value Error) | P_Est_CUI_03 |
      | 8        | 12345678  | ""          | Nombre Vacío | Rechaza CSV (Value Error) | P_Est_Nom_02 |
