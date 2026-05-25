import { and, eq, ne } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attendances, auditLogs, groupConfigs, sessions } from "@/db/schema";
import { UniversityService } from "@/lib/university-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mockTime = searchParams.get("mockTime");
    const teacherCode = searchParams.get("teacherCode");
    const requestedGroupId = searchParams.get("groupId");
    const requestedSessionId = searchParams.get("sessionId");
    const now = mockTime ? new Date(mockTime) : new Date();

    if (!teacherCode) {
      return NextResponse.json(
        { success: false, message: "teacherCode es requerido" },
        { status: 400 },
      );
    }

    // 1. Obtener todos los grupos del docente
    const teacherGroups =
      await UniversityService.getGroupsByTeacher(teacherCode);

    if (teacherGroups.length === 0) {
      return NextResponse.json({
        active: false,
        groups: [],
        message: "No se encontraron grupos para este docente.",
      });
    }

    // 2. Determinar el grupo seleccionado (por defecto: el actual o próximo)
    let selectedGroup = teacherGroups.find((g) => g.id === requestedGroupId);

    if (!selectedGroup) {
      // Buscar si hay alguno con sesión activa en este momento
      const currentDay = now.getDay();
      const mappedDay = currentDay === 0 ? 7 : currentDay;

      let matchedGroup = null;
      for (const group of teacherGroups) {
        const schedule = group.schedules.find((s) => s.dayOfWeek === mappedDay);
        if (schedule) {
          const { expectedStart, expectedEnd } =
            UniversityService.getDatesForSchedule(
              now,
              schedule.startTime,
              schedule.endTime,
            );

          const earliestStart = new Date(
            expectedStart.getTime() - 30 * 60 * 1000,
          );

          if (now >= earliestStart && now <= expectedEnd) {
            matchedGroup = group;
            break;
          }
        }
      }

      if (matchedGroup) {
        selectedGroup = matchedGroup;
      } else {
        // Buscar el más próximo
        const upcomingGroups = teacherGroups.map((g) => {
          let minDiff = Number.MAX_SAFE_INTEGER;
          for (const s of g.schedules) {
            let dayDiff = s.dayOfWeek - mappedDay;
            if (dayDiff < 0) dayDiff += 7;

            const [h, m] = s.startTime.split(":").map(Number);
            const target = new Date(now);
            target.setDate(now.getDate() + dayDiff);
            target.setHours(h, m, 0, 0);

            const diff = target.getTime() - now.getTime();
            if (diff > 0 && diff < minDiff) minDiff = diff;
          }
          return { group: g, diff: minDiff };
        });

        upcomingGroups.sort((a, b) => a.diff - b.diff);
        selectedGroup = upcomingGroups[0]?.group || teacherGroups[0];
      }
    }

    // 3. Obtener configuración del grupo
    const groupConfig = await db
      .select()
      .from(groupConfigs)
      .where(eq(groupConfigs.groupId, selectedGroup.id))
      .then((res) => res[0]);

    // 4. Obtener todas las sesiones del grupo seleccionado
    const groupSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.groupId, selectedGroup.id))
      .orderBy(sessions.date, sessions.expectedStart);

    // 5. Determinar la sesión seleccionada
    let activeSession = null;
    if (requestedSessionId) {
      activeSession =
        groupSessions.find((s) => s.id === requestedSessionId) || null;
    }

    if (!activeSession) {
      // Por defecto: la sesión ACTIVE o la más reciente hoy
      activeSession = groupSessions.find((s) => s.status === "ACTIVE") || null;

      if (!activeSession && groupSessions.length > 0) {
        // Si no hay activa, intentar la que coincide con el horario actual
        const dateString = now.toISOString().split("T")[0];
        activeSession =
          groupSessions.find((s) => s.date === dateString) ||
          groupSessions[groupSessions.length - 1];
      }
    }

    let attendancesWithNames = [];
    let sessionAuditLogs = [];

    if (activeSession) {
      const sessionAttendances = await db
        .select()
        .from(attendances)
        .where(eq(attendances.sessionId, activeSession.id));

      // Cruzar con UniversityService para obtener nombres
      attendancesWithNames = await Promise.all(
        sessionAttendances.map(async (att) => {
          const student = await UniversityService.getStudentByCui(
            att.studentCui,
          );
          return {
            ...att,
            name: student?.name || "Estudiante no encontrado",
          };
        }),
      );

      sessionAuditLogs = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.sessionId, activeSession.id));
    }

    return NextResponse.json({
      active: !!activeSession,
      session: activeSession,
      group: selectedGroup,
      groups: teacherGroups,
      config: groupConfig || {
        toleranceType: "STATIC",
        toleranceMinutes: "15",
      },
      sessions: groupSessions,
      attendances: attendancesWithNames,
      auditLogs: sessionAuditLogs,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: `Error al obtener datos del panel: ${error instanceof Error ? error.message : "Desconocido"}`,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { groupId, toleranceType, toleranceMinutes } = body;

    // Persistir configuración del grupo para futuras sesiones
    if (groupId && toleranceType && toleranceMinutes !== undefined) {
      await db
        .insert(groupConfigs)
        .values({
          groupId,
          toleranceType,
          toleranceMinutes: String(toleranceMinutes),
        })
        .onConflictDoUpdate({
          target: groupConfigs.groupId,
          set: { toleranceType, toleranceMinutes: String(toleranceMinutes) },
        });
    }

    // Buscar si ya existe una sesión activa para este grupo (excluyendo Hora Hueco)
    const activeSession = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.status, "ACTIVE"),
          eq(sessions.groupId, groupId),
          ne(sessions.groupId, "HORA_HUECO"),
        ),
      )
      .limit(1)
      .then((res) => res[0]);

    if (activeSession) {
      // Actualizar sesión activa existente
      // Re-calcular límite de tolerancia si cambia el tipo/minutos
      let toleranceLimit = activeSession.toleranceLimit;
      const tMinutes =
        toleranceMinutes !== undefined
          ? toleranceMinutes
          : Number.parseInt(activeSession.toleranceMinutes);
      const tType = toleranceType || activeSession.toleranceType;

      if (toleranceType || toleranceMinutes !== undefined) {
        if (tType === "STATIC") {
          toleranceLimit = new Date(
            new Date(activeSession.expectedStart).getTime() +
              tMinutes * 60 * 1000,
          ).toISOString();
        } else if (tType === "DYNAMIC" && activeSession.teacherCheckIn) {
          toleranceLimit = new Date(
            new Date(activeSession.teacherCheckIn).getTime() +
              tMinutes * 60 * 1000,
          ).toISOString();
        }
      }

      await db
        .update(sessions)
        .set({
          toleranceType: tType,
          toleranceMinutes: String(tMinutes),
          toleranceLimit: toleranceLimit,
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

    return NextResponse.json({
      success: true,
      message: "Configuración predeterminada del grupo actualizada.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: `Error al actualizar configuración: ${error instanceof Error ? error.message : "Desconocido"}`,
      },
      { status: 500 },
    );
  }
}

