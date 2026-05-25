import { and, eq, ne } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { SessionService } from "@/lib/session-service";

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

    // Usar el servicio para cerrar la sesión (RF-10, RF-13)
    const result = await SessionService.closeSession(targetSession.id, "Cierre Manual");

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Sesión cerrada correctamente. Se forzó la marcación de salida de ${result.forcedCheckOutCount} alumno(s) y se marcaron ${result.absentCount} inasistencia(s).`,
      closedCount: result.forcedCheckOutCount,
      absentCount: result.absentCount,
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
