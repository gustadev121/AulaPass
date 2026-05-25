import { and, eq, isNull, ne } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { attendances, groupConfigs, sessions } from "@/db/schema";
import { AttendanceRulesEngine } from "@/lib/attendance-rules";
import { SessionService } from "@/lib/session-service";
import {
  type ExternalGroup,
  UniversityService,
} from "@/lib/university-service";
import { identifierSchema } from "@/lib/validations";

// Esquema de validación del CUI/DNI (RF-01, RF-03)
const swipeSchema = z.object({
  DniCui: identifierSchema,
  mockTime: z.string().optional(), // Inyección de tiempo para simulación/pruebas
});

const DUPLICATE_WINDOW_MS = 50;
const recentStudentSwipes = new Map<string, number>();

interface Session {
  id: string;
  groupId: string;
  date: string;
  expectedStart: string;
  expectedEnd: string;
  teacherCheckIn: string | null;
  status: "ACTIVE" | "CLOSED" | "SUSPENDED";
  toleranceType: "STATIC" | "DYNAMIC";
  toleranceMinutes: string;
  toleranceLimit: string | null;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now(); // Para control de tiempo de respuesta (RNF-02)

  try {
    const body = await request.json();
    const parseResult = swipeSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          color: "RED",
          message: parseResult.error.message,
        },
        { status: 400 },
      );
    }

    const { DniCui, mockTime } = parseResult.data;
    const now = mockTime ? new Date(mockTime) : new Date();
    const currentDay = now.getDay();
    const mappedDay = currentDay === 0 ? 7 : currentDay; // JS 0 = Domingo a 7

    const dateString = now.toISOString().split("T")[0]; // YYYY-MM-DD

    // 1. Verificar si es Docente (RF-06) usando CUI
    const teacher = await UniversityService.getTeacherByCui(DniCui);
    if (teacher) {
      // Buscar si el docente tiene una clase programada en el aula en este bloque
      const classroomSchedules = await UniversityService.getClassroomSchedule();
      let matchedGroup = null;
      let matchedSchedule = null;

      for (const item of classroomSchedules) {
        const group = item.group;
        if (
          group.teacherCode === teacher.code &&
          item.schedule.dayOfWeek === mappedDay
        ) {
          const { expectedStart, expectedEnd } =
            UniversityService.getDatesForSchedule(
              now,
              item.schedule.startTime,
              item.schedule.endTime,
            );
          const earliestStart = new Date(
            expectedStart.getTime() - 30 * 60 * 1000,
          );

          if (now >= earliestStart && now <= expectedEnd) {
            matchedGroup = group;
            matchedSchedule = item.schedule;
            break;
          }
        }
      }

      if (!matchedGroup || !matchedSchedule) {
        return NextResponse.json(
          {
            success: false,
            color: "RED",
            message:
              "No tiene sesiones de clase programadas para este horario.",
          },
          { status: 400 },
        );
      }

      // Buscar si ya existe la sesión en BD local
      const session = await db
        .select()
        .from(sessions)
        .where(
          and(
            eq(sessions.groupId, matchedGroup.id),
            eq(sessions.date, dateString),
          ),
        )
        .limit(1)
        .then((res) => res[0]);

      if (session) {
        if (session.status === "SUSPENDED") {
          return NextResponse.json(
            {
              success: false,
              color: "RED",
              message:
                "La sesión ha sido suspendida por inasistencia docente. No es posible registrar asistencia ahora.",
            },
            { status: 400 },
          );
        }

        if (session.teacherCheckIn) {
          return NextResponse.json({
            success: true,
            color: "BLUE",
            role: "TEACHER",
            name: teacher.name,
            code: teacher.code,
            cui: teacher.cui,
            message: `Bienvenido docente ${teacher.name}. Asistencia ya registrada previamente.`,
          });
        }

        // Actualizar sesión que fue iniciada de forma automática por un alumno (RF-05)
        const updatedTeacherCheckIn = now.toISOString();
        let toleranceLimit = session.toleranceLimit;
        let toleranceType = session.toleranceType;
        const toleranceMinutes = Number.parseInt(session.toleranceMinutes, 10);

        // [MEJORA] Si el docente llega tarde y la sesión era estática, cambiamos a dinámica
        // para no perjudicar a los alumnos que vienen con él.
        const expectedStart = new Date(session.expectedStart);
        const isLateTeacher =
          now.getTime() >
          expectedStart.getTime() + toleranceMinutes * 60 * 1000;

        if (isLateTeacher && toleranceType === "STATIC") {
          toleranceType = "DYNAMIC";
        }

        // Si es dinámica, re-calculamos el límite a partir de la llegada del docente (RF-07)
        if (toleranceType === "DYNAMIC") {
          toleranceLimit = new Date(
            now.getTime() + toleranceMinutes * 60 * 1000,
          ).toISOString();
        }

        await db
          .update(sessions)
          .set({
            teacherCheckIn: updatedTeacherCheckIn,
            toleranceType: toleranceType,
            toleranceLimit: toleranceLimit,
          })
          .where(eq(sessions.id, session.id));
      } else {
        // Crear nueva sesión iniciada por el docente
        const { expectedStart, expectedEnd } =
          UniversityService.getDatesForSchedule(
            now,
            matchedSchedule.startTime,
            matchedSchedule.endTime,
          );

        // Buscar configuración persistida del grupo
        const groupConfig = await db
          .select()
          .from(groupConfigs)
          .where(eq(groupConfigs.groupId, matchedGroup.id))
          .then((res) => res[0]);

        const toleranceMinutes = groupConfig
          ? Number.parseInt(groupConfig.toleranceMinutes, 10)
          : 15;
        const baseToleranceType = groupConfig
          ? groupConfig.toleranceType
          : "STATIC";

        // [MEJORA] Si el docente llega tarde, iniciamos con tolerancia dinámica
        const isLateTeacher =
          now.getTime() >
          expectedStart.getTime() + toleranceMinutes * 60 * 1000;
        const tType = isLateTeacher ? "DYNAMIC" : baseToleranceType;
        const tLimit = new Date(
          (tType === "DYNAMIC" ? now : expectedStart).getTime() +
            toleranceMinutes * 60 * 1000,
        ).toISOString();

        await db.insert(sessions).values({
          id: crypto.randomUUID(),
          groupId: matchedGroup.id,
          date: dateString,
          expectedStart: expectedStart.toISOString(),
          expectedEnd: expectedEnd.toISOString(),
          teacherCheckIn: now.toISOString(),
          status: "ACTIVE",
          toleranceType: tType,
          toleranceMinutes: String(toleranceMinutes),
          toleranceLimit: tLimit,
        });
      }

      return NextResponse.json({
        success: true,
        color: "BLUE",
        role: "TEACHER",
        name: teacher.name,
        code: teacher.code,
        cui: teacher.cui,
        message: `Asistencia del docente ${teacher.name} registrada con éxito. Clase iniciada.`,
      });
    }
    // 2. Verificar si es Estudiante (RF-04)
    const student = await UniversityService.getStudentByCui(DniCui);
    if (student) {
      const lastSwipeAt = recentStudentSwipes.get(student.cui);
      if (lastSwipeAt !== undefined) {
        const deltaMs = now.getTime() - lastSwipeAt;
        if (deltaMs >= 0 && deltaMs <= DUPLICATE_WINDOW_MS) {
          return NextResponse.json(
            {
              success: false,
              color: "RED",
              message:
                "Marcación duplicada detectada. Espere unos segundos e intente nuevamente.",
            },
            { status: 429 },
          );
        }
      }

      recentStudentSwipes.set(student.cui, now.getTime());

      // Buscar si existe una sesión de clase activa en la base de datos local (excluyendo Hora Hueco)
      let activeSession: Session | undefined = (await db
        .select()
        .from(sessions)
        .where(
          and(
            eq(sessions.status, "ACTIVE"),
            ne(sessions.groupId, "HORA_HUECO"),
          ),
        )
        .limit(1)
        .then((res) => res[0])) as Session | undefined;

      if (
        activeSession &&
        now.getTime() > new Date(activeSession.expectedEnd).getTime()
      ) {
        // [RF-13, RF-10] Cierre automático forzado en el siguiente swipe si la sesión expiró
        await SessionService.closeSession(
          activeSession.id,
          "Cierre Automático por Expiración",
        );
        activeSession = undefined;
      }

      if (activeSession) {
        // Obtener el grupo activo y todos los grupos del curso para tolerancia de grupo intergrupo (RF-04)
        const activeGroup = await UniversityService.getGroupById(
          activeSession.groupId,
        );
        if (!activeGroup) {
          return NextResponse.json(
            {
              success: false,
              color: "RED",
              message: "Error al recuperar datos del grupo académico activo.",
            },
            { status: 500 },
          );
        }

        // Obtener todos los horarios y grupos programados para el curso
        const classroomSchedules =
          await UniversityService.getClassroomSchedule();
        const courseGroups = [];
        for (const item of classroomSchedules) {
          if (item.group.courseId === activeGroup.courseId) {
            courseGroups.push(item.group);
          }
        }

        // Verificar si ya tiene marcación en esta sesión
        const existingAttendance = await db
          .select()
          .from(attendances)
          .where(
            and(
              eq(attendances.studentCui, student.cui),
              eq(attendances.sessionId, activeSession.id),
            ),
          )
          .limit(1)
          .then((res) => res[0]);

        if (existingAttendance) {
          // Alternancia Entrada/Salida (RF-09)
          if (existingAttendance.checkOut) {
            // Si ya tiene salida, actualizamos el checkout al más reciente (robusto)
            await db
              .update(attendances)
              .set({ checkOut: now.toISOString() })
              .where(eq(attendances.id, existingAttendance.id));

            return NextResponse.json({
              success: true,
              color: "BLUE",
              role: "STUDENT",
              name: student.name,
              swipeType: "SALIDA",
              status: "AMBIENTE_ESTUDIO",
              message: `Salida de ${student.name} actualizada con éxito.`,
            });
          }

          // Registrar salida
          await db
            .update(attendances)
            .set({ checkOut: now.toISOString() })
            .where(eq(attendances.id, existingAttendance.id));

          return NextResponse.json({
            success: true,
            color: "BLUE",
            role: "STUDENT",
            name: student.name,
            swipeType: "SALIDA",
            status: "AMBIENTE_ESTUDIO",
            message: `Hasta luego ${student.name}. Salida registrada con éxito.`,
          });
        }

        // Es una Entrada, evaluar reglas de asistencia
        // Formatear los horarios para el motor de reglas
        const formattedSchedules = classroomSchedules.map((item) => {
          const { expectedStart, expectedEnd } =
            UniversityService.getDatesForSchedule(
              now,
              item.schedule.startTime,
              item.schedule.endTime,
            );
          return {
            groupId: item.group.id,
            startTime: expectedStart,
            endTime: expectedEnd,
          };
        });

        const activeSessionMapped = {
          id: activeSession.id,
          groupId: activeSession.groupId,
          expectedStart: new Date(activeSession.expectedStart),
          expectedEnd: new Date(activeSession.expectedEnd),
          teacherCheckIn: activeSession.teacherCheckIn
            ? new Date(activeSession.teacherCheckIn)
            : null,
          status: activeSession.status,
          toleranceType: activeSession.toleranceType,
          toleranceLimit: new Date(activeSession.toleranceLimit || ""),
        };

        const result = AttendanceRulesEngine.evaluateStudentSwipe(
          {
            currentTime: now,
            student,
            activeSession: activeSessionMapped,
            currentCourseGroups: courseGroups,
            classroomSchedules: formattedSchedules,
          },
          false,
        );

        if (!result.valid) {
          return NextResponse.json(
            {
              success: false,
              color: "RED",
              message: result.message,
            },
            { status: 400 },
          );
        }

        // Registrar asistencia en DB
        await db.insert(attendances).values({
          id: crypto.randomUUID(),
          studentCui: student.cui,
          sessionId: activeSession.id,
          checkIn: now.toISOString(),
          status: result.status,
          checkOutType: "NORMAL",
        });

        // Limpiar faltas previas de la semana para este curso (RF-Flexible)
        await SessionService.cleanupPreviousAbsences(
          student.cui,
          activeSession.groupId,
          dateString,
          activeSession.id,
        );

        // Mapear estado al color visual (RF-15)
        let color: "GREEN" | "AMBER" | "RED" | "BLUE" = "GREEN";
        if (result.status === "TARDANZA") color = "AMBER";
        else if (result.status === "FALTA") color = "RED";
        else if (result.status === "AMBIENTE_ESTUDIO") color = "BLUE";

        return NextResponse.json({
          success: true,
          color,
          role: "STUDENT",
          name: student.name,
          swipeType: "ENTRADA",
          status: result.status,
          message: `Ingreso registrado. Estado: ${result.status}. ${result.message}`,
        });
      }

      // Si no hay sesión activa: buscar si existe clase programada para iniciar sesión de emergencia (RF-05)
      const classroomSchedules = await UniversityService.getClassroomSchedule();
      let matchedSchedule = null;
      let matchedGroup = null;

      for (const item of classroomSchedules) {
        if (item.schedule.dayOfWeek === mappedDay) {
          const { expectedStart, expectedEnd } =
            UniversityService.getDatesForSchedule(
              now,
              item.schedule.startTime,
              item.schedule.endTime,
            );
          const earliestStart = new Date(
            expectedStart.getTime() - 30 * 60 * 1000,
          );

          if (now >= earliestStart && now <= expectedEnd) {
            // Verificar si el estudiante está matriculado en esta asignatura
            const group = item.group;

            // Obtener todos los grupos de la misma asignatura
            const courseGroups: ExternalGroup[] = [];
            for (const scheduleItem of classroomSchedules) {
              if (scheduleItem.group.courseId === group.courseId) {
                courseGroups.push(scheduleItem.group);
              }
            }

            const isEnrolled = student.enrolledGroupIds.some((sgid) =>
              courseGroups.some((cg) => cg.id === sgid),
            );

            if (isEnrolled) {
              matchedSchedule = item.schedule;
              matchedGroup = group;
              break;
            }
          }
        }
      }

      if (matchedSchedule && matchedGroup) {
        // [RF-05] Autogenerar sesión de emergencia
        const { expectedStart, expectedEnd } =
          UniversityService.getDatesForSchedule(
            now,
            matchedSchedule.startTime,
            matchedSchedule.endTime,
          );

        // Buscar configuración persistida del grupo
        const groupConfig = await db
          .select()
          .from(groupConfigs)
          .where(eq(groupConfigs.groupId, matchedGroup.id))
          .then((res) => res[0]);

        const toleranceMinutes = groupConfig
          ? Number.parseInt(groupConfig.toleranceMinutes, 10)
          : 15;
        const toleranceType = groupConfig
          ? groupConfig.toleranceType
          : "STATIC";

        const toleranceLimit = new Date(
          expectedStart.getTime() + toleranceMinutes * 60 * 1000,
        ).toISOString();

        const newSessionId = crypto.randomUUID();
        await db.insert(sessions).values({
          id: newSessionId,
          groupId: matchedGroup.id,
          date: dateString,
          expectedStart: expectedStart.toISOString(),
          expectedEnd: expectedEnd.toISOString(),
          teacherCheckIn: null, // El docente no ha llegado
          status: "ACTIVE",
          toleranceType: toleranceType,
          toleranceMinutes: String(toleranceMinutes),
          toleranceLimit: toleranceLimit,
        });

        // Registrar asistencia del estudiante
        await db.insert(attendances).values({
          id: crypto.randomUUID(),
          studentCui: student.cui,
          sessionId: newSessionId,
          checkIn: now.toISOString(),
          status: "PUNTUAL", // Al autogenerar la sesión de emergencia, el primer alumno es PUNTUAL
          checkOutType: "NORMAL",
        });

        // Limpiar faltas previas de la semana para este curso (RF-Flexible)
        await SessionService.cleanupPreviousAbsences(
          student.cui,
          matchedGroup.id,
          dateString,
          newSessionId,
        );

        return NextResponse.json({
          success: true,
          color: "GREEN",
          role: "STUDENT",
          name: student.name,
          swipeType: "ENTRADA",
          status: "PUNTUAL",
          message: `Sesión de emergencia iniciada automáticamente. Asistencia de ${student.name} registrada como PUNTUAL.`,
        });
      }

      // [RF-11] Hora Hueco: No hay clases programadas en este momento
      // Crear o buscar sesión de Hora Hueco
      let huecoSession: Session | undefined = (await db
        .select()
        .from(sessions)
        .where(
          and(
            eq(sessions.groupId, "HORA_HUECO"),
            eq(sessions.date, dateString),
            eq(sessions.status, "ACTIVE"),
          ),
        )
        .limit(1)
        .then((res) => res[0])) as Session | undefined;

      if (!huecoSession) {
        const huecoId = crypto.randomUUID();
        const expectedEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000); // Bloque de 2 horas por defecto
        await db.insert(sessions).values({
          id: huecoId,
          groupId: "HORA_HUECO",
          date: dateString,
          expectedStart: now.toISOString(),
          expectedEnd: expectedEnd.toISOString(),
          teacherCheckIn: null,
          status: "ACTIVE",
          toleranceType: "STATIC",
          toleranceMinutes: "0",
          toleranceLimit: now.toISOString(),
        });

        huecoSession = {
          id: huecoId,
          groupId: "HORA_HUECO",
          date: dateString,
          expectedStart: now.toISOString(),
          expectedEnd: expectedEnd.toISOString(),
          teacherCheckIn: null,
          status: "ACTIVE",
          toleranceType: "STATIC",
          toleranceMinutes: "0",
          toleranceLimit: now.toISOString(),
        };
      }

      // Verificar si ya tiene marcación activa (sin salida) en la sesión de hora hueco
      const existingHuecoAttendance = await db
        .select()
        .from(attendances)
        .where(
          and(
            eq(attendances.studentCui, student.cui),
            eq(attendances.sessionId, huecoSession.id),
            isNull(attendances.checkOut),
          ),
        )
        .limit(1)
        .then((res) => res[0]);

      if (existingHuecoAttendance) {
        // Trazar salida
        await db
          .update(attendances)
          .set({ checkOut: now.toISOString() })
          .where(eq(attendances.id, existingHuecoAttendance.id));

        return NextResponse.json({
          success: true,
          color: "BLUE",
          role: "STUDENT",
          name: student.name,
          swipeType: "SALIDA",
          status: "AMBIENTE_ESTUDIO",
          message: `Salida de ambiente de estudio registrada para ${student.name}.`,
        });
      }

      // Registrar ingreso de Hora Hueco
      await db.insert(attendances).values({
        id: crypto.randomUUID(),
        studentCui: student.cui,
        sessionId: huecoSession.id,
        checkIn: now.toISOString(),
        status: "AMBIENTE_ESTUDIO",
        checkOutType: "NORMAL",
      });

      return NextResponse.json({
        success: true,
        color: "BLUE",
        role: "STUDENT",
        name: student.name,
        swipeType: "ENTRADA",
        status: "AMBIENTE_ESTUDIO",
        message: `Ingreso registrado para Ambiente de Estudio (Hora Hueco) de ${student.name}.`,
      });
    }

    // 3. Usuario no encontrado
    return NextResponse.json(
      {
        success: false,
        color: "RED",
        message: "Identificador no registrado en el sistema universitario.",
      },
      { status: 400 },
    );
  } catch (error) {
    console.error(error);
    // RNF-01: Robustez ante fallos
    return NextResponse.json(
      {
        success: false,
        color: "RED",
        message: `Error interno de procesamiento: ${error instanceof Error ? error.message : "Desconocido"}`,
      },
      { status: 500 },
    );
  } finally {
    const duration = Date.now() - startTime;
    // RNF-02: Garantía de velocidad
    if (duration > 150) {
      console.warn(
        `[WARNING] Kiosk swipe processing took too long: ${duration}ms`,
      );
    }
  }
}
