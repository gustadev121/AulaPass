## Tabla de Casos de Prueba

| Partición | Rango / Clase | Límite (Frontera) | Valor AVL | Tipo | Resultado Esperado |
| --- | --- | --- | --- | --- | --- |
| **ADMINISTRADOR** |  |  |  |  |  |
| P_Adm_Login_01 | Credenciales Válidas | N/A | "admin", "admin" | Clase Equivalencia | Ingreso exitoso |
| P_Adm_Login_02 | Credenciales Inválidas | N/A | "admin", "1234" | Clase Equivalencia | Acceso denegado |
| P_Cur_Cod_01 | < 7 caracteres (Inválida) | 7 | 6 | Frontera - 1 | Rechaza CSV (Value Error) |
| P_Cur_Cod_02 | = 7 caracteres (Válida) | 7 | 7 | Frontera | CSV Procesado (Éxito) |
| P_Cur_Cod_03 | > 7 caracteres (Inválida) | 7 | 8 | Frontera + 1 | Rechaza CSV (Value Error) |
| P_Cur_Abrev_01 | No vacío (Válida) | N/A | "MAT" | Clase Equivalencia | CSV Procesado (Éxito) |
| P_Cur_Abrev_02 | Vacío (Inválida) | N/A | "" | Clase Equivalencia | Rechaza CSV (Value Error) |
| P_Cur_Nom_01 | No vacío (Válida) | N/A | "Matemática" | Clase Equivalencia | CSV Procesado (Éxito) |
| P_Cur_Nom_02 | Vacío (Inválida) | N/A | "" | Clase Equivalencia | Rechaza CSV (Value Error) |
| P_Cur_Grp_01 | Sin grupos (Inválida) | N/A | "" | Clase Equivalencia | Rechaza CSV (Value Error) |
| P_Cur_Grp_02 | >= 1 grupo, válido (Válida) | N/A | "A,B" | Clase Equivalencia | CSV Procesado (Éxito) |
| P_Cur_Grp_03 | > 1 letra por grupo (Inv.) | N/A | "AB" | Clase Equivalencia | Rechaza CSV (Value Error) |
| P_Cur_Grp_04 | Exactamente 1 letra (Válida) | N/A | "A" | Clase Equivalencia | CSV Procesado (Éxito) |
| P_Doc_Usr_01 | No vacío (Válida) | N/A | "jperez" | Clase Equivalencia | CSV Procesado (Éxito) |
| P_Doc_Usr_02 | Vacío (Inválida) | N/A | "" | Clase Equivalencia | Rechaza CSV (Value Error) |
| P_Doc_Pwd_01 | No vacío (Válida) | N/A | "pass123" | Clase Equivalencia | CSV Procesado (Éxito) |
| P_Doc_Pwd_02 | Vacío (Inválida) | N/A | "" | Clase Equivalencia | Rechaza CSV (Value Error) |
| P_Doc_Nom_01 | No vacío (Válida) | N/A | "Juan Perez" | Clase Equivalencia | CSV Procesado (Éxito) |
| P_Doc_Nom_02 | Vacío (Inválida) | N/A | "" | Clase Equivalencia | Rechaza CSV (Value Error) |
| P_Doc_Cod_01 | Código existe (Válida) | N/A | "1234567" | Clase Equivalencia | CSV Procesado (Éxito) |
| P_Doc_Cod_02 | Código no existe (Inválida) | N/A | "9999999" | Clase Equivalencia | Rechaza CSV (Value Error) |
| P_Est_CUI_01 | < 8 caracteres (Inválida) | 8 | 7 | Frontera - 1 | Rechaza CSV (Value Error) |
| P_Est_CUI_02 | = 8 caracteres (Válida) | 8 | 8 | Frontera | CSV Procesado (Éxito) |
| P_Est_CUI_03 | > 8 caracteres (Inválida) | 8 | 9 | Frontera + 1 | Rechaza CSV (Value Error) |
| P_Est_Nom_01 | No vacío (Válida) | N/A | "Maria Lopez" | Clase Equivalencia | CSV Procesado (Éxito) |
| P_Est_Nom_02 | Vacío (Inválida) | N/A | "" | Clase Equivalencia | Rechaza CSV (Value Error) |
| **DOCENTE** |  |  |  |  |  |
| P_DocLog_01 | Crendenciales Válidas | N/A | "jperez", "pass" | Clase Equivalencia | Ingreso exitoso |
| P_DocLog_02 | Credenciales Inválidas | N/A | "jperez", "bad" | Clase Equivalencia | Acceso denegado |
| P_Conf_Grp_01 | Letra asignada existe | N/A | "A" (Existe) | Clase Equivalencia | Configuración aceptada |
| P_Conf_Grp_02 | Letra asignada no existe | N/A | "Z" (No existe) | Clase Equivalencia | Error de validación |
| P_Conf_Lon_01 | < 6 (Inválida) | 6 | 5 | Frontera - 1 | Error de validación |
| P_Conf_Lon_02 | 6 - 12 (Válido Bajo) | 6 | 6 | Frontera | Configuración aceptada |
| P_Conf_Lon_03 | 6 - 12 (Válido Bajo +1) | 6 | 7 | Frontera + 1 | Configuración aceptada |
| P_Conf_Lon_04 | 6 - 12 (Válido Alto -1) | 12 | 11 | Frontera - 1 | Configuración aceptada |
| P_Conf_Lon_05 | 6 - 12 (Válido Alto) | 12 | 12 | Frontera | Configuración aceptada |
| P_Conf_Lon_06 | > 12 (Inválida) | 12 | 13 | Frontera + 1 | Error de validación |
| P_Conf_Dur_01 | < 5s (Inválida) | 5 | 4 | Frontera - 1 | Error de validación |
| P_Conf_Dur_02 | 5s - 30s (Válido Bajo) | 5 | 5 | Frontera | Configuración aceptada |
| P_Conf_Dur_03 | 5s - 30s (Válido Bajo +1) | 5 | 6 | Frontera + 1 | Configuración aceptada |
| P_Conf_Dur_04 | 5s - 30s (Válido Alto -1) | 30 | 29 | Frontera - 1 | Configuración aceptada |
| P_Conf_Dur_05 | 5s - 30s (Válido Alto) | 30 | 30 | Frontera | Configuración aceptada |
| P_Conf_Dur_06 | > 30s (Inválida) | 30 | 31 | Frontera + 1 | Error de validación |
| **ESTUDIANTE** |  |  |  |  |  |
| P_EstLog_01 | CUI registrado (Válida) | N/A | "12345678" | Clase Equivalencia | Ingreso exitoso |
| P_EstLog_02 | CUI no registrado (Inválida) | N/A | "00000000" | Clase Equivalencia | Acceso denegado |
| P_Asis_Tpo_01 | Antes de expirar (Válida) | Expiración (0s) | -1s | Frontera - 1 | Asistencia Registrada |
| P_Asis_Tpo_02 | Límite exacto (Válida) | Expiración (0s) | 0s | Frontera | Asistencia Registrada |
| P_Asis_Tpo_03 | Después de expirar (Invál.) | Expiración (0s) | +1s | Frontera + 1 | Código expirado / Error |
| P_Asis_Dup_01 | Código no registrado hoy | N/A | 1er registro | Clase Equivalencia | Asistencia Registrada |
| P_Asis_Dup_02 | Código ya registrado hoy | N/A | 2do registro | Clase Equivalencia | Rechazo (Duplicado) |
