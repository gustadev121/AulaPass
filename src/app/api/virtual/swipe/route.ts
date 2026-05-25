import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { attendances, sessions } from "@/db/schema";
import { AttendanceRulesEngine } from "@/lib/attendance-rules";
import { UniversityService } from "@/lib/university-service";
import { identifierSchema } from "@/lib/validations";

const virtualSwipeSchema = z.object({
  DniCui: identifierSchema,
  virtualCode: z.string().regex(/^\d{6}$/, "Código virtual inválido"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = virtualSwipeSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }

    const { DniCui, virtualCode } = parseResult.data;
    const now = new Date();

    // 1. Buscar sesión activa con ese código virtual
    const session = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.status, "ACTIVE"),
          eq(sessions.virtualCode, virtualCode),
        ),
      )
      .limit(1)
      .then((res) => res[0]);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Código virtual no válido o sesión expirada.",
        },
        { status: 400 },
      );
    }

    // 2. Verificar estudiante
    const student = await UniversityService.getStudentByCui(DniCui);
    if (!student) {
      return NextResponse.json(
        { success: false, message: "Estudiante no encontrado." },
        { status: 400 },
      );
    }

    // 3. Verificar si ya tiene marcación
    const existingAttendance = await db
      .select()
      .from(attendances)
      .where(
        and(
          eq(attendances.studentCui, student.cui),
          eq(attendances.sessionId, session.id),
        ),
      )
      .limit(1)
      .then((res) => res[0]);

    if (existingAttendance) {
      return NextResponse.json({
        success: true,
        message: "Asistencia ya registrada previamente para esta sesión.",
      });
    }

    // 4. Evaluar asistencia (usando modo virtual)
    const activeGroup = await UniversityService.getGroupById(session.groupId);
    const classroomSchedules = await UniversityService.getClassroomSchedule();
    const courseGroups = [];
    for (const item of classroomSchedules) {
      if (activeGroup && item.group.courseId === activeGroup.courseId) {
        courseGroups.push(item.group);
      }
    }

    const formattedSchedules = classroomSchedules.map((item) => {
      const year = now.getFullYear();
      const month = now.getMonth();
      const date = now.getDate();
      const [startH, startM] = item.schedule.startTime.split(":").map(Number);
      const [endH, endM] = item.schedule.endTime.split(":").map(Number);
      return {
        groupId: item.group.id,
        startTime: new Date(year, month, date, startH, startM),
        endTime: new Date(year, month, date, endH, endM),
      };
    });

    const result = AttendanceRulesEngine.evaluateStudentSwipe(
      {
        currentTime: now,
        student,
        activeSession: {
          ...session,
          expectedStart: new Date(session.expectedStart),
          expectedEnd: new Date(session.expectedEnd),
          teacherCheckIn: session.teacherCheckIn
            ? new Date(session.teacherCheckIn)
            : null,
          toleranceLimit: new Date(session.toleranceLimit || ""),
        },
        currentCourseGroups: courseGroups,
        classroomSchedules: formattedSchedules,
      },
      false,
    );

    if (!result.valid) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 },
      );
    }

    // Registrar asistencia
    await db.insert(attendances).values({
      id: crypto.randomUUID(),
      studentCui: student.cui,
      sessionId: session.id,
      checkIn: now.toISOString(),
      status: result.status,
      checkOutType: "NORMAL",
      observation: "Registro via Contingencia Virtual",
    });

    return NextResponse.json({
      success: true,
      message: `Asistencia virtual registrada como ${result.status}. ${result.message}`,
    });
  } catch (_error) {
    return NextResponse.json(
      { success: false, message: "Error interno" },
      { status: 500 },
    );
  }
}
