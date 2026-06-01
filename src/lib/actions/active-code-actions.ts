"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { type ActiveCode, activeCodes } from "@/lib/active-codes";

function generateRandomCode(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generates a unique active code for class attendance and registers it in memory.
 */
export async function generateCodeAction(params: {
  courseCode: string;
  groupLetter: string;
  length: number;
  durationSeconds: number;
}) {
  try {
    const { courseCode, groupLetter, length, durationSeconds } = params;

    if (length < 6 || length > 12) {
      return {
        success: false,
        error: "Longitud de código inválida (debe ser de 6 a 12)",
      };
    }

    if (durationSeconds < 5 || durationSeconds > 30) {
      return {
        success: false,
        error: "Duración de código inválida (debe ser de 5s a 30s)",
      };
    }

    const course = await db.query.courses.findFirst({
      where: eq(courses.code, courseCode),
    });

    if (!course) {
      return { success: false, error: "Curso no encontrado en el sistema" };
    }

    // Verify if group exists in the course groups list
    const availableGroups = course.groups.split(",").map((g) => g.trim());
    if (!availableGroups.includes(groupLetter)) {
      return {
        success: false,
        error: "El grupo especificado no pertenece a este curso",
      };
    }

    let code = "";
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      const candidate = generateRandomCode(length);
      const existing = activeCodes.get(candidate);

      // Unique if it doesn't exist or is already expired
      if (!existing || Date.now() > existing.expiresAt) {
        code = candidate;
        break;
      }
      attempts++;
    }

    if (!code) {
      return {
        success: false,
        error: "No se pudo generar un código único en este instante",
      };
    }

    const expiresAt = Date.now() + durationSeconds * 1000;

    const newActiveCode: ActiveCode = {
      code,
      courseCode,
      courseName: course.name,
      groupLetter,
      expiresAt,
    };

    activeCodes.set(code, newActiveCode);

    return {
      success: true,
      data: {
        code,
        expiresAt,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al generar código",
    };
  }
}

/**
 * Searches for a valid, active attendance code in memory.
 */
export async function lookupCodeAction(code: string) {
  try {
    const cleanCode = code.trim().toUpperCase();
    const active = activeCodes.get(cleanCode);

    if (!active) {
      return { success: false, error: "Código inválido" };
    }

    if (Date.now() > active.expiresAt) {
      activeCodes.delete(cleanCode);
      return { success: false, error: "El código ha expirado" };
    }

    return {
      success: true,
      data: {
        courseCode: active.courseCode,
        courseName: active.courseName,
        groupLetter: active.groupLetter,
        expiresAt: active.expiresAt,
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
