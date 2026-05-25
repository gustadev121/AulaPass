import { and, eq } from "drizzle-orm";
import { testApiHandler } from "next-test-api-route-handler";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { attendances, auditLogs, sessions } from "@/db/schema";
import * as correctRoute from "../app/api/teacher/attendance/correct/route";

describe("Corrección Manual de Asistencia (RF-13)", () => {
  beforeEach(async () => {
    await db.delete(auditLogs);
    await db.delete(attendances);
    await db.delete(sessions);
  });

  const sessionId = "session-test";
  const studentCui = "20201234";

  async function setupSessionAndAttendance() {
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
      id: "att-1",
      studentCui,
      sessionId,
      checkIn: "2026-05-25T07:30:00.000Z", // Tardanza
      status: "TARDANZA",
      checkOutType: "NORMAL",
    });
  }

  it("debe permitir al docente alterar el estado de un alumno (TC-5.05)", async () => {
    await setupSessionAndAttendance();

    await testApiHandler({
      appHandler: correctRoute,
      async test({ fetch }) {
        const res = await fetch({
          method: "POST",
          body: JSON.stringify({
            operation: "UPDATE",
            studentCui,
            sessionId,
            newStatus: "PUNTUAL",
            reason: "Justificación médica",
            actorCode: "10101010",
          }),
        });

        const json = await res.json();
        expect(res.status).toBe(200);
        expect(json.success).toBe(true);

        // Verificar cambio en BD
        const att = await db
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

        expect(att.status).toBe("PUNTUAL");
        expect(att.observation).toContain("Justificación médica");

        // Verificar log de auditoría
        const logs = await db.select().from(auditLogs);
        expect(logs.length).toBe(1);
        expect(logs[0].originalStatus).toBe("TARDANZA");
        expect(logs[0].newStatus).toBe("PUNTUAL");
      },
    });
  });

  it("debe permitir al docente anular un registro (TC-5.06)", async () => {
    await setupSessionAndAttendance();

    await testApiHandler({
      appHandler: correctRoute,
      async test({ fetch }) {
        const res = await fetch({
          method: "POST",
          body: JSON.stringify({
            operation: "DELETE",
            studentCui,
            sessionId,
            reason: "Error de marcación",
            actorCode: "10101010",
          }),
        });

        expect(res.status).toBe(200);

        // Verificar eliminación
        const att = await db
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

        expect(att).toBeUndefined();

        // Verificar auditoría
        const logs = await db.select().from(auditLogs);
        expect(logs[0].newStatus).toBe("ANULADO");
      },
    });
  });

  it("debe permitir al docente añadir un nuevo registro manual (TC-5.07)", async () => {
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
      appHandler: correctRoute,
      async test({ fetch }) {
        const res = await fetch({
          method: "POST",
          body: JSON.stringify({
            operation: "CREATE",
            studentCui,
            sessionId,
            newStatus: "PUNTUAL",
            reason: "Olvidó su carnet",
            actorCode: "10101010",
          }),
        });

        expect(res.status).toBe(200);

        const att = await db
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

        expect(att).toBeDefined();
        expect(att.status).toBe("PUNTUAL");
      },
    });
  });
});
