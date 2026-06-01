import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import {
  generateCodeAction,
  lookupCodeAction,
} from "@/lib/actions/active-code-actions";
import {
  registerAttendanceAction,
  validateStudentCuiAction,
  validateTeacherLoginAction,
} from "@/lib/actions/attendance-actions";
import { activeCodes } from "@/lib/active-codes";

// Mock database connection
vi.mock("@/db", () => {
  const mockStudents = {
    findFirst: vi.fn(),
  };
  const mockTeachers = {
    findFirst: vi.fn(),
  };
  const mockCourses = {
    findFirst: vi.fn(),
  };
  const mockAttendanceAudit = {
    findFirst: vi.fn(),
  };

  return {
    db: {
      query: {
        students: mockStudents,
        teachers: mockTeachers,
        courses: mockCourses,
        attendanceAudit: mockAttendanceAudit,
      },
      insert: vi.fn(() => ({
        values: vi.fn().mockResolvedValue({ success: true }),
      })),
      delete: vi.fn(() => ({
        mockResolvedValue: vi.fn(),
      })),
    },
  };
});

describe("AulaPass - Server Actions Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    activeCodes.clear();
  });

  describe("Autenticación Estudiante (REQ-13)", () => {
    it("debe permitir el ingreso si el CUI está registrado", async () => {
      const mockStudent = { cui: "12345678", name: "Estudiante Prueba" };
      (db.query.students.findFirst as unknown as Mock).mockResolvedValue(
        mockStudent,
      );

      const res = await validateStudentCuiAction("12345678");
      expect(res.success).toBe(true);
      expect(res.student).toEqual(mockStudent);
    });

    it("debe rechazar el ingreso si el CUI no está registrado", async () => {
      (db.query.students.findFirst as unknown as Mock).mockResolvedValue(
        undefined,
      );

      const res = await validateStudentCuiAction("00000000");
      expect(res.success).toBe(false);
      expect(res.error).toBe("CUI no registrado en el sistema");
    });
  });

  describe("Autenticación Docente (REQ-10)", () => {
    it("debe permitir el ingreso con credenciales correctas", async () => {
      const mockTeacher = {
        username: "jperez",
        password: "password",
        name: "Juan Perez",
        courseCode: "1234567",
      };
      (db.query.teachers.findFirst as unknown as Mock).mockResolvedValue(
        mockTeacher,
      );

      const res = await validateTeacherLoginAction("jperez", "password");
      expect(res.success).toBe(true);
      expect(res.teacher).toEqual(mockTeacher);
    });

    it("debe rechazar el ingreso con credenciales incorrectas", async () => {
      (db.query.teachers.findFirst as unknown as Mock).mockResolvedValue(
        undefined,
      );

      const res = await validateTeacherLoginAction("jperez", "incorrect");
      expect(res.success).toBe(false);
      expect(res.error).toBe("Usuario o contraseña incorrectos");
    });
  });

  describe("Configuración y Generación de Código (REQ-11, REQ-12)", () => {
    const validParams = {
      courseCode: "1234567",
      groupLetter: "A",
      length: 6,
      durationSeconds: 15,
    };

    it("debe generar un código activo de longitud y duración válidos", async () => {
      (db.query.courses.findFirst as unknown as Mock).mockResolvedValue({
        code: "1234567",
        name: "Matemática",
        abbreviation: "MAT",
        groups: "A,B",
      });

      const res = await generateCodeAction(validParams);
      expect(res.success).toBe(true);
      expect(res.data?.code.length).toBe(6);
      expect(res.data?.expiresAt).toBeGreaterThan(Date.now());

      // Verificar que el código se haya guardado en memoria
      if (!res.data) throw new Error("Code data should be defined");
      const lookup = await lookupCodeAction(res.data.code);
      expect(lookup.success).toBe(true);
      expect(lookup.data?.courseCode).toBe("1234567");
    });

    it("debe rechazar la generación si el grupo no pertenece al curso", async () => {
      (db.query.courses.findFirst as unknown as Mock).mockResolvedValue({
        code: "1234567",
        name: "Matemática",
        abbreviation: "MAT",
        groups: "A,B",
      });

      const res = await generateCodeAction({
        ...validParams,
        groupLetter: "Z",
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain(
        "grupo especificado no pertenece a este curso",
      );
    });

    it("debe validar los límites de la longitud del código (6-12)", async () => {
      const resUnder = await generateCodeAction({ ...validParams, length: 5 });
      expect(resUnder.success).toBe(false);

      const resOver = await generateCodeAction({ ...validParams, length: 13 });
      expect(resOver.success).toBe(false);
    });

    it("debe validar los límites de la duración del código (5s-30s)", async () => {
      const resUnder = await generateCodeAction({
        ...validParams,
        durationSeconds: 4,
      });
      expect(resUnder.success).toBe(false);

      const resOver = await generateCodeAction({
        ...validParams,
        durationSeconds: 31,
      });
      expect(resOver.success).toBe(false);
    });
  });

  describe("Registro de Asistencia y Límites (REQ-14, REQ-15)", () => {
    const mockStudent = { cui: "12345678", name: "Estudiante Prueba" };
    const registrationParams = {
      cui: "12345678",
      courseCode: "1234567",
      courseName: "Matemática",
      groupLetter: "A",
      codeExpiration: 1700000000000, // Referencia
    };

    beforeEach(() => {
      (db.query.students.findFirst as unknown as Mock).mockResolvedValue(
        mockStudent,
      );
      (db.query.attendanceAudit.findFirst as unknown as Mock).mockResolvedValue(
        undefined,
      );
    });

    it("debe registrar asistencia exitosamente dentro del tiempo válido (-1s)", async () => {
      const clientTimestamp = registrationParams.codeExpiration - 1000; // 1s antes de expirar

      const res = await registerAttendanceAction({
        ...registrationParams,
        clientTimestamp,
      });

      expect(res.success).toBe(true);
      expect(db.insert).toHaveBeenCalled();
    });

    it("debe registrar asistencia en el límite exacto de expiración (0s)", async () => {
      const clientTimestamp = registrationParams.codeExpiration; // En el límite exacto

      const res = await registerAttendanceAction({
        ...registrationParams,
        clientTimestamp,
      });

      expect(res.success).toBe(true);
      expect(db.insert).toHaveBeenCalled();
    });

    it("debe rechazar el registro de asistencia después de expirar (+1s)", async () => {
      const clientTimestamp = registrationParams.codeExpiration + 1000; // 1s después de expirar

      const res = await registerAttendanceAction({
        ...registrationParams,
        clientTimestamp,
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe("El código ha expirado");
    });
  });

  describe("Control de Duplicados (REQ-16)", () => {
    it("debe rechazar el registro de asistencia si ya firmó el mismo curso+grupo hoy", async () => {
      (db.query.students.findFirst as unknown as Mock).mockResolvedValue({
        cui: "12345678",
        name: "Estudiante Prueba",
      });

      // Simular que ya existe un registro de auditoría previo para hoy
      (db.query.attendanceAudit.findFirst as unknown as Mock).mockResolvedValue(
        {
          id: 1,
          courseCode: "1234567",
          groupLetter: "A",
          studentCui: "12345678",
          timestamp: new Date(),
        },
      );

      const res = await registerAttendanceAction({
        cui: "12345678",
        courseCode: "1234567",
        courseName: "Matemática",
        groupLetter: "A",
        clientTimestamp: Date.now(),
        codeExpiration: Date.now() + 10000,
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe(
        "Ya has registrado asistencia para este curso y grupo hoy",
      );
    });
  });
});
