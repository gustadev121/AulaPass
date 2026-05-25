import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { attendances, sessions } from "@/db/schema";
import { AttendanceRulesEngine } from "@/lib/attendance-rules";
import { UniversityService } from "@/lib/university-service";

export class SessionService {
  /**
   * Cierra formalmente una sesión, aplicando salidas forzadas e inasistencias automáticas.
   * Centraliza RF-10 y RF-13.
   */
  static async closeSession(sessionId: string, closingReason: string = "Cierre de Sesión") {
    // 1. Buscar la sesión
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1)
      .then((res) => res[0]);

    if (!session || session.status === "CLOSED" || session.status === "SUSPENDED") {
      return { success: false, message: "La sesión no existe o ya está inactiva." };
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
        checkOutType: att.checkOutType as any,
        status: att.status as any,
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

    return {
      success: true,
      forcedCheckOutCount,
      absentCount,
    };
  }
}
