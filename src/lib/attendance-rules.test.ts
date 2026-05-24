import { describe, expect, it } from "vitest";
import { AttendanceRulesEngine } from "./attendance-rules";

describe("AttendanceRulesEngine - Pruebas Iniciales de Caja Negra", () => {
  describe("determineSwipeType - Particiones de Equivalencia", () => {
    it("debe retornar 'SALIDA' si el estudiante ya registró ingreso en la sesión", () => {
      const type = AttendanceRulesEngine.determineSwipeType(true);
      expect(type).toBe("SALIDA");
    });

    it("debe retornar 'ENTRADA' si el estudiante no cuenta con registros en la sesión", () => {
      const type = AttendanceRulesEngine.determineSwipeType(false);
      expect(type).toBe("ENTRADA");
    });
  });

  describe("applyAutomaticCheckOuts - Valores Límite", () => {
    it("debe marcar como salida forzada a los alumnos que no registraron su salida", () => {
      const attendances = [
        {
          studentCui: "20201234",
          checkIn: "2026-05-24T07:00:00Z",
          checkOut: null,
          checkOutType: "NORMAL",
          status: "PUNTUAL",
        },
        {
          studentCui: "20205678",
          checkIn: "2026-05-24T07:15:00Z",
          checkOut: "2026-05-24T08:30:00Z",
          checkOutType: "NORMAL",
          status: "TARDANZA",
        },
      ];

      const expectedEnd = new Date("2026-05-24T08:40:00Z");
      const results = AttendanceRulesEngine.applyAutomaticCheckOuts(
        attendances,
        expectedEnd,
      );

      expect(results[0].checkOut).toBe(expectedEnd.toISOString());
      expect(results[0].checkOutType).toBe("FORCED_BY_SESSION_CLOSE");

      // El segundo estudiante no se altera porque ya tenía registro de salida
      expect(results[1].checkOut).toBe("2026-05-24T08:30:00Z");
      expect(results[1].checkOutType).toBe("NORMAL");
    });
  });
});
