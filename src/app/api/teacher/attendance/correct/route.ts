import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attendances, auditLogs } from "@/db/schema";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentCui, sessionId, newStatus, reason, actorCui } = body;

    // Validación básica de parámetros
    if (!studentCui || !sessionId || !newStatus || !reason || !actorCui) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Parámetros incompletos. Se requiere: studentCui, sessionId, newStatus, reason, actorCui.",
        },
        { status: 400 },
      );
    }

    if (
      !["PUNTUAL", "TARDANZA", "FALTA", "AMBIENTE_ESTUDIO"].includes(newStatus)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "El estado de asistencia especificado no es válido.",
        },
        { status: 400 },
      );
    }

    // Buscar si existe registro previo de asistencia
    const existingAttendance = await db
      .select()
      .from(attendances)
      .where(
        and(
          eq(attendances.studentCui, studentCui),
          eq(attendances.sessionId, sessionId),
        ),
      )
      .limit(1)
      .then((res) => res[0]);

    if (existingAttendance) {
      const originalStatus = existingAttendance.status;

      // 1. Modificar el estado y añadir la justificación en observaciones (RF-14)
      await db
        .update(attendances)
        .set({
          status: newStatus,
          observation: `Corregido por docente: ${reason}`,
        })
        .where(eq(attendances.id, existingAttendance.id));

      // 2. Registrar en historial de auditoría
      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        sessionId,
        actorCui,
        studentCui,
        originalStatus,
        newStatus,
        reason,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: `Asistencia de estudiante corregida de ${originalStatus} a ${newStatus} y registrada en auditoría.`,
      });
    }

    // Si no existe, "añadir" asistencia manual (RF-14)
    const newAttendanceId = crypto.randomUUID();
    await db.insert(attendances).values({
      id: newAttendanceId,
      studentCui,
      sessionId,
      checkIn: new Date().toISOString(),
      status: newStatus,
      checkOutType: "NORMAL",
      observation: `Añadido manualmente por el docente: ${reason}`,
    });

    // Registrar en historial de auditoría
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      sessionId,
      actorCui,
      studentCui,
      originalStatus: "INEXISTENTE",
      newStatus,
      reason,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `Asistencia añadida manualmente como ${newStatus} y registrada en auditoría.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: `Error al corregir asistencia: ${error instanceof Error ? error.message : "Desconocido"}`,
      },
      { status: 500 },
    );
  }
}
