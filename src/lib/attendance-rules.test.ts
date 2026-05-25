import { describe, expect, it } from "vitest";
import {
  type AttendanceRuleInput,
  AttendanceRulesEngine,
} from "./attendance-rules";
import type { ExternalGroup, ExternalStudent } from "./university-service";

describe("AttendanceRulesEngine - Pruebas Iniciales de Caja Negra", () => {
  // Mock base para estudiantes
  const mockStudent: ExternalStudent = {
    cui: "20201234",
    name: "Juan Pérez",
    enrolledGroupIds: ["SW-II-A"],
  };

  // Mock base para grupos del curso
  const currentCourseGroups: ExternalGroup[] = [
    {
      id: "SW-II-A",
      courseId: "INF-301",
      courseName: "Software II",
      teacherCui: "10",
      schedules: [],
    },
    {
      id: "SW-II-B",
      courseId: "INF-301",
      courseName: "Software II",
      teacherCui: "10",
      schedules: [],
    },
  ];

  describe("determineSwipeType - RF-09 Alternancia Entrada/Salida", () => {
    // PE Válida: Primera marcación
    it("debe retornar 'ENTRADA' si el estudiante no cuenta con registros en la sesión", () => {
      const type = AttendanceRulesEngine.determineSwipeType(false);
      expect(type).toBe("ENTRADA");
    });

    // PE Válida: Segunda marcación
    it("debe retornar 'SALIDA' si el estudiante ya registró ingreso en la sesión", () => {
      const type = AttendanceRulesEngine.determineSwipeType(true);
      expect(type).toBe("SALIDA");
    });
  });

  describe("RF-07 - Tolerancia Estática y Dinámica", () => {
    const expectedStart = new Date("2026-05-24T07:00:00Z");
    const teacherCheckIn = new Date("2026-05-24T07:05:00Z");

    // PE Válida: Tolerancia Estática
    it("debe calcular límite STATIC basado en la hora programada", () => {
      const limit = AttendanceRulesEngine.calculateToleranceLimit(
        expectedStart,
        null,
        "STATIC",
        15,
      );
      expect(limit.toISOString()).toBe("2026-05-24T07:15:00.000Z");
    });

    // PE Válida: Tolerancia Dinámica
    it("debe calcular límite DYNAMIC basado en el ingreso del docente", () => {
      const limit = AttendanceRulesEngine.calculateToleranceLimit(
        expectedStart,
        teacherCheckIn,
        "DYNAMIC",
        15,
      );
      expect(limit.toISOString()).toBe("2026-05-24T07:20:00.000Z");
    });

    // PE Válida: Tolerancia Dinámica sin ingreso docente (Fallback)
    it("debe usar hora programada como base si es DYNAMIC pero el docente no ha ingresado", () => {
      const limit = AttendanceRulesEngine.calculateToleranceLimit(
        expectedStart,
        null,
        "DYNAMIC",
        10,
      );
      expect(limit.toISOString()).toBe("2026-05-24T07:10:00.000Z");
    });

    // AVL: Tolerancia 0
    it("debe manejar tolerancia de 0 minutos (AVL exacto)", () => {
      const limit = AttendanceRulesEngine.calculateToleranceLimit(
        expectedStart,
        null,
        "STATIC",
        0,
      );
      expect(limit.getTime()).toBe(expectedStart.getTime());
    });
  });

  describe("RF-08 - Inasistencia Docente", () => {
    const start = new Date("2026-05-24T07:00:00Z");
    const delay = 20; // 20 minutos de espera

    // PE Válida: Docente a tiempo
    it("debe retornar false si el docente ingresó antes del límite", () => {
      const now = new Date("2026-05-24T07:15:00Z");
      expect(AttendanceRulesEngine.isTeacherLate(start, null, now, delay)).toBe(
        false,
      );
    });

    // AVL Exacto: Justo en el límite
    it("debe retornar false si el tiempo actual es exactamente el límite", () => {
      const now = new Date("2026-05-24T07:20:00Z");
      expect(AttendanceRulesEngine.isTeacherLate(start, null, now, delay)).toBe(
        false,
      );
    });

    // AVL Superior: 1 segundo después del límite
    it("debe retornar true si pasa 1 segundo del tiempo permitido", () => {
      const now = new Date("2026-05-24T07:20:01Z");
      expect(AttendanceRulesEngine.isTeacherLate(start, null, now, delay)).toBe(
        true,
      );
    });

    // PE Válida: Docente presente
    it("debe retornar false inmediatamente si el docente ya marcó ingreso, sin importar el tiempo", () => {
      const now = new Date("2026-05-24T08:00:00Z"); // Mucho después del límite
      const checkIn = new Date("2026-05-24T07:05:00Z");
      expect(
        AttendanceRulesEngine.isTeacherLate(start, checkIn, now, delay),
      ).toBe(false);
    });
  });

  describe("Helpers de Tiempo", () => {
    it("debe calcular correctamente los minutos restantes", () => {
      const deadline = new Date("2026-05-24T08:00:00Z");
      const now = new Date("2026-05-24T07:45:30Z");
      expect(AttendanceRulesEngine.getMinutesRemaining(deadline, now)).toBe(15);

      const past = new Date("2026-05-24T08:05:00Z");
      expect(AttendanceRulesEngine.getMinutesRemaining(deadline, past)).toBe(0);
    });
  });

  describe("RF-10 - Clasificación de Puntualidad (evaluateStudentSwipe)", () => {
    const baseSession = {
      id: "sess-1",
      groupId: "SW-II-A",
      expectedStart: new Date("2026-05-24T08:00:00Z"),
      expectedEnd: new Date("2026-05-24T09:30:00Z"),
      teacherCheckIn: null,
      status: "ACTIVE" as const,
      toleranceType: "STATIC" as const,
      toleranceLimit: new Date("2026-05-24T08:10:00Z"),
    };

    const baseInput: AttendanceRuleInput = {
      currentTime: new Date("2026-05-24T08:00:00Z"),
      student: mockStudent,
      activeSession: baseSession,
      currentCourseGroups,
      classroomSchedules: [],
    };

    // TC-4.04: Puntualidad antes del inicio (Estática)
    it("debe ser PUNTUAL 1s antes de la hora de inicio (TC-4.04)", () => {
      const result = AttendanceRulesEngine.evaluateStudentSwipe(
        { ...baseInput, currentTime: new Date("2026-05-24T07:59:59Z") },
        false,
      );
      expect(result.status).toBe("PUNTUAL");
    });

    // TC-4.05: Puntualidad en el límite exacto de inicio (Estática)
    it("debe ser PUNTUAL exactamente en la hora de inicio (TC-4.05)", () => {
      const result = AttendanceRulesEngine.evaluateStudentSwipe(
        { ...baseInput, currentTime: new Date("2026-05-24T08:00:00Z") },
        false,
      );
      expect(result.status).toBe("PUNTUAL");
    });

    // TC-4.06: Tardanza 1s después del inicio (Estática)
    it("debe ser TARDANZA 1s después del inicio (TC-4.06)", () => {
      const result = AttendanceRulesEngine.evaluateStudentSwipe(
        { ...baseInput, currentTime: new Date("2026-05-24T08:00:01Z") },
        false,
      );
      expect(result.status).toBe("TARDANZA");
    });

    // TC-4.07: Tardanza en el límite exacto (Estática)
    it("debe ser TARDANZA exactamente en el límite de tolerancia (TC-4.07)", () => {
      const result = AttendanceRulesEngine.evaluateStudentSwipe(
        { ...baseInput, currentTime: new Date("2026-05-24T08:10:00Z") },
        false,
      );
      expect(result.status).toBe("TARDANZA");
    });

    // TC-4.08: Falta 1s después del límite (Estática)
    it("debe ser FALTA 1s después del límite de tolerancia (TC-4.08)", () => {
      const result = AttendanceRulesEngine.evaluateStudentSwipe(
        { ...baseInput, currentTime: new Date("2026-05-24T08:10:01Z") },
        false,
      );
      expect(result.status).toBe("FALTA");
    });

    // TC-4.09 a TC-4.12: Tolerancia Dinámica
    const dynamicInput: AttendanceRuleInput = {
      ...baseInput,
      activeSession: {
        ...baseSession,
        toleranceType: "DYNAMIC",
        teacherCheckIn: new Date("2026-05-24T08:05:00Z"),
        toleranceLimit: new Date("2026-05-24T08:15:00Z"),
      },
    };

    it("debe ser PUNTUAL en el límite exacto de llegada del docente (TC-4.09)", () => {
      const result = AttendanceRulesEngine.evaluateStudentSwipe(
        { ...dynamicInput, currentTime: new Date("2026-05-24T08:05:00Z") },
        false,
      );
      expect(result.status).toBe("PUNTUAL");
    });

    it("debe ser TARDANZA 1s después de la llegada del docente (TC-4.10)", () => {
      const result = AttendanceRulesEngine.evaluateStudentSwipe(
        { ...dynamicInput, currentTime: new Date("2026-05-24T08:05:01Z") },
        false,
      );
      expect(result.status).toBe("TARDANZA");
    });

    it("debe ser TARDANZA en el límite recalculado (TC-4.11)", () => {
      const result = AttendanceRulesEngine.evaluateStudentSwipe(
        { ...dynamicInput, currentTime: new Date("2026-05-24T08:15:00Z") },
        false,
      );
      expect(result.status).toBe("TARDANZA");
    });

    it("debe ser FALTA 1s después del límite recalculado (TC-4.12)", () => {
      const result = AttendanceRulesEngine.evaluateStudentSwipe(
        { ...dynamicInput, currentTime: new Date("2026-05-24T08:15:01Z") },
        false,
      );
      expect(result.status).toBe("FALTA");
    });

    // TC-2.02: Flexibilidad de Grupo (Mismo curso, distinto grupo)
    it("debe permitir ingreso PUNTUAL si el alumno es de otro grupo pero del mismo curso (TC-2.02)", () => {
      const result = AttendanceRulesEngine.evaluateStudentSwipe(
        {
          ...baseInput,
          activeSession: { ...baseSession, groupId: "SW-II-B" },
        },
        false,
      );
      expect(result.valid).toBe(true);
      expect(result.status).toBe("PUNTUAL");
    });

    // TC-2.03: Validación de Matrícula (Escenario Negativo)
    it("debe rechazar si el alumno no pertenece a ningún grupo del curso (TC-2.03)", () => {
      const studentStranger: ExternalStudent = {
        cui: "9999",
        name: "Extraño",
        enrolledGroupIds: ["OTRO-CURSO"],
      };
      const result = AttendanceRulesEngine.evaluateStudentSwipe(
        { ...baseInput, student: studentStranger },
        false,
      );
      expect(result.valid).toBe(false);
      expect(result.message).toContain("no matriculado");
    });
  });

  describe("RF-05 - Sesión de Emergencia", () => {
    it("debe disparar autogeneración de emergencia si hay horario pero no sesión", () => {
      const now = new Date("2026-05-24T07:30:00Z");
      const input: AttendanceRuleInput = {
        currentTime: now,
        student: mockStudent,
        activeSession: null,
        currentCourseGroups,
        classroomSchedules: [
          {
            groupId: "SW-II-A",
            startTime: new Date("2026-05-24T07:00:00Z"),
            endTime: new Date("2026-05-24T08:40:00Z"),
          },
        ],
      };
      const result = AttendanceRulesEngine.evaluateStudentSwipe(input, false);
      expect(result.status).toBe("PUNTUAL");
      expect(result.message).toContain("autogeneración de emergencia");
    });
  });

  describe("RF-11 - Ambiente de Estudio", () => {
    const now = new Date("2026-05-24T12:00:00Z"); // Mediodía, sin clases

    // PE Válida: Hora hueco (sin sesión y sin horario programado)
    it("debe registrar AMBIENTE_ESTUDIO en periodos sin clases (hora hueco)", () => {
      const input: AttendanceRuleInput = {
        currentTime: now,
        student: mockStudent,
        activeSession: null,
        currentCourseGroups,
        classroomSchedules: [
          {
            groupId: "OTRO",
            startTime: new Date("2026-05-24T07:00:00Z"),
            endTime: new Date("2026-05-24T08:40:00Z"),
          },
        ],
      };
      const result = AttendanceRulesEngine.evaluateStudentSwipe(input, false);
      expect(result.status).toBe("AMBIENTE_ESTUDIO");
      expect(result.message).toContain("Hora Hueco");
    });
  });

  describe("RF-09 / RF-11 - Hora Hueco y reinicio diario", () => {
    it("debe registrar SALIDA en hora hueco si ya existe una marcación previa (TC-4.15)", () => {
      const input: AttendanceRuleInput = {
        currentTime: new Date("2026-05-24T12:05:00Z"),
        student: mockStudent,
        activeSession: null,
        currentCourseGroups,
        classroomSchedules: [],
      };
      const result = AttendanceRulesEngine.evaluateStudentSwipe(input, true);
      expect(result.swipeType).toBe("SALIDA");
      expect(result.status).toBe("AMBIENTE_ESTUDIO");
    });

    it("debe reiniciar el flujo diario como ENTRADA en un nuevo día (TC-4.16)", () => {
      const type = AttendanceRulesEngine.determineSwipeType(false);
      expect(type).toBe("ENTRADA");
    });

    it("debe registrar AMBIENTE_ESTUDIO si marca exactamente al cierre del bloque (TC-4.17)", () => {
      const input: AttendanceRuleInput = {
        currentTime: new Date("2026-05-24T09:30:00Z"),
        student: mockStudent,
        activeSession: null,
        currentCourseGroups,
        classroomSchedules: [
          {
            groupId: "SW-II-A",
            startTime: new Date("2026-05-24T08:00:00Z"),
            endTime: new Date("2026-05-24T09:30:00Z"),
          },
        ],
      };
      const result = AttendanceRulesEngine.evaluateStudentSwipe(input, false);
      expect(result.status).toBe("AMBIENTE_ESTUDIO");
    });
  });

  describe("RNF-01 - Robustez", () => {
    it("debe manejar inputs nulos o incompletos sin crashear", () => {
      // @ts-expect-error: Prueba de robustez en runtime
      const result1 = AttendanceRulesEngine.evaluateStudentSwipe(null, false);
      expect(result1.valid).toBe(false);
      expect(result1.message).toContain("inválidos");

      const incompleteInput: Partial<AttendanceRuleInput> = {
        student: mockStudent,
        // Falta currentTime
      };
      // @ts-expect-error: Prueba de robustez
      const result2 = AttendanceRulesEngine.evaluateStudentSwipe(
        incompleteInput,
        false,
      );
      expect(result2.valid).toBe(false);
    });
  });

  describe("RF-13 - Cierre Automático (Valores Límite)", () => {
    // TC-6.01 y TC-6.02: Salida justo antes o en el cierre
    it("debe permitir salida NORMAL justo antes del cierre (TC-6.01)", () => {
      const input: AttendanceRuleInput = {
        currentTime: new Date("2026-05-24T09:29:59Z"),
        student: mockStudent,
        activeSession: {
          id: "sess-1",
          groupId: "SW-II-A",
          expectedStart: new Date("2026-05-24T08:00:00Z"),
          expectedEnd: new Date("2026-05-24T09:30:00Z"),
          teacherCheckIn: new Date("2026-05-24T08:00:00Z"),
          status: "ACTIVE",
          toleranceType: "STATIC",
          toleranceLimit: new Date("2026-05-24T08:10:00Z"),
        },
        currentCourseGroups,
        classroomSchedules: [],
      };
      const result = AttendanceRulesEngine.evaluateStudentSwipe(input, true);
      expect(result.swipeType).toBe("SALIDA");
      expect(result.valid).toBe(true);
    });

    it("debe permitir salida NORMAL exactamente en el cierre (TC-6.02)", () => {
      const input: AttendanceRuleInput = {
        currentTime: new Date("2026-05-24T09:30:00Z"),
        student: mockStudent,
        activeSession: {
          id: "sess-1",
          groupId: "SW-II-A",
          expectedStart: new Date("2026-05-24T08:00:00Z"),
          expectedEnd: new Date("2026-05-24T09:30:00Z"),
          teacherCheckIn: new Date("2026-05-24T08:00:00Z"),
          status: "ACTIVE",
          toleranceType: "STATIC",
          toleranceLimit: new Date("2026-05-24T08:10:00Z"),
        },
        currentCourseGroups,
        classroomSchedules: [],
      };
      const result = AttendanceRulesEngine.evaluateStudentSwipe(input, true);
      expect(result.swipeType).toBe("SALIDA");
      expect(result.valid).toBe(true);
    });

    it("debe marcar como salida forzada a los alumnos que no registraron su salida", () => {
      const attendances = [
        {
          studentCui: "20201234",
          checkIn: "2026-05-24T07:00:00Z",
          checkOut: null,
          checkOutType: "NORMAL",
          status: "PUNTUAL",
        },
        {
          studentCui: "20205678",
          checkIn: "2026-05-24T07:15:00Z",
          checkOut: "2026-05-24T08:30:00Z",
          checkOutType: "NORMAL",
          status: "TARDANZA",
        },
      ];

      const expectedEnd = new Date("2026-05-24T08:40:00Z");
      const results = AttendanceRulesEngine.applyAutomaticCheckOuts(
        attendances,
        expectedEnd,
      );

      expect(results[0].checkOut).toBe(expectedEnd.toISOString());
      expect(results[0].checkOutType).toBe("FORCED_BY_SESSION_CLOSE");

      // El segundo estudiante no se altera porque ya tenía registro de salida
      expect(results[1].checkOut).toBe("2026-05-24T08:30:00Z");
      expect(results[1].checkOutType).toBe("NORMAL");
    });
  });
});
