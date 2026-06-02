/**
 * 05 – Login Docente
 * REQ-10: Login contra datos cargados en CSV de docentes. Sin manejo de sesión.
 * Feature: Panel del Docente → Scenario: Autenticación del Docente
 *
 * @see REQUIREMENTS.md REQ-10
 * @see TEST_CATALOG.md P_DocLog_01, P_DocLog_02
 * @see docente.feature lines 3-11
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the DB module at the boundary
vi.mock("@/db", () => {
  return import("./__mocks__/db");
});

describe("05 — Login Docente (REQ-10)", () => {
  beforeEach(async () => {
    const { resetDbMocks } = await import("./__mocks__/db");
    resetDbMocks();
  });

  /**
   * P_DocLog_01 — Credenciales Válidas
   * Gherkin:
   *   Given que el docente está en la pantalla de inicio de sesión
   *   When  ingresa su usuario "jperez" y clave "pass"
   *   Then  el sistema debe permitir el resultado "Ingreso exitoso"
   */
  it('[P_DocLog_01] credenciales válidas ("jperez"/"pass") → ingreso exitoso', async () => {
    // Arrange
    const { db } = await import("./__mocks__/db");
    const teacherRecord = {
      username: "jperez",
      password: "pass",
      name: "Juan Perez",
      courseCode: "1234567",
    };
    (db.query.teachers.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
      teacherRecord,
    );

    const { validateTeacherLoginAction } = await import(
      "@/lib/actions/attendance-actions"
    );

    // Act
    const result = await validateTeacherLoginAction("jperez", "pass");

    // Assert
    expect(result.success).toBe(true);
    expect(result.teacher).toEqual(teacherRecord);
  });

  /**
   * P_DocLog_02 — Credenciales Inválidas
   * Gherkin:
   *   Given que el docente está en la pantalla de inicio de sesión
   *   When  ingresa su usuario "jperez" y clave "bad"
   *   Then  el sistema debe permitir el resultado "Acceso denegado"
   */
  it('[P_DocLog_02] credenciales inválidas ("jperez"/"bad") → acceso denegado', async () => {
    // Arrange
    const { db } = await import("./__mocks__/db");
    (db.query.teachers.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
      undefined,
    );

    const { validateTeacherLoginAction } = await import(
      "@/lib/actions/attendance-actions"
    );

    // Act
    const result = await validateTeacherLoginAction("jperez", "bad");

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
