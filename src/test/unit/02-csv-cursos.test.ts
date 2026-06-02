/**
 * 02 – Carga CSV de Cursos
 * REQ-03: Upsert, duplicados predomina el último, fila inválida rechaza todo.
 * REQ-04: Código exactamente 7 chars, abreviatura no vacía, nombre no vacío,
 *          grupos separados por comas, mín 1, cada grupo 1 letra.
 * Feature: Administración de AulaPass → Scenario: Validación longitud código / abreviatura, nombre, grupos
 *
 * @see REQUIREMENTS.md REQ-03, REQ-04
 * @see TEST_CATALOG.md P_Cur_Cod_01–03, P_Cur_Abrev_01–02, P_Cur_Nom_01–02, P_Cur_Grp_01–04
 * @see admin.feature lines 13-36
 */
import { describe, it, expect } from "vitest";
import { CourseCSVSchema } from "@/lib/validations/csv-schemas";

/** Helper: builds a valid course row, allowing specific field overrides. */
function validCourseRow(overrides: Record<string, string> = {}) {
  return {
    code: "MAT1234",
    abbreviation: "MAT",
    name: "Matemática",
    groups: "A,B",
    ...overrides,
  };
}

describe("02 — Carga CSV de Cursos (REQ-03, REQ-04)", () => {
  // ─────────────────────────────────────────────────────────────
  // Código del curso — Frontera en 7 caracteres
  // ─────────────────────────────────────────────────────────────

  /**
   * P_Cur_Cod_01 — Frontera -1: código de 6 caracteres (inválido)
   * Gherkin:
   *   Given que el administrador sube un archivo CSV de cursos
   *   When  el registro contiene un código de curso de longitud 6 ("MAT123")
   *   Then  el sistema debe procesar el archivo con resultado "Rechaza CSV (Value Error)"
   */
  it("[P_Cur_Cod_01] código de 6 caracteres → rechaza CSV", () => {
    // Arrange
    const row = validCourseRow({ code: "MAT123" }); // 6 chars

    // Act
    const result = CourseCSVSchema.safeParse(row);

    // Assert
    expect(result.success).toBe(false);
  });

  /**
   * P_Cur_Cod_02 — Frontera exacta: código de 7 caracteres (válido)
   * Gherkin:
   *   Given que el administrador sube un archivo CSV de cursos
   *   When  el registro contiene un código de curso de longitud 7 ("MAT1234")
   *   Then  el sistema debe procesar el archivo con resultado "CSV Procesado (Éxito)"
   */
  it("[P_Cur_Cod_02] código de 7 caracteres → CSV procesado", () => {
    // Arrange
    const row = validCourseRow({ code: "MAT1234" }); // 7 chars

    // Act
    const result = CourseCSVSchema.safeParse(row);

    // Assert
    expect(result.success).toBe(true);
  });

  /**
   * P_Cur_Cod_03 — Frontera +1: código de 8 caracteres (inválido)
   * Gherkin:
   *   Given que el administrador sube un archivo CSV de cursos
   *   When  el registro contiene un código de curso de longitud 8 ("MAT12345")
   *   Then  el sistema debe procesar el archivo con resultado "Rechaza CSV (Value Error)"
   */
  it("[P_Cur_Cod_03] código de 8 caracteres → rechaza CSV", () => {
    // Arrange
    const row = validCourseRow({ code: "MAT12345" }); // 8 chars

    // Act
    const result = CourseCSVSchema.safeParse(row);

    // Assert
    expect(result.success).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────
  // Abreviatura — Clase de equivalencia
  // ─────────────────────────────────────────────────────────────

  /**
   * P_Cur_Abrev_01 — Clase válida: abreviatura no vacía
   * Gherkin:
   *   Given que el administrador sube un archivo CSV de cursos
   *   When  el registro tiene la abreviatura "MAT", nombre "Matemática" y grupos "A,B"
   *   Then  el sistema debe responder con "CSV Procesado (Éxito)"
   */
  it('[P_Cur_Abrev_01] abreviatura "MAT" (no vacía) → CSV procesado', () => {
    // Arrange
    const row = validCourseRow({ abbreviation: "MAT" });

    // Act
    const result = CourseCSVSchema.safeParse(row);

    // Assert
    expect(result.success).toBe(true);
  });

  /**
   * P_Cur_Abrev_02 — Clase inválida: abreviatura vacía
   * Gherkin:
   *   Given que el administrador sube un archivo CSV de cursos
   *   When  el registro tiene la abreviatura "", nombre "Matemática" y grupos "A,B"
   *   Then  el sistema debe responder con "Rechaza CSV (Value Error)"
   */
  it("[P_Cur_Abrev_02] abreviatura vacía → rechaza CSV", () => {
    // Arrange
    const row = validCourseRow({ abbreviation: "" });

    // Act
    const result = CourseCSVSchema.safeParse(row);

    // Assert
    expect(result.success).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────
  // Nombre del curso — Clase de equivalencia
  // ─────────────────────────────────────────────────────────────

  /**
   * P_Cur_Nom_01 — Clase válida: nombre no vacío
   */
  it('[P_Cur_Nom_01] nombre "Matemática" (no vacío) → CSV procesado', () => {
    // Arrange
    const row = validCourseRow({ name: "Matemática" });

    // Act
    const result = CourseCSVSchema.safeParse(row);

    // Assert
    expect(result.success).toBe(true);
  });

  /**
   * P_Cur_Nom_02 — Clase inválida: nombre vacío
   */
  it("[P_Cur_Nom_02] nombre vacío → rechaza CSV", () => {
    // Arrange
    const row = validCourseRow({ name: "" });

    // Act
    const result = CourseCSVSchema.safeParse(row);

    // Assert
    expect(result.success).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────
  // Grupos — Clase de equivalencia
  // ─────────────────────────────────────────────────────────────

  /**
   * P_Cur_Grp_01 — Sin grupos (vacío)
   */
  it("[P_Cur_Grp_01] grupos vacíos → rechaza CSV", () => {
    // Arrange
    const row = validCourseRow({ groups: "" });

    // Act
    const result = CourseCSVSchema.safeParse(row);

    // Assert
    expect(result.success).toBe(false);
  });

  /**
   * P_Cur_Grp_02 — >= 1 grupo, válido ("A,B")
   */
  it('[P_Cur_Grp_02] grupos "A,B" (válidos) → CSV procesado', () => {
    // Arrange
    const row = validCourseRow({ groups: "A,B" });

    // Act
    const result = CourseCSVSchema.safeParse(row);

    // Assert
    expect(result.success).toBe(true);
  });

  /**
   * P_Cur_Grp_03 — Grupo con más de 1 letra ("AB")
   */
  it('[P_Cur_Grp_03] grupo "AB" (> 1 letra) → rechaza CSV', () => {
    // Arrange
    const row = validCourseRow({ groups: "AB" });

    // Act
    const result = CourseCSVSchema.safeParse(row);

    // Assert
    expect(result.success).toBe(false);
  });

  /**
   * P_Cur_Grp_04 — Exactamente 1 letra ("A")
   */
  it('[P_Cur_Grp_04] grupo "A" (exactamente 1 letra) → CSV procesado', () => {
    // Arrange
    const row = validCourseRow({ groups: "A" });

    // Act
    const result = CourseCSVSchema.safeParse(row);

    // Assert
    expect(result.success).toBe(true);
  });
});
