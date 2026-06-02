/**
 * 09 – Prevención de Duplicados
 * REQ-16: Si intenta registrar asistencia con un código ya firmado (mismo día + curso + grupo + estudiante), el sistema rechaza.
 * REQ-17: Al registrarse con éxito, crea entrada en auditoría.
 * Feature: Panel del Estudiante → Scenario: Prevención de firmas duplicadas
 *
 * @see REQUIREMENTS.md REQ-16, REQ-17
 * @see TEST_CATALOG.md P_Asis_Dup_01, P_Asis_Dup_02
 * @see estudiante.feature lines 35-51
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the DB module at the boundary
vi.mock("@/db", () => {
  return import("./__mocks__/db");
});

describe("09 — Prevención de Duplicados (REQ-16, REQ-17)", () => {
  beforeEach(async () => {
    const { resetDbMocks } = await import("./__mocks__/db");
    resetDbMocks();
  });

  /** Helper: sets up student mock. */
  async function setupStudentMock() {
    const { db } = await import("./__mocks__/db");
    (db.query.students.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
      {
        cui: "12345678",
        name: "Maria Lopez",
      },
    );
  }

  /**
   * P_Asis_Dup_01 — Primer registro del día
   * Gherkin:
   *   Given que un estudiante con CUI registrado "12345678"
   *   And   no tiene un registro de asistencia previo para el mismo curso "MAT1234" y grupo "A" hoy
   *   When  registra asistencia
   *   Then  el sistema debe responder con "Asistencia Registrada"
   *   And   debe guardar el registro en la bitácora de auditoría
   */
  it("[P_Asis_Dup_01] primer registro de asistencia hoy → éxito e inserta en auditoría", async () => {
    // Arrange
    await setupStudentMock();
    const { db } = await import("./__mocks__/db");

    // No attendance recorded today yet
    (
      db.query.attendanceAudit.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValue(undefined);

    const { registerAttendanceAction } = await import(
      "@/lib/actions/attendance-actions"
    );

    const baseTime = Date.now();
    const params = {
      cui: "12345678",
      courseCode: "MAT1234",
      courseName: "Matemática",
      groupLetter: "A",
      clientTimestamp: baseTime,
      codeExpiration: baseTime + 10000,
    };

    // Act
    const result = await registerAttendanceAction(params);

    // Assert
    expect(result.success).toBe(true);
    // Verify that insert was called to persist the audit log
    expect(db.insert).toHaveBeenCalled();
  });

  /**
   * P_Asis_Dup_02 — Segundo registro del día (Duplicado)
   * Gherkin:
   *   Given que un estudiante con CUI registrado "12345678"
   *   And   ya tiene un registro de asistencia previo para el mismo curso "MAT1234" y grupo "A" hoy
   *   When  registra asistencia de nuevo
   *   Then  el sistema debe rechazar el registro indicando "Rechazo (Duplicado)"
   */
  it("[P_Asis_Dup_02] segundo registro de asistencia hoy (duplicado) → rechazo", async () => {
    // Arrange
    await setupStudentMock();
    const { db } = await import("./__mocks__/db");

    // Existing attendance recorded today
    const existingAuditRecord = {
      id: 100,
      courseCode: "MAT1234",
      groupLetter: "A",
      studentCui: "12345678",
      timestamp: new Date(),
    };
    (
      db.query.attendanceAudit.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValue(existingAuditRecord);

    const { registerAttendanceAction } = await import(
      "@/lib/actions/attendance-actions"
    );

    const baseTime = Date.now();
    const params = {
      cui: "12345678",
      courseCode: "MAT1234",
      courseName: "Matemática",
      groupLetter: "A",
      clientTimestamp: baseTime,
      codeExpiration: baseTime + 10000,
    };

    // Act
    const result = await registerAttendanceAction(params);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain("Ya has registrado asistencia");
    // Verify that insert was NOT called
    const insertMock = db.insert as ReturnType<typeof vi.fn>;
    // Since we call resetDbMocks, it should have 0 calls
    expect(insertMock).not.toHaveBeenCalled();
  });
});
