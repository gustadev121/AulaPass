import { and, eq, ne } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attendances, sessions } from "@/db/schema";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { sessionId, maxTeacherDelayMinutes, mockTime } = body;

    const delayThreshold =
      maxTeacherDelayMinutes !== undefined ? maxTeacherDelayMinutes : 20; // 20 minutos por defecto
    const now = mockTime ? new Date(mockTime) : new Date();

    // Buscar sesión
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
      return NextResponse.json({
        success: true,
        suspended: false,
        message: "No hay sesiones activas para verificar inasistencia docente.",
      });
    }

    // Si el docente ya ingresó, no hay inasistencia
    if (targetSession.teacherCheckIn) {
      return NextResponse.json({
        success: true,
        suspended: false,
        message: "El docente ya registró su ingreso para esta sesión.",
      });
    }

    // Si ya está suspendida o cerrada, ignorar
    if (
      targetSession.status === "CLOSED" ||
      targetSession.status === "SUSPENDED"
    ) {
      return NextResponse.json({
        success: true,
        suspended: false,
        message: "La sesión ya se encuentra inactiva.",
      });
    }

    // Calcular el límite de tiempo de espera
    const expectedStart = new Date(targetSession.expectedStart);
    const deadline = new Date(
      expectedStart.getTime() + delayThreshold * 60 * 1000,
    );

    if (now > deadline) {
      // [RF-08] Declarar inasistencia docente y suspender la sesión
      await db
        .update(sessions)
        .set({ status: "SUSPENDED" })
        .where(eq(sessions.id, targetSession.id));

      // Etiquetar las marcaciones de los alumnos con la observación de inasistencia docente
      const studentAttendances = await db
        .select()
        .from(attendances)
        .where(eq(attendances.sessionId, targetSession.id));

      let updatedCount = 0;
      for (const att of studentAttendances) {
        await db
          .update(attendances)
          .set({
            observation: "Clase Suspendida / Inasistencia Docente",
            status: "FALTA", // Pasa a falta formal al suspenderse la clase
          })
          .where(eq(attendances.id, att.id));
        updatedCount++;
      }

      return NextResponse.json({
        success: true,
        suspended: true,
        message: `La sesión se ha cerrado automáticamente como 'Clase Suspendida / Inasistencia Docente'. Se etiquetaron ${updatedCount} marcaciones de alumnos (RF-08).`,
        updatedCount,
      });
    }

    return NextResponse.json({
      success: true,
      suspended: false,
      message: "El docente se encuentra dentro del rango de espera permitido.",
      minutesRemaining: Math.max(
        0,
        Math.ceil((deadline.getTime() - now.getTime()) / 60000),
      ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: `Error al verificar inasistencia docente: ${error instanceof Error ? error.message : "Desconocido"}`,
      },
      { status: 500 },
    );
  }
}
