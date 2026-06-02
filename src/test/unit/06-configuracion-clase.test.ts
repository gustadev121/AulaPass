/**
 * 06 – Configuración de Clase
 * REQ-11: Letra del grupo existe en los grupos del curso asignado,
 *          longitud de código entre 6 y 12 caracteres,
 *          duración del código entre 5s y 30s.
 * Feature: Panel del Docente → Scenario: Configuración de la sesión de asistencia
 *
 * @see REQUIREMENTS.md REQ-11, REQ-12
 * @see TEST_CATALOG.md P_Conf_Grp_01–02, P_Conf_Lon_01–06, P_Conf_Dur_01–06
 * @see docente.feature lines 13-43
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the DB module at the boundary
vi.mock("@/db", () => {
  return import("./__mocks__/db");
});

describe("06 — Configuración de Clase (REQ-11)", () => {
  beforeEach(async () => {
    const { resetDbMocks } = await import("./__mocks__/db");
    resetDbMocks();
  });

  /** Helper: sets up default course and code mocks. */
  async function setupDefaultMocks(groups = "A,B") {
    const { db } = await import("./__mocks__/db");
    // Mock the course lookup
    (db.query.courses.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      code: "MAT1234",
      name: "Matemática",
      abbreviation: "MAT",
      groups,
    });
    // Mock the code uniqueness check to say it is unique
    (
      db.query.activeCodes.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValue(undefined);
  }

  // ─────────────────────────────────────────────────────────────
  // Grupo — Clase de equivalencia
  // ─────────────────────────────────────────────────────────────

  /**
   * P_Conf_Grp_01 — Grupo existe
   */
  it("[P_Conf_Grp_01] grupo existente en el curso → configuración aceptada", async () => {
    // Arrange
    await setupDefaultMocks("A,B");
    const { generateCodeAction } = await import(
      "@/lib/actions/teacher-actions"
    );
    const params = {
      courseCode: "MAT1234",
      groupLetter: "A",
      teacherUsername: "tteacher",
      durationSeconds: 15,
      length: 6,
    };

    // Act
    const result = await generateCodeAction(params);

    // Assert
    expect(result.success).toBe(true);
  });

  /**
   * P_Conf_Grp_02 — Grupo NO existe
   */
  it("[P_Conf_Grp_02] grupo no existente en el curso → error de validación", async () => {
    // Arrange
    await setupDefaultMocks("A,B");
    const { generateCodeAction } = await import(
      "@/lib/actions/teacher-actions"
    );
    const params = {
      courseCode: "MAT1234",
      groupLetter: "Z",
      teacherUsername: "tteacher",
      durationSeconds: 15,
      length: 6,
    };

    // Act
    const result = await generateCodeAction(params);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain("no pertenece a este curso");
  });

  // ─────────────────────────────────────────────────────────────
  // Longitud del código — Fronteras
  // ─────────────────────────────────────────────────────────────

  /**
   * P_Conf_Lon_01 — Longitud < 6 (Frontera -1)
   */
  it("[P_Conf_Lon_01] longitud = 5 (inválida) → error de validación", async () => {
    // Arrange
    await setupDefaultMocks("A,B");
    const { generateCodeAction } = await import(
      "@/lib/actions/teacher-actions"
    );
    const params = {
      courseCode: "MAT1234",
      groupLetter: "A",
      teacherUsername: "tteacher",
      durationSeconds: 15,
      length: 5,
    };

    // Act
    const result = await generateCodeAction(params);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain("entre 6 y 12 caracteres");
  });

  /**
   * P_Conf_Lon_02 — Longitud = 6 (Frontera exacta baja)
   */
  it("[P_Conf_Lon_02] longitud = 6 (válido bajo) → configuración aceptada", async () => {
    // Arrange
    await setupDefaultMocks("A,B");
    const { generateCodeAction } = await import(
      "@/lib/actions/teacher-actions"
    );
    const params = {
      courseCode: "MAT1234",
      groupLetter: "A",
      teacherUsername: "tteacher",
      durationSeconds: 15,
      length: 6,
    };

    // Act
    const result = await generateCodeAction(params);

    // Assert
    expect(result.success).toBe(true);
    expect(result.data?.code.length).toBe(6);
  });

  /**
   * P_Conf_Lon_03 — Longitud = 7 (Frontera exacta baja + 1)
   */
  it("[P_Conf_Lon_03] longitud = 7 (válido bajo +1) → configuración aceptada", async () => {
    // Arrange
    await setupDefaultMocks("A,B");
    const { generateCodeAction } = await import(
      "@/lib/actions/teacher-actions"
    );
    const params = {
      courseCode: "MAT1234",
      groupLetter: "A",
      teacherUsername: "tteacher",
      durationSeconds: 15,
      length: 7,
    };

    // Act
    const result = await generateCodeAction(params);

    // Assert
    expect(result.success).toBe(true);
    expect(result.data?.code.length).toBe(7);
  });

  /**
   * P_Conf_Lon_04 — Longitud = 11 (Frontera exacta alta - 1)
   */
  it("[P_Conf_Lon_04] longitud = 11 (válido alto -1) → configuración aceptada", async () => {
    // Arrange
    await setupDefaultMocks("A,B");
    const { generateCodeAction } = await import(
      "@/lib/actions/teacher-actions"
    );
    const params = {
      courseCode: "MAT1234",
      groupLetter: "A",
      teacherUsername: "tteacher",
      durationSeconds: 15,
      length: 11,
    };

    // Act
    const result = await generateCodeAction(params);

    // Assert
    expect(result.success).toBe(true);
    expect(result.data?.code.length).toBe(11);
  });

  /**
   * P_Conf_Lon_05 — Longitud = 12 (Frontera exacta alta)
   */
  it("[P_Conf_Lon_05] longitud = 12 (válido alto) → configuración aceptada", async () => {
    // Arrange
    await setupDefaultMocks("A,B");
    const { generateCodeAction } = await import(
      "@/lib/actions/teacher-actions"
    );
    const params = {
      courseCode: "MAT1234",
      groupLetter: "A",
      teacherUsername: "tteacher",
      durationSeconds: 15,
      length: 12,
    };

    // Act
    const result = await generateCodeAction(params);

    // Assert
    expect(result.success).toBe(true);
    expect(result.data?.code.length).toBe(12);
  });

  /**
   * P_Conf_Lon_06 — Longitud > 12 (Frontera + 1)
   */
  it("[P_Conf_Lon_06] longitud = 13 (inválido alto) → error de validación", async () => {
    // Arrange
    await setupDefaultMocks("A,B");
    const { generateCodeAction } = await import(
      "@/lib/actions/teacher-actions"
    );
    const params = {
      courseCode: "MAT1234",
      groupLetter: "A",
      teacherUsername: "tteacher",
      durationSeconds: 15,
      length: 13,
    };

    // Act
    const result = await generateCodeAction(params);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain("entre 6 y 12 caracteres");
  });

  // ─────────────────────────────────────────────────────────────
  // Duración del código — Fronteras
  // ─────────────────────────────────────────────────────────────

  /**
   * P_Conf_Dur_01 — Duración < 5s (Frontera -1)
   */
  it("[P_Conf_Dur_01] duración = 4s (inválida) → error de validación", async () => {
    // Arrange
    await setupDefaultMocks("A,B");
    const { generateCodeAction } = await import(
      "@/lib/actions/teacher-actions"
    );
    const params = {
      courseCode: "MAT1234",
      groupLetter: "A",
      teacherUsername: "tteacher",
      durationSeconds: 4,
      length: 6,
    };

    // Act
    const result = await generateCodeAction(params);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain("entre 5 y 30 segundos");
  });

  /**
   * P_Conf_Dur_02 — Duración = 5s (Frontera exacta baja)
   */
  it("[P_Conf_Dur_02] duración = 5s (válido bajo) → configuración aceptada", async () => {
    // Arrange
    await setupDefaultMocks("A,B");
    const { generateCodeAction } = await import(
      "@/lib/actions/teacher-actions"
    );
    const params = {
      courseCode: "MAT1234",
      groupLetter: "A",
      teacherUsername: "tteacher",
      durationSeconds: 5,
      length: 6,
    };

    // Act
    const result = await generateCodeAction(params);

    // Assert
    expect(result.success).toBe(true);
  });

  /**
   * P_Conf_Dur_03 — Duración = 6s (Frontera exacta baja + 1)
   */
  it("[P_Conf_Dur_03] duración = 6s (válido bajo +1) → configuración aceptada", async () => {
    // Arrange
    await setupDefaultMocks("A,B");
    const { generateCodeAction } = await import(
      "@/lib/actions/teacher-actions"
    );
    const params = {
      courseCode: "MAT1234",
      groupLetter: "A",
      teacherUsername: "tteacher",
      durationSeconds: 6,
      length: 6,
    };

    // Act
    const result = await generateCodeAction(params);

    // Assert
    expect(result.success).toBe(true);
  });

  /**
   * P_Conf_Dur_04 — Duración = 29s (Frontera exacta alta - 1)
   */
  it("[P_Conf_Dur_04] duración = 29s (válido alto -1) → configuración aceptada", async () => {
    // Arrange
    await setupDefaultMocks("A,B");
    const { generateCodeAction } = await import(
      "@/lib/actions/teacher-actions"
    );
    const params = {
      courseCode: "MAT1234",
      groupLetter: "A",
      teacherUsername: "tteacher",
      durationSeconds: 29,
      length: 6,
    };

    // Act
    const result = await generateCodeAction(params);

    // Assert
    expect(result.success).toBe(true);
  });

  /**
   * P_Conf_Dur_05 — Duración = 30s (Frontera exacta alta)
   */
  it("[P_Conf_Dur_05] duración = 30s (válido alto) → configuración aceptada", async () => {
    // Arrange
    await setupDefaultMocks("A,B");
    const { generateCodeAction } = await import(
      "@/lib/actions/teacher-actions"
    );
    const params = {
      courseCode: "MAT1234",
      groupLetter: "A",
      teacherUsername: "tteacher",
      durationSeconds: 30,
      length: 6,
    };

    // Act
    const result = await generateCodeAction(params);

    // Assert
    expect(result.success).toBe(true);
  });

  /**
   * P_Conf_Dur_06 — Duración > 30s (Frontera + 1)
   */
  it("[P_Conf_Dur_06] duración = 31s (inválido alto) → error de validación", async () => {
    // Arrange
    await setupDefaultMocks("A,B");
    const { generateCodeAction } = await import(
      "@/lib/actions/teacher-actions"
    );
    const params = {
      courseCode: "MAT1234",
      groupLetter: "A",
      teacherUsername: "tteacher",
      durationSeconds: 31,
      length: 6,
    };

    // Act
    const result = await generateCodeAction(params);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain("entre 5 y 30 segundos");
  });
});
