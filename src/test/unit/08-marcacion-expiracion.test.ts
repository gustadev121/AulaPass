/**
 * 08 – Marcación y Expiración del Código
 * REQ-14: Registro de asistencia si coincide y está activo.
 * REQ-15: Prueba de límites de tiempo (+1s inválido, 0s exacto válido, -1s antes válido).
 * Feature: Panel del Estudiante → Scenario: Registro de asistencia con código
 *
 * @see REQUIREMENTS.md REQ-14, REQ-15
 * @see TEST_CATALOG.md P_Asis_Tpo_01, P_Asis_Tpo_02, P_Asis_Tpo_03
 * @see estudiante.feature lines 13-33
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the DB module at the boundary
vi.mock("@/db", () => {
  return import("./__mocks__/db");
});

describe("08 — Marcación y Expiración del Código (REQ-14, REQ-15)", () => {
  beforeEach(async () => {
    const { resetDbMocks } = await import("./__mocks__/db");
    resetDbMocks();
  });

  /** Helper: sets up student existence and no previous attendance. */
  async function setupDefaultMocks() {
    const { db } = await import("./__mocks__/db");
    // Student exists
    (db.query.students.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      cui: "12345678",
      name: "Maria Lopez",
    });
    // No attendance recorded today yet
    (db.query.attendanceAudit.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
      undefined,
    );
  }

  /**
   * P_Asis_Tpo_01 — Antes de expirar (Frontera -1s)
   * Gherkin:
   *   Given que un estudiante con CUI registrado "12345678"
   *   And   un código con expiración en "T"
   *   When  registra asistencia con timestamp de cliente "T - 1000" ms (antes de expirar)
   *   Then  el sistema debe mostrar el resultado "Asistencia Registrada"
   */
  it("[P_Asis_Tpo_01] 1s antes de expirar → asistencia registrada", async () => {
    // Arrange
    await setupDefaultMocks();
    const { registerAttendanceAction } = await import(
      "@/lib/actions/attendance-actions"
    );

    const baseTime = Date.now();
    const codeExpiration = baseTime + 10000; // expires in 10s
    const clientTimestamp = codeExpiration - 1000; // 1s before expiration

    const params = {
      cui: "12345678",
      courseCode: "MAT1234",
      courseName: "Matemática",
      groupLetter: "A",
      clientTimestamp,
      codeExpiration,
    };

    // Act
    const result = await registerAttendanceAction(params);

    // Assert
    expect(result.success).toBe(true);
  });

  /**
   * P_Asis_Tpo_02 — Límite exacto (Frontera 0s)
   * Gherkin:
   *   Given que un estudiante con CUI registrado "12345678"
   *   And   un código con expiración en "T"
   *   When  registra asistencia con timestamp de cliente "T" ms (límite exacto)
   *   Then  el sistema debe mostrar el resultado "Asistencia Registrada"
   */
  it("[P_Asis_Tpo_02] en el segundo exacto de expiración → asistencia registrada", async () => {
    // Arrange
    await setupDefaultMocks();
    const { registerAttendanceAction } = await import(
      "@/lib/actions/attendance-actions"
    );

    const baseTime = Date.now();
    const codeExpiration = baseTime + 10000; // expires in 10s
    const clientTimestamp = codeExpiration; // exact limit

    const params = {
      cui: "12345678",
      courseCode: "MAT1234",
      courseName: "Matemática",
      groupLetter: "A",
      clientTimestamp,
      codeExpiration,
    };

    // Act
    const result = await registerAttendanceAction(params);

    // Assert
    expect(result.success).toBe(true);
  });

  /**
   * P_Asis_Tpo_03 — Después de expirar (Frontera +1s)
   * Gherkin:
   *   Given que un estudiante con CUI registrado "12345678"
   *   And   un código con expiración en "T"
   *   When  registra asistencia con timestamp de cliente "T + 1000" ms (después de expirar)
   *   Then  el sistema debe mostrar el resultado "Código expirado / Error"
   */
  it("[P_Asis_Tpo_03] 1s después de expirar → rechaza asistencia (Código expirado)", async () => {
    // Arrange
    await setupDefaultMocks();
    const { registerAttendanceAction } = await import(
      "@/lib/actions/attendance-actions"
    );

    const baseTime = Date.now();
    const codeExpiration = baseTime + 10000; // expires in 10s
    const clientTimestamp = codeExpiration + 1000; // 1s after expiration

    const params = {
      cui: "12345678",
      courseCode: "MAT1234",
      courseName: "Matemática",
      groupLetter: "A",
      clientTimestamp,
      codeExpiration,
    };

    // Act
    const result = await registerAttendanceAction(params);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain("El código ha expirado");
  });
});
