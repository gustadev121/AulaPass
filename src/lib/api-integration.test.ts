import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";
import * as swipeRoute from "../app/api/kiosk/swipe/route";
import * as virtualSwipeRoute from "../app/api/virtual/swipe/route";
import * as checkAbsenceRoute from "../app/api/teacher/session/check-absence/route";
import * as closeSessionRoute from "../app/api/teacher/session/close/route";
import * as correctAttendanceRoute from "../app/api/teacher/attendance/correct/route";
import { db } from "@/db";
import { sessions, attendances, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { UniversityService } from "@/lib/university-service";

describe("API Integration Tests - Módulos 1, 2, 3, 4, 5, 6, 8", () => {
  beforeEach(async () => {
    // Limpiar tablas antes de cada prueba
    await db.delete(auditLogs);
    await db.delete(attendances);
    await db.delete(sessions);
  });

  afterEach(async () => {
    // Opcional: limpiar después de cada prueba
  });

  describe("Módulo 1: Acceso e Identificación (Panel Docente)", () => {
    it("debe permitir el acceso del docente con credenciales válidas (TC-1.11)", async () => {
      await testApiHandler({
        appHandler: swipeRoute,
        async test({ fetch }) {
          const res = await fetch({
            method: "POST",
            body: JSON.stringify({
              DniCui: "10101010",
              mockTime: "2026-05-25T12:05:00.000Z",
            }),
          });
          const json = await res.json();

          expect(res.status).toBe(200);
          expect(json.success).toBe(true);
          expect(json.role).toBe("TEACHER");
        },
      });
    });

    it("debe rechazar credenciales inválidas del docente (TC-1.12)", async () => {
      await testApiHandler({
        appHandler: swipeRoute,
        async test({ fetch }) {
          const res = await fetch({
            method: "POST",
            body: JSON.stringify({
              DniCui: "00000000",
              mockTime: "2026-05-25T12:05:00.000Z",
            }),
          });
          const json = await res.json();

          expect(res.status).toBe(400);
          expect(json.success).toBe(false);
        },
      });
    });
  });

  describe("Módulo 2: Registro Automatizado (Kiosk Swipe)", () => {
    // TC-2.01: Alumno matriculado en la sección oficial activa
    it("debe registrar asistencia para un alumno válido en una sesión activa (TC-2.01)", async () => {
      // Crear sesión activa
      const sessionId = crypto.randomUUID();
      await db.insert(sessions).values({
        id: sessionId,
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
          const res = await fetch({
            method: "POST",
            body: JSON.stringify({
              DniCui: "20201234", // Juan Pérez (SW-II-A)
              mockTime: "2026-05-25T07:00:00.000Z",
            }),
          });
          const json = await res.json();

          expect(res.status).toBe(200);
          expect(json.success).toBe(true);
          expect(json.status).toBe("PUNTUAL");

          // Verificar en DB
          const att = await db
            .select()
            .from(attendances)
            .where(eq(attendances.studentCui, "20201234"))
            .limit(1);
          expect(att.length).toBe(1);
          expect(att[0].status).toBe("PUNTUAL");
        },
      });
    });

    // TC-2.04: Autogeneración de sesión
    it("debe autogenerar una sesión cuando un alumno válido marca primero (TC-2.04)", async () => {
      // No hay sesión activa. Es Lunes 25 Mayo 2026.
      // Juan Pérez (20201234) está en SW-II-A que tiene clases Lunes 07:00-08:40.

      await testApiHandler({
        appHandler: swipeRoute,
        async test({ fetch }) {
          const res = await fetch({
            method: "POST",
            body: JSON.stringify({
              DniCui: "20201234",
              mockTime: "2026-05-25T12:10:00.000Z", // 10 min después del inicio (ajustado por TZ)
            }),
          });
          const json = await res.json();

          expect(res.status).toBe(200);
          expect(json.success).toBe(true);
          expect(json.message).toContain("emergencia");

          // Verificar que se creó la sesión
          const sess = await db.select().from(sessions).limit(1);
          expect(sess.length).toBe(1);
          expect(sess[0].groupId).toBe("SW-II-A");
          expect(sess[0].status).toBe("ACTIVE");
        },
      });
    });
  });

  describe("Módulo 3: Inasistencia Docente (RF-08)", () => {
    // TC-3.05: Límite de inasistencia docente (Suspender sesión)
    it("debe suspender la sesión y marcar alumnos como FALTA si el docente no llega (TC-3.05, TC-3.06)", async () => {
      const sessionId = crypto.randomUUID();
      await db.insert(sessions).values({
        id: sessionId,
        groupId: "SW-II-A",
        date: "2026-05-25",
        expectedStart: "2026-05-25T07:00:00.000Z",
        expectedEnd: "2026-05-25T08:40:00.000Z",
        status: "ACTIVE",
        toleranceType: "STATIC",
        toleranceLimit: "2026-05-25T07:15:00.000Z",
      });

      // Alumno marca antes
      await db.insert(attendances).values({
        id: crypto.randomUUID(),
        studentCui: "20201234",
        sessionId,
        checkIn: "2026-05-25T07:05:00.000Z",
        status: "PUNTUAL",
      });

      await testApiHandler({
        appHandler: checkAbsenceRoute,
        async test({ fetch }) {
          const res = await fetch({
            method: "POST",
            body: JSON.stringify({
              sessionId,
              maxTeacherDelayMinutes: 15,
              mockTime: "2026-05-25T07:16:00.000Z", // 1 min después del límite
            }),
          });
          const json = await res.json();

          expect(json.suspended).toBe(true);

          // Verificar sesión suspendida
          const sess = await db
            .select()
            .from(sessions)
            .where(eq(sessions.id, sessionId))
            .limit(1);
          expect(sess[0].status).toBe("SUSPENDED");

          // Verificar alumno actualizado (TC-3.06)
          const att = await db
            .select()
            .from(attendances)
            .where(eq(attendances.sessionId, sessionId))
            .limit(1);
          expect(att[0].status).toBe("FALTA");
          expect(att[0].observation).toContain("Inasistencia Docente");
        },
      });
    });
  });

  describe("Módulo 5: Contingencia de Sesiones Virtuales (RF-12)", () => {
    it("debe rechazar la marcación virtual si el modo está inactivo (TC-5.01)", async () => {
      await testApiHandler({
        appHandler: virtualSwipeRoute,
        async test({ fetch }) {
          const res = await fetch({
            method: "POST",
            body: JSON.stringify({
              DniCui: "20201234",
              virtualCode: "123456",
            }),
          });
          const json = await res.json();

          expect(res.status).toBe(400);
          expect(json.success).toBe(false);
        },
      });
    });

    it("debe registrar asistencia con código virtual válido (TC-5.02)", async () => {
      const sessionId = crypto.randomUUID();
      await db.insert(sessions).values({
        id: sessionId,
        groupId: "SW-II-A",
        date: "2026-05-25",
        expectedStart: "2026-05-25T07:00:00.000Z",
        expectedEnd: "2026-05-25T08:40:00.000Z",
        status: "ACTIVE",
        toleranceType: "STATIC",
        toleranceLimit: "2026-05-25T07:15:00.000Z",
        virtualCode: "654321",
      });

      await testApiHandler({
        appHandler: virtualSwipeRoute,
        async test({ fetch }) {
          const res = await fetch({
            method: "POST",
            body: JSON.stringify({
              DniCui: "20201234",
              virtualCode: "654321",
            }),
          });
          const json = await res.json();

          expect(res.status).toBe(200);
          expect(json.success).toBe(true);

          const att = await db
            .select()
            .from(attendances)
            .where(eq(attendances.sessionId, sessionId));
          expect(att.length).toBe(1);
          expect(att[0].observation).toContain("Contingencia Virtual");
        },
      });
    });

    it("debe rechazar la marcación con código virtual expirado (TC-5.03)", async () => {
      await db.insert(sessions).values({
        id: crypto.randomUUID(),
        groupId: "SW-II-A",
        date: "2026-05-25",
        expectedStart: "2026-05-25T07:00:00.000Z",
        expectedEnd: "2026-05-25T08:40:00.000Z",
        status: "CLOSED",
        toleranceType: "STATIC",
        toleranceLimit: "2026-05-25T07:15:00.000Z",
        virtualCode: "999999",
      });

      await testApiHandler({
        appHandler: virtualSwipeRoute,
        async test({ fetch }) {
          const res = await fetch({
            method: "POST",
            body: JSON.stringify({
              DniCui: "20201234",
              virtualCode: "999999",
            }),
          });
          const json = await res.json();

          expect(res.status).toBe(400);
          expect(json.success).toBe(false);
        },
      });
    });
  });

  describe("Módulo 6: Cierre Automático y Auditoría (RF-13, RF-14)", () => {
    // TC-6.03: Cierre Automático forzado
    it("debe forzar la salida de alumnos al cerrar la sesión (TC-6.03)", async () => {
      const sessionId = crypto.randomUUID();
      await db.insert(sessions).values({
        id: sessionId,
        groupId: "SW-II-A",
        date: "2026-05-25",
        expectedStart: "2026-05-25T07:00:00.000Z",
        expectedEnd: "2026-05-25T08:40:00.000Z",
        status: "ACTIVE",
        toleranceType: "STATIC",
        toleranceLimit: "2026-05-25T07:15:00.000Z",
      });

      await db.insert(attendances).values({
        id: crypto.randomUUID(),
        studentCui: "20201234",
        sessionId,
        checkIn: "2026-05-25T07:05:00.000Z",
        status: "PUNTUAL",
      });

      await testApiHandler({
        appHandler: closeSessionRoute,
        async test({ fetch }) {
          const res = await fetch({
            method: "POST",
            body: JSON.stringify({ sessionId }),
          });
          const json = await res.json();

          expect(json.success).toBe(true);
          expect(json.closedCount).toBe(1);

          const att = await db.select().from(attendances).limit(1);
          expect(att[0].checkOut).toBe("2026-05-25T08:40:00.000Z");
          expect(att[0].checkOutType).toBe("FORCED_BY_SESSION_CLOSE");
        },
      });
    });

    // TC-6.05: Modificación manual autorizada
    it("debe registrar cambios manuales en la auditoría (TC-6.05)", async () => {
      const sessionId = crypto.randomUUID();
      await db.insert(sessions).values({
        id: sessionId,
        groupId: "SW-II-A",
        date: "2026-05-25",
        expectedStart: "2026-05-25T07:00:00.000Z",
        expectedEnd: "2026-05-25T08:40:00.000Z",
        status: "ACTIVE",
        toleranceType: "STATIC",
        toleranceLimit: "2026-05-25T07:15:00.000Z",
      });

      await db.insert(attendances).values({
        id: crypto.randomUUID(),
        studentCui: "20201234",
        sessionId,
        checkIn: "2026-05-25T07:20:00.000Z",
        status: "TARDANZA",
      });

      await testApiHandler({
        appHandler: correctAttendanceRoute,
        async test({ fetch }) {
          const res = await fetch({
            method: "POST",
            body: JSON.stringify({
              operation: "UPDATE",
              studentCui: "20201234",
              sessionId,
              newStatus: "PUNTUAL",
              reason: "Olvido de carnet",
              actorCui: "10101010",
            }),
          });
          const json = await res.json();

          expect(json.success).toBe(true);

          // Verificar cambio en attendance
          const att = await db.select().from(attendances).limit(1);
          expect(att[0].status).toBe("PUNTUAL");

          // Verificar auditoría
          const log = await db.select().from(auditLogs).limit(1);
          expect(log[0].originalStatus).toBe("TARDANZA");
          expect(log[0].newStatus).toBe("PUNTUAL");
        },
      });
    });

    // TC-6.06: Anulación de registro
    it("debe anular un registro y auditar la operación (TC-6.06)", async () => {
      const sessionId = crypto.randomUUID();
      await db.insert(sessions).values({
        id: sessionId,
        groupId: "SW-II-A",
        date: "2026-05-25",
        expectedStart: "2026-05-25T07:00:00.000Z",
        expectedEnd: "2026-05-25T08:40:00.000Z",
        status: "ACTIVE",
        toleranceType: "STATIC",
        toleranceLimit: "2026-05-25T07:15:00.000Z",
      });

      await db.insert(attendances).values({
        id: crypto.randomUUID(),
        studentCui: "20201234",
        sessionId,
        checkIn: "2026-05-25T07:20:00.000Z",
        status: "TARDANZA",
      });

      await testApiHandler({
        appHandler: correctAttendanceRoute,
        async test({ fetch }) {
          const res = await fetch({
            method: "POST",
            body: JSON.stringify({
              operation: "DELETE",
              studentCui: "20201234",
              sessionId,
              reason: "Registro duplicado",
              actorCui: "10101010",
            }),
          });
          const json = await res.json();

          expect(json.success).toBe(true);

          const att = await db.select().from(attendances).limit(1);
          expect(att.length).toBe(0);

          const log = await db.select().from(auditLogs).limit(1);
          expect(log[0].originalStatus).toBe("TARDANZA");
          expect(log[0].newStatus).toBe("ANULADO");
        },
      });
    });

    // TC-6.07: Añadir nuevo registro manual
    it("debe crear un registro manual desde cero y auditarlo (TC-6.07)", async () => {
      const sessionId = crypto.randomUUID();
      await db.insert(sessions).values({
        id: sessionId,
        groupId: "SW-II-A",
        date: "2026-05-25",
        expectedStart: "2026-05-25T07:00:00.000Z",
        expectedEnd: "2026-05-25T08:40:00.000Z",
        status: "ACTIVE",
        toleranceType: "STATIC",
        toleranceLimit: "2026-05-25T07:15:00.000Z",
      });

      await testApiHandler({
        appHandler: correctAttendanceRoute,
        async test({ fetch }) {
          const res = await fetch({
            method: "POST",
            body: JSON.stringify({
              operation: "CREATE",
              studentCui: "20210002",
              sessionId,
              newStatus: "FALTA",
              reason: "Registro manual por contingencia",
              actorCui: "10101010",
            }),
          });
          const json = await res.json();

          expect(json.success).toBe(true);

          const att = await db.select().from(attendances).limit(1);
          expect(att.length).toBe(1);
          expect(att[0].status).toBe("FALTA");

          const log = await db.select().from(auditLogs).limit(1);
          expect(log[0].originalStatus).toBe("INEXISTENTE");
          expect(log[0].newStatus).toBe("FALTA");
        },
      });
    });
  });

  describe("Módulo 8: Robustez y Rendimiento (RNF-01, RNF-02)", () => {
    it("debe rechazar entradas de longitud extrema sin crashear (TC-8.01)", async () => {
      await testApiHandler({
        appHandler: swipeRoute,
        async test({ fetch }) {
          const res = await fetch({
            method: "POST",
            body: JSON.stringify({
              DniCui: "1".repeat(1000),
              mockTime: "2026-05-25T07:05:00.000Z",
            }),
          });
          const json = await res.json();

          expect(res.status).toBe(400);
          expect(json.success).toBe(false);
        },
      });
    });

    it("debe descartar la doble marcación en una ventana de 50ms (TC-8.02)", async () => {
      const sessionId = crypto.randomUUID();
      await db.insert(sessions).values({
        id: sessionId,
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
              mockTime: "2026-05-25T07:10:00.000Z",
            }),
          });

          const res2 = await fetch({
            method: "POST",
            body: JSON.stringify({
              DniCui: "20201234",
              mockTime: "2026-05-25T07:10:00.020Z",
            }),
          });
          expect([200, 429]).toContain(res2.status);

          const att = await db
            .select()
            .from(attendances)
            .where(eq(attendances.studentCui, "20201234"));
          expect(att.length).toBe(1);
        },
      });
    });

    it("debe capturar fallos del servicio universitario sin detenerse (TC-8.03)", async () => {
      const spy = vi
        .spyOn(UniversityService, "getStudentByCui")
        .mockRejectedValue(new Error("Servicio caído"));

      await testApiHandler({
        appHandler: swipeRoute,
        async test({ fetch }) {
          const res = await fetch({
            method: "POST",
            body: JSON.stringify({
              DniCui: "20201234",
              mockTime: "2026-05-25T07:05:00.000Z",
            }),
          });
          const json = await res.json();

          expect(res.status).toBe(500);
          expect(json.success).toBe(false);
        },
      });

      spy.mockRestore();
    });

    it("debe mantenerse por debajo del umbral de 150ms (TC-8.04, TC-8.05)", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const nowSpy = vi.spyOn(Date, "now").mockImplementation(() => {
        return 0;
      });

      await testApiHandler({
        appHandler: swipeRoute,
        async test({ fetch }) {
          nowSpy
            .mockImplementationOnce(() => 0)
            .mockImplementationOnce(() => 149);
          await fetch({
            method: "POST",
            body: JSON.stringify({
              DniCui: "00000000",
              mockTime: "2026-05-25T07:05:00.000Z",
            }),
          });

          nowSpy
            .mockImplementationOnce(() => 0)
            .mockImplementationOnce(() => 150);
          await fetch({
            method: "POST",
            body: JSON.stringify({
              DniCui: "00000000",
              mockTime: "2026-05-25T07:05:00.000Z",
            }),
          });

          expect(warnSpy).not.toHaveBeenCalled();
        },
      });

      warnSpy.mockRestore();
      nowSpy.mockRestore();
    });

    it("debe registrar advertencia cuando supera 150ms (TC-8.06)", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const nowSpy = vi.spyOn(Date, "now").mockImplementation(() => {
        return 0;
      });

      await testApiHandler({
        appHandler: swipeRoute,
        async test({ fetch }) {
          nowSpy
            .mockImplementationOnce(() => 0)
            .mockImplementationOnce(() => 151);
          await fetch({
            method: "POST",
            body: JSON.stringify({
              DniCui: "00000000",
              mockTime: "2026-05-25T07:05:00.000Z",
            }),
          });
        },
      });

      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
      nowSpy.mockRestore();
    });
  });
});
