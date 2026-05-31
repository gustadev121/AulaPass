"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { students, teachers } from "@/db/schema";

/**
 * Validates admin credentials against hardcoded values.
 *
 * @param username - The administrator username.
 * @param password - The administrator password.
 * @returns A promise that resolves to an object indicating success and the user role, or failure with an error message.
 */
export async function loginAdminAction(username: string, password: string) {
  const ADMIN_USER = "admin";
  const ADMIN_PASS = "admin123";

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    return { success: true, role: "admin" };
  }

  return { success: false, error: "Credenciales de administrador inválidas" };
}

/**
 * Validates teacher credentials against the database.
 *
 * @param username - The teacher's username.
 * @param password - The teacher's password.
 * @returns A promise that resolves to an object indicating success, role, and teacher data, or failure with an error message.
 */
export async function loginTeacherAction(username: string, password: string) {
  try {
    const teacher = await db.query.teachers.findFirst({
      where: eq(teachers.username, username),
      with: {
        course: true,
      },
    });

    if (teacher && teacher.password === password) {
      return {
        success: true,
        role: "teacher",
        data: {
          username: teacher.username,
          name: teacher.name,
          courseCode: teacher.courseCode,
          courseName: teacher.course?.name || "Sin curso asignado",
          groups: teacher.course?.groups || "",
        },
      };
    }

    return { success: false, error: "Usuario o contraseña incorrectos" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error en el servidor",
    };
  }
}

/**
 * Validates student CUI against the database.
 *
 * @param cui - The student's CUI.
 * @returns A promise that resolves to an object indicating success, role, and student data, or failure with an error message.
 */
export async function loginStudentAction(cui: string) {
  try {
    const student = await db.query.students.findFirst({
      where: eq(students.cui, cui),
    });

    if (student) {
      return {
        success: true,
        role: "student",
        data: {
          cui: student.cui,
          name: student.name,
        },
      };
    }

    return { success: false, error: "CUI no registrado" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error en el servidor",
    };
  }
}
