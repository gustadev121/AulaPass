import { and, eq } from "drizzle-orm";
import { testApiHandler } from "next-test-api-route-handler";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { attendances, auditLogs, sessions } from "@/db/schema";
import { UniversityService } from "@/lib/university-service";
import * as swipeRoute from "../app/api/kiosk/swipe/route";
import * as correctAttendanceRoute from "../app/api/teacher/attendance/correct/route";
import * as teacherLoginRoute from "../app/api/teacher/login/route";
import * as checkAbsenceRoute from "../app/api/teacher/session/check-absence/route";
import * as closeSessionRoute from "../app/api/teacher/session/close/route";

describe("API Integration Tests - Módulos 1, 2, 3, 4, 6, 8", () => {
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
    it("debe permitir el acceso del docente con código válido (TC-1.11)", async () => {
      await testApiHandler({
        appHandler: teacherLoginRoute,
        async test({ fetch }) {
          const res = await fetch({
            method: "POST",
            body: JSON.stringify({
              teacherCode: "10101010",
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
        appHandler: teacherLoginRoute,
        async test({ fetch }) {
          const res = await fetch({
            method: "POST",
            body: JSON.stringify({
              teacherCode: "00000000",
            }),
          });
          const json = await res.json();

          expect(res.status).toBe(401);
          expect(json.success).toBe(false);
        },
      });
    });
  });

  describe("Módulo 3: Control de Asistencia Docente (RF-06)", () => {
    it("debe permitir el ingreso del docente oficial usando CUI (TC-3.01)", async () => {
      await testApiHandler({
        appHandler: swipeRoute,
        async test({ fetch }) {
          const res = await fetch({
            method: "POST",
            body: JSON.stringify({
              DniCui: "90000001",
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

    it("debe rechazar a un docente que no pertenece al curso en este horario (TC-3.02)", async () => {
      await testApiHandler({
        appHandler: swipeRoute,
        async test({ fetch }) {
          const res = await fetch({
            method: "POST",
            body: JSON.stringify({
              DniCui: "90000002", // Docente ajeno al bloque
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

    it("debe usar tolerancia DINÁMICA si el docente llega tarde (Fix reported issue)", async () => {
      // SW-II-B Lunes: 08:50 - 11:30. 15 min tolerance ends at 09:05.
      // Docente (90000001) llega a las 09:10 local (14:10 UTC si es GMT-5)
      const mockTimeTeacher = "2026-05-25T14:10:00.000Z";
      const mockTimeStudent = "2026-05-25T14:11:00.000Z";

      await testApiHandler({
        appHandler: swipeRoute,
        async test({ fetch }) {
          // 1. Docente marca
          const resT = await fetch({
            method: "POST",
            body: JSON.stringify({
              DniCui: "90000001",
              mockTime: mockTimeTeacher,
            }),
          });
          expect(resT.status).toBe(200);

          // Verificar que la sesión es DYNAMIC
          const session = await db
            .select()
            .from(sessions)
            .limit(1)
            .then((res) => res[0]);
          expect(session.toleranceType).toBe("DYNAMIC");

          // 2. Alumno (20205678) marca
          const resS = await fetch({
            method: "POST",
            body: JSON.stringify({
              DniCui: "20205678",
              mockTime: mockTimeStudent,
            }),
          });
          const jsonS = await resS.json();
          expect(resS.status).toBe(200);
          // Antes resultaba en "TARDANZA", ahora en "PUNTUAL" por estar dentro de tolerancia (RF-10)
          expect(jsonS.status).toBe("PUNTUAL");
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

    // TC-2.05: Alumno inválido ingresa primero
    it("NO debe autogenerar sesión si un alumno inválido marca primero (TC-2.05)", async () => {
      await testApiHandler({
        appHandler: swipeRoute,
        async test({ fetch }) {
          const res = await fetch({
            method: "POST",
            body: JSON.stringify({
              DniCui: "99999999", // Alumno no matriculado
              mockTime: "2026-05-25T12:10:00.000Z",
            }),
          });
          const json = await res.json();

          expect(res.status).toBe(400);
          expect(json.success).toBe(false);

          // Verificar que NO se creó la sesión
          const sess = await db.select().from(sessions).limit(1);
          expect(sess.length).toBe(0);
        },
      });
    });

    // TC-2.06: Ingreso con sesión ya generada
    it("debe usar la sesión existente si ya fue generada previamente (TC-2.06)", async () => {
      const sessionId = crypto.randomUUID();
      await db.insert(sessions).values({
        id: sessionId,
        groupId: "SW-II-A",
        date: "2026-05-25",
        expectedStart: "2026-05-25T12:00:00.000Z",
        expectedEnd: "2026-05-25T13:40:00.000Z",
        status: "ACTIVE",
        toleranceType: "STATIC",
        toleranceLimit: "2026-05-25T12:15:00.000Z",
      });

      await testApiHandler({
        appHandler: swipeRoute,
        async test({ fetch }) {
          await fetch({
            method: "POST",
            body: JSON.stringify({
              DniCui: "20201234",
              mockTime: "2026-05-25T12:10:00.000Z",
            }),
          });

          // Verificar que solo hay una sesión
          const sess = await db.select().from(sessions);
          expect(sess.length).toBe(1);
          expect(sess[0].id).toBe(sessionId);
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

    // TC-3.08: Cierre automático por expiración de tiempo (RF-10, RF-13)
    it("debe cerrar la sesión y marcar faltas automáticamente cuando el tiempo expira (TC-3.08)", async () => {
      const sessionId = crypto.randomUUID();
      const expectedEnd = "2026-05-25T08:40:00.000Z";
      
      await db.insert(sessions).values({
        id: sessionId,
        groupId: "SW-II-A", // Grupo con 3 alumnos en mock (1, 2, 3)
        date: "2026-05-25",
        expectedStart: "2026-05-25T07:00:00.000Z",
        expectedEnd: expectedEnd,
        status: "ACTIVE",
        toleranceType: "STATIC",
        toleranceLimit: "2026-05-25T07:15:00.000Z",
      });

      // Registrar un alumno puntual
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
              mockTime: "2026-05-25T08:41:00.000Z", // 1 min después de la hora de fin
            }),
          });
          const json = await res.json();

          expect(json.closed).toBe(true);
          expect(json.absentCount).toBeGreaterThan(0);

          // Verificar sesión cerrada
          const sess = await db
            .select()
            .from(sessions)
            .where(eq(sessions.id, sessionId))
            .limit(1)
            .then(r => r[0]);
          expect(sess.status).toBe("CLOSED");

          // Verificar que el alumno 1 tiene salida forzada (RF-13)
          const att1 = await db
            .select()
            .from(attendances)
            .where(and(eq(attendances.sessionId, sessionId), eq(attendances.studentCui, "20201234")))
            .limit(1)
            .then(r => r[0]);
          expect(att1.checkOut).toBe(expectedEnd);
          expect(att1.checkOutType).toBe("FORCED_BY_SESSION_CLOSE");

          // Verificar que los alumnos 2 y 3 tienen FALTA (RF-10)
          const absences = await db
            .select()
            .from(attendances)
            .where(and(eq(attendances.sessionId, sessionId), eq(attendances.status, "FALTA")));
          
          const absentCuis = absences.map(a => a.studentCui);
          expect(absentCuis).toContain("20210001");
          expect(absentCuis).toContain("20210002");
        },
      });
    });

    // TC-3.07: Llegada de docente tras límite de suspensión
    it("debe rechazar marcación del docente si la sesión ya fue suspendida (TC-3.07)", async () => {
      const sessionId = crypto.randomUUID();
      await db.insert(sessions).values({
        id: sessionId,
        groupId: "SW-II-A",
        date: "2026-05-25",
        expectedStart: "2026-05-25T07:00:00.000Z",
        expectedEnd: "2026-05-25T08:40:00.000Z",
        status: "SUSPENDED",
        toleranceType: "STATIC",
        toleranceLimit: "2026-05-25T07:15:00.000Z",
      });

      await testApiHandler({
        appHandler: swipeRoute,
        async test({ fetch }) {
          const res = await fetch({
            method: "POST",
            body: JSON.stringify({
              DniCui: "90000001", // Docente oficial (CUI)
              mockTime: "2026-05-25T12:20:00.000Z",
            }),
          });
          const json = await res.json();

          expect(res.status).toBe(400);
          expect(json.message).toContain("suspendida");
        },
      });
    });
  });

  describe("Módulo 6: Cierre Automático y Auditoría (RF-13, RF-14)", () => {
    // TC-6.08: Marcación física detona cierre automático diferido
    it("debe detonar cierre automático diferido y procesar nuevo swipe (TC-6.08)", async () => {
      // Sesión expirada (SW-II-A, termina a las 08:40, pero sigue "ACTIVE")
      const sessionId = crypto.randomUUID();
      const expectedStart = new Date(2026, 4, 25, 7, 0);
      const expectedEnd = new Date(2026, 4, 25, 8, 40);
      const toleranceLimit = new Date(2026, 4, 25, 7, 15);

      await db.insert(sessions).values({
        id: sessionId,
        groupId: "SW-II-A",
        date: "2026-05-25",
        expectedStart: expectedStart.toISOString(),
        expectedEnd: expectedEnd.toISOString(),
        status: "ACTIVE",
        toleranceType: "STATIC",
        toleranceLimit: toleranceLimit.toISOString(),
      });

      const checkInTime = new Date(2026, 4, 25, 7, 5);
      await db.insert(attendances).values({
        id: crypto.randomUUID(),
        studentCui: "20201234",
        sessionId,
        checkIn: checkInTime.toISOString(),
        status: "PUNTUAL",
      });

      // Ana Choque (20210002) marca a las 10:20 (durante SW-II-B, que es 08:50-10:30)
      const mockTimeStr = new Date(2026, 4, 25, 10, 20).toISOString();

      await testApiHandler({
        appHandler: swipeRoute,
        async test({ fetch }) {
          const res = await fetch({
            method: "POST",
            body: JSON.stringify({
              DniCui: "20210002",
              mockTime: mockTimeStr,
            }),
          });
          const json = await res.json();

          expect(res.status).toBe(200);
          expect(json.success).toBe(true);

          // Verificar que la sesión vieja se cerró
          const oldSession = await db
            .select()
            .from(sessions)
            .where(eq(sessions.id, sessionId));
          expect(oldSession[0].status).toBe("CLOSED");

          // Verificar que hubo auto-checkout para Juan y falta para Carlos (RF-10, RF-13)
          // Ana Choque (20210002) NO debe tener falta porque está asistiendo a esta otra sesión (RF-Flexible)
          const oldAtt = await db
            .select()
            .from(attendances)
            .where(eq(attendances.sessionId, sessionId));
          
          expect(oldAtt.length).toBe(2); // Juan + Carlos
          expect(oldAtt.find((a) => a.studentCui === "20201234")?.checkOutType).toBe(
            "FORCED_BY_SESSION_CLOSE",
          );
          expect(oldAtt.filter((a) => a.status === "FALTA").length).toBe(1); // Solo Carlos


          // Verificar que se creó una sesión nueva para SW-II-B
          const newSessions = await db
            .select()
            .from(sessions)
            .where(eq(sessions.status, "ACTIVE"));
          expect(newSessions.length).toBe(1);
          expect(newSessions[0].groupId).toBe("SW-II-B");

          // Verificar que la asistencia de Ana se registró en la nueva sesión
          const anaAtt = await db
            .select()
            .from(attendances)
            .where(
              and(
                eq(attendances.studentCui, "20210002"),
                eq(attendances.sessionId, newSessions[0].id),
              ),
            );
          expect(anaAtt.length).toBe(1);
        },
      });
    });

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

          // [RF-10] Verificar que los alumnos que NO marcaron ahora tienen estado FALTA
          // Juan Pérez (20201234) ya marcó.
          // Carlos Condori (20210001) y Ana Choque (20210002) son de SW-II-A y no marcaron.
          const faltas = await db
            .select()
            .from(attendances)
            .where(eq(attendances.status, "FALTA"));
          expect(faltas.length).toBe(2);
          const cuis = faltas.map((f) => f.studentCui);
          expect(cuis).toContain("20210001");
          expect(cuis).toContain("20210002");
        },
      });
    });

    // TC-6.09: Inasistencias automáticas en cierre automático (Swipe)
    it("debe marcar FALTA a alumnos ausentes cuando la sesión se cierra automáticamente por swipe (TC-6.09)", async () => {
      const sessionId = crypto.randomUUID();
      const expectedEnd = "2026-05-25T08:40:00.000Z";

      await db.insert(sessions).values({
        id: sessionId,
        groupId: "SW-II-A",
        date: "2026-05-25",
        expectedStart: "2026-05-25T07:00:00.000Z",
        expectedEnd: expectedEnd,
        status: "ACTIVE",
        toleranceType: "STATIC",
        toleranceLimit: "2026-05-25T07:15:00.000Z",
      });

      // Juan marca puntual
      await db.insert(attendances).values({
        id: crypto.randomUUID(),
        studentCui: "20201234",
        sessionId,
        checkIn: "2026-05-25T07:05:00.000Z",
        status: "PUNTUAL",
      });

      // Swipe después de la hora de fin (10:00 AM) detona auto-cierre
      await testApiHandler({
        appHandler: swipeRoute,
        async test({ fetch }) {
          await fetch({
            method: "POST",
            body: JSON.stringify({
              DniCui: "20210999", // Un alumno de otro curso (detona el check de sesión activa)
              mockTime: "2026-05-25T15:00:00.000Z", // GMT-5: 10:00 AM
            }),
          });

          // Verificar faltas automáticas para Carlos (20210001) y Ana (20210002)
          const faltas = await db
            .select()
            .from(attendances)
            .where(
              and(
                eq(attendances.sessionId, sessionId),
                eq(attendances.status, "FALTA"),
              ),
            );
          expect(faltas.length).toBe(2);
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
              actorCode: "10101010",
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
              actorCode: "10101010",
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
              actorCode: "10101010",
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

    // TC-6.04: Marcación física posterior al cierre automático
    it("debe registrar AMBIENTE_ESTUDIO si un alumno auto-retirado vuelve a marcar (TC-6.04)", async () => {
      const sessionId = crypto.randomUUID();
      // Sesión que ya terminó
      await db.insert(sessions).values({
        id: sessionId,
        groupId: "SW-II-A",
        date: "2026-05-25",
        expectedStart: "2026-05-25T07:00:00.000Z",
        expectedEnd: "2026-05-25T08:40:00.000Z",
        status: "CLOSED",
        toleranceType: "STATIC",
        toleranceLimit: "2026-05-25T07:15:00.000Z",
      });

      await testApiHandler({
        appHandler: swipeRoute,
        async test({ fetch }) {
          const res = await fetch({
            method: "POST",
            body: JSON.stringify({
              DniCui: "20201234",
              mockTime: "2026-05-25T08:50:00.000Z", // Después del cierre
            }),
          });
          const json = await res.json();

          expect(res.status).toBe(200);
          expect(json.status).toBe("AMBIENTE_ESTUDIO");
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
