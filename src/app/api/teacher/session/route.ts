import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attendances, auditLogs, sessions } from "@/db/schema";
import { UniversityService } from "@/lib/university-service";

export async function GET(_request: NextRequest) {
  try {
    const activeSession = await db
      .select()
      .from(sessions)
      .where(eq(sessions.status, "ACTIVE"))
      .limit(1)
      .then((res) => res[0]);

    if (!activeSession) {
      return NextResponse.json({ active: false, session: null });
    }

    const group = await UniversityService.getGroupById(activeSession.groupId);
    const sessionAttendances = await db
      .select()
      .from(attendances)
      .where(eq(attendances.sessionId, activeSession.id));

    // Cruzar con UniversityService para obtener nombres (Join manual)
    const attendancesWithNames = await Promise.all(
      sessionAttendances.map(async (att) => {
        const student = await UniversityService.getStudentByCui(att.studentCui);
        return {
          ...att,
          name: student?.name || "Estudiante no encontrado",
        };
      }),
    );

    const sessionAuditLogs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.sessionId, activeSession.id));

    return NextResponse.json({
      active: true,
      session: activeSession,
      group,
      attendances: attendancesWithNames,
      auditLogs: sessionAuditLogs,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: `Error al obtener la sesión activa: ${error instanceof Error ? error.message : "Desconocido"}`,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { groupId, toleranceType, toleranceMinutes, virtualMode, date } =
      body;

    const now = date ? new Date(date) : new Date();
    const dateString = now.toISOString().split("T")[0];

    // Buscar si ya existe una sesión activa
    const activeSession = await db
      .select()
      .from(sessions)
      .where(eq(sessions.status, "ACTIVE"))
      .limit(1)
      .then((res) => res[0]);

    if (activeSession) {
      // Actualizar sesión activa existente
      let virtualCode = activeSession.virtualCode;
      if (virtualMode && !virtualCode) {
        // Generar código de contingencia virtual de 6 dígitos (RF-12)
        virtualCode = Math.floor(100000 + Math.random() * 900000).toString();
      }

      // Re-calcular límite de tolerancia si cambia el tipo/minutos
      let toleranceLimit = activeSession.toleranceLimit;
      if (toleranceType && toleranceMinutes !== undefined) {
        if (toleranceType === "STATIC") {
          toleranceLimit = new Date(
            new Date(activeSession.expectedStart).getTime() +
              toleranceMinutes * 60 * 1000,
          ).toISOString();
        } else if (
          toleranceType === "DYNAMIC" &&
          activeSession.teacherCheckIn
        ) {
          toleranceLimit = new Date(
            new Date(activeSession.teacherCheckIn).getTime() +
              toleranceMinutes * 60 * 1000,
          ).toISOString();
        }
      }

      await db
        .update(sessions)
        .set({
          toleranceType: toleranceType || activeSession.toleranceType,
          toleranceLimit: toleranceLimit,
          virtualCode: virtualCode,
        })
        .where(eq(sessions.id, activeSession.id));

      const updatedSession = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, activeSession.id))
        .then((res) => res[0]);

      return NextResponse.json({
        success: true,
        message: "Configuración de sesión actualizada con éxito.",
        session: updatedSession,
      });
    }

    // Si no hay sesión activa, crear una nueva manualmente (Panel Docente)
    const group = await UniversityService.getGroupById(groupId);
    if (!groupId || !group) {
      return NextResponse.json(
        {
          success: false,
          message: "El grupo académico especificado no es válido.",
        },
        { status: 400 },
      );
    }

    // Determinar la programación horaria oficial del grupo
    const currentDay = now.getDay();
    const mappedDay = currentDay === 0 ? 7 : currentDay;
    const todaySchedule = group.schedules.find(
      (s) => s.dayOfWeek === mappedDay,
    );

    let expectedStart = now;
    let expectedEnd = new Date(now.getTime() + 100 * 60 * 1000); // 100 minutos por defecto

    if (todaySchedule) {
      const year = now.getFullYear();
      const month = now.getMonth();
      const d = now.getDate();
      const [startH, startM] = todaySchedule.startTime.split(":").map(Number);
      const [endH, endM] = todaySchedule.endTime.split(":").map(Number);

      expectedStart = new Date(year, month, d, startH, startM, 0, 0);
      expectedEnd = new Date(year, month, d, endH, endM, 0, 0);
    }

    const tMinutes = toleranceMinutes !== undefined ? toleranceMinutes : 15;
    const tType = toleranceType || "STATIC";
    let toleranceLimit = new Date(
      expectedStart.getTime() + tMinutes * 60 * 1000,
    ).toISOString();

    // Si el docente la inicia manualmente ahora, su ingreso se registra en este momento
    const teacherCheckIn = now.toISOString();
    if (tType === "DYNAMIC") {
      toleranceLimit = new Date(
        now.getTime() + tMinutes * 60 * 1000,
      ).toISOString();
    }

    const virtualCode = virtualMode
      ? Math.floor(100000 + Math.random() * 900000).toString()
      : null;

    const newSession = {
      id: crypto.randomUUID(),
      groupId: group.id,
      date: dateString,
      expectedStart: expectedStart.toISOString(),
      expectedEnd: expectedEnd.toISOString(),
      teacherCheckIn,
      status: "ACTIVE" as const,
      toleranceType: tType,
      toleranceLimit,
      virtualCode,
    };

    await db.insert(sessions).values(newSession);

    return NextResponse.json({
      success: true,
      message: "Sesión de clase iniciada manualmente con éxito.",
      session: newSession,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: `Error al iniciar/actualizar sesión: ${error instanceof Error ? error.message : "Desconocido"}`,
      },
      { status: 500 },
    );
  }
}
