"use server";

import { eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { activeCodes, courses } from "@/db/schema";

/**
 * Generates a random alphanumeric code of specified length.
 *
 * @param length - The desired length of the generated code.
 * @returns A random alphanumeric string.
 */
function generateRandomCode(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generates and persists a volatile attendance code.
 *
 * @param params - The parameters for generating the code.
 * @param params.courseCode - The unique code of the course.
 * @param params.groupLetter - The letter identifying the group (e.g., 'A', 'B').
 * @param params.teacherUsername - The username of the teacher generating the code.
 * @param params.durationSeconds - How long the code remains valid (5-30 seconds).
 * @param params.codeLength - The length of the generated code (6-12 characters).
 * @returns A promise that resolves to an object indicating success and the generated code data, or failure with an error message.
 */
export async function generateCodeAction(params: {
  courseCode: string;
  groupLetter: string;
  teacherUsername: string;
  durationSeconds: number;
  codeLength: number;
}) {
  try {
    const {
      courseCode,
      groupLetter,
      teacherUsername,
      durationSeconds,
      codeLength,
    } = params;

    if (durationSeconds < 5 || durationSeconds > 30) {
      throw new Error("La duración debe estar entre 5 y 30 segundos");
    }
    if (codeLength < 6 || codeLength > 12) {
      throw new Error("La longitud debe estar entre 6 y 12 caracteres");
    }

    const course = await db.query.courses.findFirst({
      where: eq(courses.code, courseCode),
    });
    if (!course) throw new Error("Curso no encontrado");

    const availableGroups = course.groups.split(",").map((g) => g.trim());
    if (!availableGroups.includes(groupLetter)) {
      throw new Error(`El grupo ${groupLetter} no pertenece a este curso`);
    }

    let code = "";
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      code = generateRandomCode(codeLength);
      const existing = await db.query.activeCodes.findFirst({
        where: eq(activeCodes.code, code),
      });
      if (!existing) isUnique = true;
      attempts++;
    }

    if (!isUnique) throw new Error("No se pudo generar un código único");

    const expiresAt = new Date(Date.now() + durationSeconds * 1000);

    await db.insert(activeCodes).values({
      code,
      courseCode,
      courseName: course.name,
      groupLetter,
      teacherUsername,
      expiresAt,
    });

    await db.delete(activeCodes).where(lt(activeCodes.expiresAt, new Date()));

    return {
      success: true,
      data: {
        code,
        expiresAt: expiresAt.getTime(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al generar código",
    };
  }
}
