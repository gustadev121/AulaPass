import { endOfWeek, format, startOfWeek } from "date-fns";
import { and, between, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { attendances, sessions } from "@/db/schema";
import { AttendanceRulesEngine } from "@/lib/attendance-rules";
import { UniversityService } from "@/lib/university-service";

/**
 * Obtiene todos los IDs de grupos que pertenecen al mismo curso que el grupo dado.
 */
export async function getCourseGroupIds(groupId: string): Promise<string[]> {
  const activeGroup = await UniversityService.getGroupById(groupId);
  if (!activeGroup) return [groupId];

  const classroomSchedules = await UniversityService.getClassroomSchedule();
  return Array.from(
    new Set(
      classroomSchedules
        .filter((item) => item.group.courseId === activeGroup.courseId)
        .map((item) => item.group.id),
    ),
  );
}

/**
 * Obtiene los IDs de todas las sesiones de una lista de grupos en una semana específica.
 */
export async function getWeekSessions(
  groupIds: string[],
  dateString: string,
): Promise<string[]> {
  if (groupIds.length === 0) return [];

  const sessionDate = new Date(`${dateString}T12:00:00Z`);
  const weekStart = format(
    startOfWeek(sessionDate, { weekStartsOn: 1 }),
    "yyyy-MM-dd",
  );
  const weekEnd = format(
    endOfWeek(sessionDate, { weekStartsOn: 1 }),
    "yyyy-MM-dd",
  );

  const weekSessions = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(
      and(
        inArray(sessions.groupId, groupIds),
        between(sessions.date, weekStart, weekEnd),
      ),
    );

  return weekSessions.map((s) => s.id);
}

/**
 * Verifica si un alumno ha asistido a alguna sesión del curso en la misma semana (excluyendo una sesión específica).
 */
export async function hasStudentAttendedCourseInWeek(
  studentCui: string,
  groupId: string,
  dateString: string,
  excludeSessionId?: string,
): Promise<boolean> {
  const courseGroupIds = await getCourseGroupIds(groupId);
  let weekSessionIds = await getWeekSessions(courseGroupIds, dateString);

  if (excludeSessionId) {
    weekSessionIds = weekSessionIds.filter((id) => id !== excludeSessionId);
  }

  if (weekSessionIds.length === 0) return false;

  const attended = await db
    .select()
    .from(attendances)
    .where(
      and(
        eq(attendances.studentCui, studentCui),
        inArray(attendances.sessionId, weekSessionIds),
        inArray(attendances.status, ["PUNTUAL", "TARDANZA"]),
      ),
    )
    .limit(1)
    .then((res) => res.length > 0);

  return attended;
}

/**
 * Elimina las faltas automáticas previas de la misma semana para un curso dado.
 */
export async function cleanupPreviousAbsences(
  studentCui: string,
  groupId: string,
  dateString: string,
  excludeSessionId?: string,
) {
  const courseGroupIds = await getCourseGroupIds(groupId);
  let weekSessionIds = await getWeekSessions(courseGroupIds, dateString);

  if (excludeSessionId) {
    weekSessionIds = weekSessionIds.filter((id) => id !== excludeSessionId);
  }

  if (weekSessionIds.length > 0) {
    await db
      .delete(attendances)
      .where(
        and(
          eq(attendances.studentCui, studentCui),
          inArray(attendances.sessionId, weekSessionIds),
          eq(attendances.status, "FALTA"),
        ),
      );
  }
}

/**
 * Cierra formalmente una sesión, aplicando salidas forzadas e inasistencias automáticas.
 * Centraliza RF-10 y RF-13.
 */
export async function closeSession(
  sessionId: string,
  closingReason: string = "Cierre de Sesión",
) {
  // 1. Buscar la sesión
  const session = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1)
    .then((res) => res[0]);

  if (
    !session ||
    session.status === "CLOSED" ||
    session.status === "SUSPENDED"
  ) {
    return {
      success: false,
      message: "La sesión no existe o ya está inactiva.",
    };
  }

  // 2. Cambiar estado a CLOSED
  await db
    .update(sessions)
    .set({ status: "CLOSED" })
    .where(eq(sessions.id, session.id));

  // 3. Obtener todas las asistencias registradas hasta ahora
  const allAttendances = await db
    .select()
    .from(attendances)
    .where(eq(attendances.sessionId, session.id));

  // 4. Mitigar olvidos de marcación de salida (RF-13)
  const openAttendances = allAttendances.filter((att) => att.checkOut === null);
  const expectedEndTime = new Date(session.expectedEnd);

  const forcedAttendances = AttendanceRulesEngine.applyAutomaticCheckOuts(
    openAttendances.map((att) => ({
      id: att.id,
      checkOut: att.checkOut,
      checkOutType: att.checkOutType as
        | "MANUAL"
        | "FORCED_BY_SESSION_CLOSE"
        | null,
      status: att.status as
        | "PUNTUAL"
        | "TARDANZA"
        | "FALTA"
        | "AMBIENTE_ESTUDIO",
    })),
    expectedEndTime,
  );

  let forcedCheckOutCount = 0;
  for (const forced of forcedAttendances) {
    if (forced.checkOut) {
      await db
        .update(attendances)
        .set({
          checkOut: forced.checkOut,
          checkOutType: "FORCED_BY_SESSION_CLOSE",
        })
        .where(eq(attendances.id, forced.id));
      forcedCheckOutCount++;
    }
  }

  // 5. Marcado automático de inasistencias (RF-10)
  // Solo aplica si no es Hora Hueco
  let absentCount = 0;
  if (session.groupId !== "HORA_HUECO") {
    const enrolledStudents = await UniversityService.getStudentsByGroup(
      session.groupId,
    );
    const absentStudentCuis = AttendanceRulesEngine.applyAutomaticAbsences(
      enrolledStudents,
      allAttendances,
    );

    for (const cui of absentStudentCuis) {
      // Flexibilidad de Curso: No marcar falta si asistió a otra sesión del curso en la misma semana
      const hasAttendedAny = await hasStudentAttendedCourseInWeek(
        cui,
        session.groupId,
        session.date,
        session.id,
      );

      if (!hasAttendedAny) {
        await db.insert(attendances).values({
          id: crypto.randomUUID(),
          studentCui: cui,
          sessionId: session.id,
          checkIn: session.expectedStart,
          checkOut: session.expectedEnd,
          status: "FALTA",
          observation: `Inasistencia automática (${closingReason})`,
        });
        absentCount++;
      }
    }
  }

  return {
    success: true,
    forcedCheckOutCount,
    absentCount,
  };
}

// Keep a deprecated SessionService namespace/object for easier transition if needed,
// but it's better to update all call sites.
export const SessionService = {
  getCourseGroupIds,
  getWeekSessions,
  hasStudentAttendedCourseInWeek,
  cleanupPreviousAbsences,
  closeSession,
};
