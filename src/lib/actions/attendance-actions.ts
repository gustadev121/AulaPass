"use server";

import { format } from "date-fns";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  activeCodes,
  attendanceAudit,
  courses,
  students,
  teachers,
} from "@/db/schema";

/**
 * Registers attendance for a student using a volatile code.
 * Satisfies REQ-14, REQ-15, REQ-16, REQ-17.
 */
export async function registerAttendanceAction(params: {
  cui: string;
  courseCode: string;
  courseName: string;
  groupLetter: string;
  clientTimestamp: number;
  codeExpiration: number;
}) {
  try {
    const {
      cui,
      courseCode,
      courseName,
      groupLetter,
      clientTimestamp,
      codeExpiration,
    } = params;

    // REQ-15: Validation of time limits (+1s Invalid, 0s Valid, -1s Valid)
    if (clientTimestamp > codeExpiration) {
      throw new Error("El código ha expirado");
    }

    const student = await db.query.students.findFirst({
      where: eq(students.cui, cui),
    });
    if (!student) throw new Error("CUI no registrado");

    // REQ-16: Control de Duplicados (same day + course + group + student)
    const today = format(new Date(), "yyyy-MM-dd");
    const existing = await db.query.attendanceAudit.findFirst({
      where: and(
        eq(attendanceAudit.studentCui, cui),
        eq(attendanceAudit.courseCode, courseCode),
        eq(attendanceAudit.groupLetter, groupLetter),
        sql`DATE(${attendanceAudit.timestamp}) = ${today}`,
      ),
    });

    if (existing) {
      throw new Error(
        "Ya has registrado asistencia para este curso y grupo hoy",
      );
    }

    // REQ-17: Auditoría de Asistencia
    await db.insert(attendanceAudit).values({
      courseCode,
      courseName,
      groupLetter,
      studentCui: cui,
      studentName: student.name,
      timestamp: new Date(clientTimestamp),
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Searches for a valid, active attendance code in the database.
 */
export async function lookupCodeAction(code: string) {
  try {
    const cleanCode = code.trim().toUpperCase();
    const active = await db.query.activeCodes.findFirst({
      where: eq(activeCodes.code, cleanCode),
    });

    if (!active) {
      return { success: false, error: "Código inválido" };
    }

    if (Date.now() > active.expiresAt.getTime()) {
      // Cleanup expired code
      await db.delete(activeCodes).where(eq(activeCodes.code, cleanCode));
      return { success: false, error: "El código ha expirado" };
    }

    return {
      success: true,
      data: {
        courseCode: active.courseCode,
        courseName: active.courseName,
        groupLetter: active.groupLetter,
        expiresAt: active.expiresAt.getTime(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Error al verificar código",
    };
  }
}

/**
 * Validates if a student CUI exists in the database.
 */
export async function validateStudentCuiAction(cui: string) {
  try {
    const student = await db.query.students.findFirst({
      where: eq(students.cui, cui),
    });
    if (!student) {
      return { success: false, error: "CUI no registrado en el sistema" };
    }
    return { success: true, student };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error de validación",
    };
  }
}

/**
 * Validates teacher credentials.
 */
export async function validateTeacherLoginAction(
  username: string,
  password: string,
) {
  try {
    const teacher = await db.query.teachers.findFirst({
      where: and(
        eq(teachers.username, username),
        eq(teachers.password, password),
      ),
    });
    if (!teacher) {
      return { success: false, error: "Usuario o contraseña incorrectos" };
    }
    return { success: true, teacher };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al iniciar sesión",
    };
  }
}

/**
 * Gets details of a course by its course code.
 */
export async function getCourseDetailsAction(courseCode: string) {
  try {
    const course = await db.query.courses.findFirst({
      where: eq(courses.code, courseCode),
    });
    if (!course) {
      return { success: false, error: "Curso no encontrado" };
    }
    return { success: true, course };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al obtener curso",
    };
  }
}
