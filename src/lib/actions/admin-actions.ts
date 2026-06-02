"use server";

import { db } from "@/db";
import { attendanceAudit, courses, students, teachers } from "@/db/schema";
import {
  CourseCSVSchema,
  StudentCSVSchema,
  TeacherCSVSchema,
} from "@/lib/validations/csv-schemas";

/**
 * Uploads and upserts courses from CSV data.
 *
 * @param data - Array of course data from CSV.
 * @returns A promise that resolves to an object indicating success or failure.
 */
export async function uploadCoursesAction(data: unknown[]) {
  try {
    const validatedData = data.map((row) => CourseCSVSchema.parse(row));

    const uniqueCourses = Array.from(
      new Map(validatedData.map((item) => [item.code, item])).values(),
    );

    for (const course of uniqueCourses) {
      await db
        .insert(courses)
        .values(course)
        .onConflictDoUpdate({
          target: courses.code,
          set: {
            name: course.name,
            abbreviation: course.abbreviation,
            groups: course.groups,
          },
        });
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Error al procesar cursos",
    };
  }
}

/**
 * Uploads and upserts teachers from CSV data.
 *
 * @param data - Array of teacher data from CSV.
 * @returns A promise that resolves to an object indicating success or failure.
 */
export async function uploadTeachersAction(data: unknown[]) {
  try {
    const validatedData = data.map((row) => TeacherCSVSchema.parse(row));

    const uniqueTeachers = Array.from(
      new Map(validatedData.map((item) => [item.username, item])).values(),
    );

    for (const teacher of uniqueTeachers) {
      await db
        .insert(teachers)
        .values(teacher)
        .onConflictDoUpdate({
          target: teachers.username,
          set: {
            password: teacher.password,
            name: teacher.name,
            courseCode: teacher.courseCode,
          },
        });
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Error al procesar docentes",
    };
  }
}

/**
 * Uploads and upserts students from CSV data.
 *
 * @param data - Array of student data from CSV.
 * @returns A promise that resolves to an object indicating success or failure.
 */
export async function uploadStudentsAction(data: unknown[]) {
  try {
    const validatedData = data.map((row) => StudentCSVSchema.parse(row));

    const uniqueStudents = Array.from(
      new Map(validatedData.map((item) => [item.cui, item])).values(),
    );

    for (const student of uniqueStudents) {
      await db
        .insert(students)
        .values(student)
        .onConflictDoUpdate({
          target: students.cui,
          set: {
            name: student.name,
          },
        });
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error al procesar estudiantes",
    };
  }
}

/**
 * Clears all courses, teachers, and students from the system.
 *
 * @returns A promise that resolves to an object indicating success or failure.
 */
export async function clearSystemDataAction() {
  try {
    await db.delete(courses);
    await db.delete(teachers);
    await db.delete(students);
    return { success: true };
  } catch (_error) {
    return { success: false, error: "Error al limpiar datos del sistema" };
  }
}

/**
 * Clears all attendance audit logs from the system.
 *
 * @returns A promise that resolves to an object indicating success or failure.
 */
export async function clearAuditLogsAction() {
  try {
    await db.delete(attendanceAudit);
    return { success: true };
  } catch (_error) {
    return { success: false, error: "Error al limpiar auditoría" };
  }
}

/**
 * Retrieves all courses from the database.
 */
export async function getCoursesAction() {
  try {
    const data = await db.query.courses.findMany();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al cargar cursos",
    };
  }
}

/**
 * Retrieves all teachers from the database.
 */
export async function getTeachersAction() {
  try {
    const data = await db.query.teachers.findMany();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Error al cargar docentes",
    };
  }
}

/**
 * Retrieves all students from the database.
 */
export async function getStudentsAction() {
  try {
    const data = await db.query.students.findMany();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Error al cargar estudiantes",
    };
  }
}

/**
 * Retrieves all attendance audit logs, ordered by timestamp descending.
 */
export async function getAuditLogsAction() {
  try {
    const data = await db.query.attendanceAudit.findMany({
      orderBy: (audit, { desc }) => [desc(audit.timestamp)],
    });
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Error al cargar auditoría",
    };
  }
}
