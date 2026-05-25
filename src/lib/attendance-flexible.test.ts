import { and, eq } from "drizzle-orm";
import { testApiHandler } from "next-test-api-route-handler";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { attendances, sessions } from "@/db/schema";
import * as swipeRoute from "../app/api/kiosk/swipe/route";
import * as closeSessionRoute from "../app/api/teacher/session/close/route";

describe("Flexibilidad de Asistencia por Curso (RF-Flexible)", () => {
  beforeEach(async () => {
    await db.delete(attendances);
    await db.delete(sessions);
  });

  it("debe eliminar faltas previas de la misma semana si el alumno asiste a otra sesión del mismo curso", async () => {
    // 1. Configurar dos sesiones del mismo curso (INF-301) en la misma semana
    // Sesión 1: Lunes
    const session1Id = "session-lunes";
    await db.insert(sessions).values({
      id: session1Id,
      groupId: "SW-II-A", // Curso INF-301
      date: "2026-05-25",
      expectedStart: "2026-05-25T07:00:00.000Z",
      expectedEnd: "2026-05-25T08:40:00.000Z",
      status: "ACTIVE",
      toleranceType: "STATIC",
      toleranceLimit: "2026-05-25T07:15:00.000Z",
    });

    // Sesión 2: Miércoles
    const session2Id = "session-miercoles";
    await db.insert(sessions).values({
      id: session2Id,
      groupId: "SW-II-A", // Juan está enrolado aquí
      date: "2026-05-27",
      expectedStart: "2026-05-27T07:00:00.000Z",
      expectedEnd: "2026-05-27T08:40:00.000Z",
      status: "ACTIVE",
      toleranceType: "STATIC",
      toleranceLimit: "2026-05-27T07:15:00.000Z",
    });

    // 2. Cerrar sesión del Lunes. El alumno Juan Pérez (20201234) no asistió.
    await testApiHandler({
      appHandler: closeSessionRoute,
      async test({ fetch }) {
        await fetch({
          method: "POST",
          body: JSON.stringify({ sessionId: session1Id }),
        });
      },
    });

    const faltaLunes = await db
      .select()
      .from(attendances)
      .where(and(eq(attendances.studentCui, "20201234"), eq(attendances.sessionId, session1Id)))
      .limit(1)
      .then(res => res[0]);
    
    expect(faltaLunes).toBeDefined();
    expect(faltaLunes.status).toBe("FALTA");

    // 3. El alumno asiste a la sesión del Miércoles
    await testApiHandler({
      appHandler: swipeRoute,
      async test({ fetch }) {
        const res = await fetch({
          method: "POST",
          body: JSON.stringify({
            DniCui: "20201234",
            mockTime: "2026-05-27T07:05:00.000Z",
          }),
        });
        expect(res.status).toBe(200);
      },
    });

    // 4. VERIFICACIÓN: La falta del Lunes debe haber sido eliminada
    const faltaLunesDespues = await db
      .select()
      .from(attendances)
      .where(and(eq(attendances.studentCui, "20201234"), eq(attendances.sessionId, session1Id)))
      .limit(1)
      .then(res => res[0]);

    expect(faltaLunesDespues).toBeUndefined();
  });

  it("no debe marcar FALTA al cerrar si el alumno ya asistió a otra sesión del curso en la misma semana", async () => {
    // 1. Sesión 1: Lunes. El alumno Juan Pérez (20201234) ASISTE.
    const session1Id = "session-lunes-2";
    await db.insert(sessions).values({
      id: session1Id,
      groupId: "SW-II-A",
      date: "2026-05-25",
      expectedStart: "2026-05-25T07:00:00.000Z",
      expectedEnd: "2026-05-25T08:40:00.000Z",
      status: "ACTIVE",
      toleranceType: "STATIC",
      toleranceLimit: "2026-05-25T07:15:00.000Z",
    });

    await testApiHandler({
      appHandler: swipeRoute,
      async test({ fetch }) {
        await fetch({
          method: "POST",
          body: JSON.stringify({
            DniCui: "20201234",
            mockTime: "2026-05-25T07:05:00.000Z",
          }),
        });
      },
    });

    // 2. Sesión 2: Miércoles. El alumno NO asiste.
    const session2Id = "session-miercoles-2";
    await db.insert(sessions).values({
      id: session2Id,
      groupId: "SW-II-A",
      date: "2026-05-27",
      expectedStart: "2026-05-27T07:00:00.000Z",
      expectedEnd: "2026-05-27T08:40:00.000Z",
      status: "ACTIVE",
      toleranceType: "STATIC",
      toleranceLimit: "2026-05-27T07:15:00.000Z",
    });

    // 3. Cerrar sesión del Miércoles.
    await testApiHandler({
      appHandler: closeSessionRoute,
      async test({ fetch }) {
        await fetch({
          method: "POST",
          body: JSON.stringify({ sessionId: session2Id }),
        });
      },
    });

    // 4. VERIFICACIÓN: El alumno NO debe tener una falta para la sesión del Miércoles
    const faltaMiercoles = await db
      .select()
      .from(attendances)
      .where(and(eq(attendances.studentCui, "20201234"), eq(attendances.sessionId, session2Id)))
      .limit(1)
      .then(res => res[0]);

    expect(faltaMiercoles).toBeUndefined();
  });

  it("debe marcar FALTA para cada sesión si el alumno no asistió a NINGUNA sesión del curso en la semana", async () => {
    // 1. Sesión 1: Lunes. El alumno NO asiste.
    const session1Id = "session-lunes-3";
    await db.insert(sessions).values({
      id: session1Id,
      groupId: "SW-II-A",
      date: "2026-05-25",
      expectedStart: "2026-05-25T07:00:00.000Z",
      expectedEnd: "2026-05-25T08:40:00.000Z",
      status: "ACTIVE",
      toleranceType: "STATIC",
      toleranceLimit: "2026-05-25T07:15:00.000Z",
    });

    // 2. Sesión 2: Miércoles. El alumno NO asiste.
    const session2Id = "session-miercoles-3";
    await db.insert(sessions).values({
      id: session2Id,
      groupId: "SW-II-A",
      date: "2026-05-27",
      expectedStart: "2026-05-27T07:00:00.000Z",
      expectedEnd: "2026-05-27T08:40:00.000Z",
      status: "ACTIVE",
      toleranceType: "STATIC",
      toleranceLimit: "2026-05-27T07:15:00.000Z",
    });

    // 3. Cerrar sesión del Lunes.
    await testApiHandler({
      appHandler: closeSessionRoute,
      async test({ fetch }) {
        await fetch({
          method: "POST",
          body: JSON.stringify({ sessionId: session1Id }),
        });
      },
    });

    // 4. Cerrar sesión del Miércoles.
    await testApiHandler({
      appHandler: closeSessionRoute,
      async test({ fetch }) {
        await fetch({
          method: "POST",
          body: JSON.stringify({ sessionId: session2Id }),
        });
      },
    });

    // 5. VERIFICACIÓN: El alumno debe tener una falta para CADA sesión
    const faltas = await db
      .select()
      .from(attendances)
      .where(and(eq(attendances.studentCui, "20201234"), eq(attendances.status, "FALTA")));

    expect(faltas.length).toBe(2);
    const sessionIds = faltas.map(f => f.sessionId);
    expect(sessionIds).toContain(session1Id);
    expect(sessionIds).toContain(session2Id);
  });
});
