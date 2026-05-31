"use server";

import { format } from "date-fns";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { attendanceAudit, students } from "@/db/schema";

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
