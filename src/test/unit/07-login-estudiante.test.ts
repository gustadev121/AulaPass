/**
 * 07 – Login Estudiante
 * REQ-13: El estudiante ingresa únicamente con su CUI (debe estar registrado).
 * Feature: Panel del Estudiante → Scenario: Autenticación del Estudiante
 *
 * @see REQUIREMENTS.md REQ-13
 * @see TEST_CATALOG.md P_EstLog_01, P_EstLog_02
 * @see estudiante.feature lines 3-11
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the DB module at the boundary
vi.mock("@/db", () => {
  return import("./__mocks__/db");
});

describe("07 — Login Estudiante (REQ-13)", () => {
  beforeEach(async () => {
    const { resetDbMocks } = await import("./__mocks__/db");
    resetDbMocks();
  });

  /**
   * P_EstLog_01 — CUI registrado
   * Gherkin:
   *   Given que el estudiante está en la pantalla de ingreso por CUI
   *   When  ingresa su CUI registrado "12345678"
   *   Then  el sistema debe permitir el resultado "Ingreso exitoso"
   */
  it('[P_EstLog_01] CUI registrado ("12345678") → ingreso exitoso', async () => {
    // Arrange
    const { db } = await import("./__mocks__/db");
    const studentRecord = {
      cui: "12345678",
      name: "Maria Lopez",
    };
    (db.query.students.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
      studentRecord,
    );

    const { validateStudentCuiAction } = await import(
      "@/lib/actions/attendance-actions"
    );

    // Act
    const result = await validateStudentCuiAction("12345678");

    // Assert
    expect(result.success).toBe(true);
    expect(result.student).toEqual(studentRecord);
  });

  /**
   * P_EstLog_02 — CUI no registrado
   * Gherkin:
   *   Given que el estudiante está en la pantalla de ingreso por CUI
   *   When  ingresa su CUI no registrado "00000000"
   *   Then  el sistema debe responder con el resultado "Acceso denegado"
   */
  it('[P_EstLog_02] CUI no registrado ("00000000") → acceso denegado', async () => {
    // Arrange
    const { db } = await import("./__mocks__/db");
    (db.query.students.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
      undefined,
    );

    const { validateStudentCuiAction } = await import(
      "@/lib/actions/attendance-actions"
    );

    // Act
    const result = await validateStudentCuiAction("00000000");

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain("no registrado");
  });
});
