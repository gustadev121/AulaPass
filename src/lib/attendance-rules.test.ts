import { describe, expect, it } from "vitest";
import { AttendanceRulesEngine, type AttendanceRuleInput } from "./attendance-rules";
import type { ExternalStudent, ExternalGroup } from "./university-service";

describe("AttendanceRulesEngine - Pruebas Iniciales de Caja Negra", () => {
  // Mock base para estudiantes
  const mockStudent: ExternalStudent = {
    cui: "20201234",
    name: "Juan Pérez",
    enrolledGroupIds: ["SW-II-A"],
  };

  // Mock base para grupos del curso
  const currentCourseGroups: ExternalGroup[] = [
    { id: "SW-II-A", courseId: "INF-301", courseName: "Software II", teacherCui: "10", schedules: [] },
    { id: "SW-II-B", courseId: "INF-301", courseName: "Software II", teacherCui: "10", schedules: [] },
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
      const limit = AttendanceRulesEngine.calculateToleranceLimit(expectedStart, null, "STATIC", 15);
      expect(limit.toISOString()).toBe("2026-05-24T07:15:00.000Z");
    });

    // PE Válida: Tolerancia Dinámica
    it("debe calcular límite DYNAMIC basado en el ingreso del docente", () => {
      const limit = AttendanceRulesEngine.calculateToleranceLimit(expectedStart, teacherCheckIn, "DYNAMIC", 15);
      expect(limit.toISOString()).toBe("2026-05-24T07:20:00.000Z");
    });

    // AVL: Tolerancia 0
    it("debe manejar tolerancia de 0 minutos (AVL exacto)", () => {
      const limit = AttendanceRulesEngine.calculateToleranceLimit(expectedStart, null, "STATIC", 0);
      expect(limit.getTime()).toBe(expectedStart.getTime());
    });
  });

  describe("RF-08 - Inasistencia Docente", () => {
    const start = new Date("2026-05-24T07:00:00Z");
    const delay = 20; // 20 minutos de espera

    // PE Válida: Docente a tiempo
    it("debe retornar false si el docente ingresó antes del límite", () => {
      const now = new Date("2026-05-24T07:15:00Z");
      expect(AttendanceRulesEngine.isTeacherLate(start, null, now, delay)).toBe(false);
    });

    // AVL Exacto: Justo en el límite
    it("debe retornar false si el tiempo actual es exactamente el límite", () => {
      const now = new Date("2026-05-24T07:20:00Z");
      expect(AttendanceRulesEngine.isTeacherLate(start, null, now, delay)).toBe(false);
    });

    // AVL Superior: 1 segundo después del límite
    it("debe retornar true si pasa 1 segundo del tiempo permitido", () => {
      const now = new Date("2026-05-24T07:20:01Z");
      expect(AttendanceRulesEngine.isTeacherLate(start, null, now, delay)).toBe(true);
    });
  });

  describe("RF-10 - Clasificación de Puntualidad (evaluateStudentSwipe)", () => {
    const baseInput: AttendanceRuleInput = {
      currentTime: new Date("2026-05-24T07:10:00Z"),
      student: mockStudent,
      activeSession: {
        id: "sess-1",
        groupId: "SW-II-A",
        expectedStart: new Date("2026-05-24T07:00:00Z"),
        expectedEnd: new Date("2026-05-24T08:40:00Z"),
        teacherCheckIn: null,
        status: "ACTIVE",
        toleranceType: "STATIC",
        toleranceLimit: new Date("2026-05-24T07:15:00Z"),
      },
      currentCourseGroups,
      classroomSchedules: [],
    };

    // AVL Inferior: 1 segundo antes del límite de tolerancia
    it("debe ser PUNTUAL 1s antes del límite de tolerancia", () => {
      const result = AttendanceRulesEngine.evaluateStudentSwipe(
        { ...baseInput, currentTime: new Date("2026-05-24T07:14:59Z") },
        false
      );
      expect(result.status).toBe("PUNTUAL");
    });

    // AVL Exacto: Justo en el límite de tolerancia
    it("debe ser PUNTUAL exactamente en el límite de tolerancia", () => {
      const result = AttendanceRulesEngine.evaluateStudentSwipe(baseInput, false);
      baseInput.currentTime = new Date("2026-05-24T07:15:00Z");
      expect(result.status).toBe("PUNTUAL");
    });

    // AVL Superior: 1 segundo después del límite de tolerancia
    it("debe ser TARDANZA 1s después del límite de tolerancia", () => {
      const result = AttendanceRulesEngine.evaluateStudentSwipe(
        { ...baseInput, currentTime: new Date("2026-05-24T07:15:01Z") },
        false
      );
      expect(result.status).toBe("TARDANZA");
    });

    // AVL Exacto: Justo al final de la clase
    it("debe ser TARDANZA exactamente al segundo final de la clase", () => {
      const result = AttendanceRulesEngine.evaluateStudentSwipe(
        { ...baseInput, currentTime: new Date("2026-05-24T08:40:00Z") },
        false
      );
      expect(result.status).toBe("TARDANZA");
    });

    // PE Válida: Marcación después de fin de clase
    it("debe ser FALTA después del fin de la clase", () => {
      const result = AttendanceRulesEngine.evaluateStudentSwipe(
        { ...baseInput, currentTime: new Date("2026-05-24T08:40:01Z") },
        false
      );
      expect(result.status).toBe("FALTA");
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
          { groupId: "OTRO", startTime: new Date("2026-05-24T07:00:00Z"), endTime: new Date("2026-05-24T08:40:00Z") }
        ],
      };
      const result = AttendanceRulesEngine.evaluateStudentSwipe(input, false);
      expect(result.status).toBe("AMBIENTE_ESTUDIO");
      expect(result.message).toContain("Hora Hueco");
    });
  });

  describe("RF-13 - Cierre Automático (Valores Límite)", () => {
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
