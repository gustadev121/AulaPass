import { and, eq, isNull, ne } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attendances, sessions } from "@/db/schema";
import { AttendanceRulesEngine } from "@/lib/attendance-rules";
import { UniversityService } from "@/lib/university-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { sessionId } = body;

    // Buscar la sesión a cerrar
    let targetSession = null;
    if (sessionId) {
      targetSession = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .limit(1)
        .then((res) => res[0]);
    } else {
      targetSession = await db
        .select()
        .from(sessions)
        .where(
          and(eq(sessions.status, "ACTIVE"), ne(sessions.groupId, "HORA_HUECO")),
        )
        .limit(1)
        .then((res) => res[0]);
    }

    if (!targetSession) {
      return NextResponse.json(
        {
          success: false,
          message: "No se encontró ninguna sesión activa para cerrar.",
        },
        { status: 404 },
      );
    }

    if (
      targetSession.status === "CLOSED" ||
      targetSession.status === "SUSPENDED"
    ) {
      return NextResponse.json({
        success: true,
        message: "La sesión ya se encontraba cerrada.",
        closedCount: 0,
        absentCount: 0,
      });
    }

    // 1. Cambiar el estado de la sesión a CLOSED
    await db
      .update(sessions)
      .set({ status: "CLOSED" })
      .where(eq(sessions.id, targetSession.id));

    // 2. Mitigar olvidos de marcación de salida (RF-13)
    const allAttendances = await db
      .select()
      .from(attendances)
      .where(eq(attendances.sessionId, targetSession.id));

    const openAttendances = allAttendances.filter((att) => att.checkOut === null);

    const expectedEndTime = new Date(targetSession.expectedEnd);

    // Mapear registros con salidas forzadas usando el motor de reglas
    const forcedAttendances = AttendanceRulesEngine.applyAutomaticCheckOuts(
      openAttendances.map((att) => ({
        id: att.id,
        checkOut: att.checkOut,
        checkOutType: att.checkOutType,
        status: att.status,
      })),
      expectedEndTime,
    );

    // Guardar cambios en base de datos
    let closedCount = 0;
    for (const forced of forcedAttendances) {
      if (forced.checkOut) {
        await db
          .update(attendances)
          .set({
            checkOut: forced.checkOut,
            checkOutType: "FORCED_BY_SESSION_CLOSE",
          })
          .where(eq(attendances.id, forced.id));
        closedCount++;
      }
    }

    // 3. Marcado automático de inasistencias (RF-10)
    const enrolledStudents = await UniversityService.getStudentsByGroup(
      targetSession.groupId,
    );
    const absentStudentCuis = AttendanceRulesEngine.applyAutomaticAbsences(
      enrolledStudents,
      allAttendances,
    );

    let absentCount = 0;
    for (const cui of absentStudentCuis) {
      await db.insert(attendances).values({
        id: crypto.randomUUID(),
        studentCui: cui,
        sessionId: targetSession.id,
        checkIn: targetSession.expectedStart, // Se registra el inicio como referencia
        checkOut: targetSession.expectedEnd,
        status: "FALTA",
        observation: "Inasistencia automática (Cierre de Sesión)",
      });
      absentCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Sesión cerrada correctamente. Se forzó la marcación de salida de ${closedCount} alumno(s) y se marcaron ${absentCount} inasistencia(s).`,
      closedCount,
      absentCount,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: `Error al cerrar la sesión: ${error instanceof Error ? error.message : "Desconocido"}`,
      },
      { status: 500 },
    );
  }
}
