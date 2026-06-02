/**
 * 03 – Carga CSV de Docentes
 * REQ-05: Upsert por usuario, fila inválida rechaza todo.
 * REQ-06: Usuario no vacío, contraseña no vacía, nombre no vacío,
 *          código de curso debe existir en el sistema.
 * Feature: Administración de AulaPass → Scenario: Control de campos obligatorios y existencia de código
 *
 * @see REQUIREMENTS.md REQ-05, REQ-06
 * @see TEST_CATALOG.md P_Doc_Usr_01–02, P_Doc_Pwd_01–02, P_Doc_Nom_01–02, P_Doc_Cod_01–02
 * @see admin.feature lines 38-49
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TeacherCSVSchema } from "@/lib/validations/csv-schemas";

// Mock the DB module at the boundary
vi.mock("@/db", () => {
  return import("./__mocks__/db");
});

/** Helper: builds a valid teacher row, allowing specific field overrides. */
function validTeacherRow(overrides: Record<string, string> = {}) {
  return {
    username: "jperez",
    password: "pass123",
    name: "Juan Perez",
    courseCode: "1234567",
    ...overrides,
  };
}

describe("03 — Carga CSV de Docentes (REQ-05, REQ-06)", () => {
  // ─────────────────────────────────────────────────────────────
  // Schema Zod: campos obligatorios
  // ─────────────────────────────────────────────────────────────

  /**
   * P_Doc_Usr_01 — Usuario válido
   * Gherkin:
   *   Given que el administrador sube un archivo CSV de docentes
   *   When  el registro tiene usuario "jperez", password "pass123", nombre "Juan Perez" y código "1234567"
   *   Then  el sistema debe responder con "CSV Procesado (Éxito)"
   */
  it('[P_Doc_Usr_01] usuario "jperez" (no vacío) → parse exitoso', () => {
    // Arrange
    const row = validTeacherRow();

    // Act
    const result = TeacherCSVSchema.safeParse(row);

    // Assert
    expect(result.success).toBe(true);
  });

  /**
   * P_Doc_Usr_02 — Usuario vacío
   * Gherkin:
   *   When  el registro tiene usuario "", password "pass123", nombre "Juan Perez" y código "1234567"
   *   Then  el sistema debe responder con "Rechaza CSV (Value Error)"
   */
  it("[P_Doc_Usr_02] usuario vacío → rechaza CSV", () => {
    // Arrange
    const row = validTeacherRow({ username: "" });

    // Act
    const result = TeacherCSVSchema.safeParse(row);

    // Assert
    expect(result.success).toBe(false);
  });

  /**
   * P_Doc_Pwd_01 — Password válido
   */
  it('[P_Doc_Pwd_01] password "pass123" (no vacío) → parse exitoso', () => {
    // Arrange
    const row = validTeacherRow({ password: "pass123" });

    // Act
    const result = TeacherCSVSchema.safeParse(row);

    // Assert
    expect(result.success).toBe(true);
  });

  /**
   * P_Doc_Pwd_02 — Password vacío
   */
  it("[P_Doc_Pwd_02] password vacío → rechaza CSV", () => {
    // Arrange
    const row = validTeacherRow({ password: "" });

    // Act
    const result = TeacherCSVSchema.safeParse(row);

    // Assert
    expect(result.success).toBe(false);
  });

  /**
   * P_Doc_Nom_01 — Nombre válido
   */
  it('[P_Doc_Nom_01] nombre "Juan Perez" (no vacío) → parse exitoso', () => {
    // Arrange
    const row = validTeacherRow({ name: "Juan Perez" });

    // Act
    const result = TeacherCSVSchema.safeParse(row);

    // Assert
    expect(result.success).toBe(true);
  });

  /**
   * P_Doc_Nom_02 — Nombre vacío
   */
  it("[P_Doc_Nom_02] nombre vacío → rechaza CSV", () => {
    // Arrange
    const row = validTeacherRow({ name: "" });

    // Act
    const result = TeacherCSVSchema.safeParse(row);

    // Assert
    expect(result.success).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────
  // Código de curso — Existencia en el sistema (vía action + DB)
  // ─────────────────────────────────────────────────────────────

  /**
   * P_Doc_Cod_01 — Código de curso existe (formato 7 chars válido)
   * Nota: la validación de existencia real ocurre al INSERT en la DB (FK).
   * A nivel de schema, se valida solo longitud = 7.
   */
  it('[P_Doc_Cod_01] código "1234567" (7 chars, formato válido) → parse exitoso', () => {
    // Arrange
    const row = validTeacherRow({ courseCode: "1234567" });

    // Act
    const result = TeacherCSVSchema.safeParse(row);

    // Assert
    expect(result.success).toBe(true);
  });

  /**
   * P_Doc_Cod_02 — Código de curso no existe → la action rechaza
   * Nota: El schema acepta "9999999" (7 chars). La validación de FK ocurre
   * en la acción al intentar insertar en DB. Testeamos a nivel de action.
   */
  it('[P_Doc_Cod_02] código "9999999" (no existe en DB) → la action rechaza', async () => {
    // Arrange: importamos la action después de registrar el mock
    const { uploadTeachersAction } = await import(
      "@/lib/actions/admin-actions"
    );
    const { db } = await import("./__mocks__/db");

    // El schema acepta el formato (7 chars) pero el INSERT falla por FK
    const insertMock = {
      values: vi.fn().mockReturnThis(),
      onConflictDoUpdate: vi
        .fn()
        .mockRejectedValue(
          new Error(
            'insert or update on table "teachers" violates foreign key constraint',
          ),
        ),
    };
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertMock);

    const data = [validTeacherRow({ courseCode: "9999999" })];

    // Act
    const result = await uploadTeachersAction(data);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
