"use server";

import { format } from "date-fns";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { attendanceAudit, courses, students, teachers } from "@/db/schema";

/**
 * Registers attendance for a student in a specific course and group.
 * @param params - Registration parameters including student CUI, course details, and timestamps.
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

    const student = await db.query.students.findFirst({
      where: eq(students.cui, cui),
    });
    if (!student) throw new Error("CUI no registrado");

    if (clientTimestamp > codeExpiration) {
      throw new Error("El código ha expirado");
    }

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

    await db.insert(attendanceAudit).values({
      courseCode,
      courseName,
      groupLetter,
      studentCui: cui,
      studentName: student.name,
      timestamp: new Date(),
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
