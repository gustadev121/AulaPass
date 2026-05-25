import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attendances, auditLogs } from "@/db/schema";

const VALID_STATUSES = [
  "PUNTUAL",
  "TARDANZA",
  "FALTA",
  "AMBIENTE_ESTUDIO",
] as const;
type AttendanceStatus = (typeof VALID_STATUSES)[number];
type OperationType = "UPDATE" | "DELETE" | "CREATE";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentCui, sessionId, newStatus, reason, actorCui, operation } =
      body as {
        studentCui?: string;
        sessionId?: string;
        newStatus?: AttendanceStatus;
        reason?: string;
        actorCui?: string;
        operation?: OperationType;
      };

    // Validación básica de parámetros
    if (!studentCui || !sessionId || !reason || !actorCui) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Parámetros incompletos. Se requiere: studentCui, sessionId, reason, actorCui.",
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

    const effectiveOperation: OperationType =
      operation ?? (existingAttendance ? "UPDATE" : "CREATE");

    if (effectiveOperation !== "DELETE" && !newStatus) {
      return NextResponse.json(
        {
          success: false,
          message: "Se requiere newStatus para la operación solicitada.",
        },
        { status: 400 },
      );
    }

    if (
      effectiveOperation !== "DELETE" &&
      !VALID_STATUSES.includes(newStatus as AttendanceStatus)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "El estado de asistencia especificado no es válido.",
        },
        { status: 400 },
      );
    }

    if (effectiveOperation === "UPDATE") {
      if (!existingAttendance) {
        return NextResponse.json(
          {
            success: false,
            message: "No existe una asistencia previa para actualizar.",
          },
          { status: 404 },
        );
      }

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
        newStatus: newStatus as AttendanceStatus,
        reason,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: `Asistencia de estudiante corregida de ${originalStatus} a ${newStatus} y registrada en auditoría.`,
      });
    }

    if (effectiveOperation === "DELETE") {
      if (!existingAttendance) {
        return NextResponse.json(
          {
            success: false,
            message: "No existe una asistencia previa para anular.",
          },
          { status: 404 },
        );
      }

      const originalStatus = existingAttendance.status;

      await db
        .delete(attendances)
        .where(eq(attendances.id, existingAttendance.id));

      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        sessionId,
        actorCui,
        studentCui,
        originalStatus,
        newStatus: "ANULADO",
        reason,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: "Asistencia anulada y registrada en auditoría.",
      });
    }

    if (existingAttendance) {
      return NextResponse.json(
        {
          success: false,
          message: "La asistencia ya existe. Use UPDATE para modificarla.",
        },
        { status: 409 },
      );
    }

    // Crear asistencia manual (RF-14)
    const newAttendanceId = crypto.randomUUID();
    await db.insert(attendances).values({
      id: newAttendanceId,
      studentCui,
      sessionId,
      checkIn: new Date().toISOString(),
      status: newStatus as AttendanceStatus,
      checkOutType: "NORMAL",
      observation: `Añadido manualmente por el docente: ${reason}`,
    });

    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      sessionId,
      actorCui,
      studentCui,
      originalStatus: "INEXISTENTE",
      newStatus: newStatus as AttendanceStatus,
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
