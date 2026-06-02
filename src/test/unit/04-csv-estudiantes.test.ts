/**
 * 04 – Carga CSV de Estudiantes
 * REQ-07: Upsert por CUI, fila inválida rechaza todo.
 * REQ-08: CUI exactamente 8 caracteres, nombre no vacío.
 * Feature: Administración de AulaPass → Scenario: Validación de longitud estricta del CUI
 *
 * @see REQUIREMENTS.md REQ-07, REQ-08
 * @see TEST_CATALOG.md P_Est_CUI_01–03, P_Est_Nom_01–02
 * @see admin.feature lines 51-62
 */
import { describe, it, expect } from "vitest";
import { StudentCSVSchema } from "@/lib/validations/csv-schemas";

/** Helper: builds a valid student row, allowing specific field overrides. */
function validStudentRow(overrides: Record<string, string> = {}) {
  return {
    cui: "12345678",
    name: "Maria Lopez",
    ...overrides,
  };
}

describe("04 — Carga CSV de Estudiantes (REQ-07, REQ-08)", () => {
  // ─────────────────────────────────────────────────────────────
  // CUI — Frontera en 8 caracteres
  // ─────────────────────────────────────────────────────────────

  /**
   * P_Est_CUI_01 — Frontera -1: CUI de 7 caracteres (inválido)
   * Gherkin:
   *   Given que el administrador sube un archivo CSV de estudiantes
   *   When  el registro contiene un CUI de longitud 7 ("1234567")
   *   And   el nombre es "Maria Lopez"
   *   Then  el sistema debe procesar el archivo con resultado "Rechaza CSV (Value Error)"
   */
  it("[P_Est_CUI_01] CUI de 7 caracteres → rechaza CSV", () => {
    // Arrange
    const row = validStudentRow({ cui: "1234567" }); // 7 chars

    // Act
    const result = StudentCSVSchema.safeParse(row);

    // Assert
    expect(result.success).toBe(false);
  });

  /**
   * P_Est_CUI_02 — Frontera exacta: CUI de 8 caracteres (válido)
   * Gherkin:
   *   When  el registro contiene un CUI de longitud 8 ("12345678")
   *   And   el nombre es "Maria Lopez"
   *   Then  el sistema debe procesar el archivo con resultado "CSV Procesado (Éxito)"
   */
  it("[P_Est_CUI_02] CUI de 8 caracteres → CSV procesado", () => {
    // Arrange
    const row = validStudentRow({ cui: "12345678" }); // 8 chars

    // Act
    const result = StudentCSVSchema.safeParse(row);

    // Assert
    expect(result.success).toBe(true);
  });

  /**
   * P_Est_CUI_03 — Frontera +1: CUI de 9 caracteres (inválido)
   * Gherkin:
   *   When  el registro contiene un CUI de longitud 9 ("123456789")
   *   And   el nombre es "Maria Lopez"
   *   Then  el sistema debe procesar el archivo con resultado "Rechaza CSV (Value Error)"
   */
  it("[P_Est_CUI_03] CUI de 9 caracteres → rechaza CSV", () => {
    // Arrange
    const row = validStudentRow({ cui: "123456789" }); // 9 chars

    // Act
    const result = StudentCSVSchema.safeParse(row);

    // Assert
    expect(result.success).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────
  // Nombre — Clase de equivalencia
  // ─────────────────────────────────────────────────────────────

  /**
   * P_Est_Nom_01 — Nombre válido (no vacío)
   */
  it('[P_Est_Nom_01] nombre "Maria Lopez" (no vacío) → CSV procesado', () => {
    // Arrange
    const row = validStudentRow({ name: "Maria Lopez" });

    // Act
    const result = StudentCSVSchema.safeParse(row);

    // Assert
    expect(result.success).toBe(true);
  });

  /**
   * P_Est_Nom_02 — Nombre vacío
   * Gherkin:
   *   When  el registro contiene un CUI de longitud 8 ("12345678")
   *   And   el nombre es ""
   *   Then  el sistema debe procesar el archivo con resultado "Rechaza CSV (Value Error)"
   */
  it("[P_Est_Nom_02] nombre vacío → rechaza CSV", () => {
    // Arrange
    const row = validStudentRow({ name: "" });

    // Act
    const result = StudentCSVSchema.safeParse(row);

    // Assert
    expect(result.success).toBe(false);
  });
});
