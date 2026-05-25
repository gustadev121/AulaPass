import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import KioskScreen from "./KioskScreen";

const fetchMock = vi.fn<typeof fetch>();
globalThis.fetch = fetchMock;

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const buildFetchResponse = <T,>(data: T, init?: Partial<Response>): Response =>
  ({
    ok: true,
    status: 200,
    json: async () => data,
    ...init,
  }) as Response;

describe(
  "KioskScreen - Módulo 7: Respuesta Visual en Pantalla",
  { timeout: 30000 },
  () => {
    beforeEach(() => {
      vi.clearAllMocks();
      fetchMock.mockResolvedValue(
        buildFetchResponse({ success: true, suspended: false }),
      );
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const onTeacherLoginMock = vi.fn();

    it("debe mostrar color VERDE para un registro puntual (TC-7.01)", async () => {
      fetchMock.mockResolvedValueOnce(
        buildFetchResponse({
          success: true,
          color: "GREEN",
          message: "¡Bienvenido! Puntual",
        }),
      );

      await act(async () => {
        render(<KioskScreen onTeacherLogin={onTeacherLoginMock} />);
      });

      const input = screen.getByPlaceholderText("12345678");
      await act(async () => {
        fireEvent.change(input, { target: { value: "20201234" } });
        const form = input.closest("form");
        if (!form) {
          throw new Error("Expected input to be inside a form.");
        }
        fireEvent.submit(form);
      });

      await act(async () => {
        await flushMicrotasks();
      });

      expect(screen.getByText("¡Bienvenido! Puntual")).toBeInTheDocument();

      const container = screen
        .getByText("¡Bienvenido! Puntual")
        .closest("div.min-h-screen");
      if (!container) {
        throw new Error("Expected response to be inside the kiosk container.");
      }
      expect(container).toHaveClass("bg-green-500");
    });

    it("debe mostrar color ÁMBAR para un registro de tardanza (TC-7.02)", async () => {
      fetchMock.mockResolvedValueOnce(
        buildFetchResponse({
          success: true,
          color: "AMBER",
          message: "Tardanza registrada",
        }),
      );

      await act(async () => {
        render(<KioskScreen onTeacherLogin={onTeacherLoginMock} />);
      });

      const input = screen.getByPlaceholderText("12345678");
      await act(async () => {
        fireEvent.change(input, { target: { value: "20205678" } });
        const form = input.closest("form");
        if (!form) {
          throw new Error("Expected input to be inside a form.");
        }
        fireEvent.submit(form);
      });

      await act(async () => {
        await flushMicrotasks();
      });
      expect(screen.getByText("Tardanza registrada")).toBeInTheDocument();

      const container = screen
        .getByText("Tardanza registrada")
        .closest("div.min-h-screen");
      if (!container) {
        throw new Error("Expected response to be inside the kiosk container.");
      }
      expect(container).toHaveClass("bg-amber-500");
    });

    it("debe mostrar color AZUL para salida o ambiente de estudio (TC-7.03)", async () => {
      fetchMock.mockResolvedValueOnce(
        buildFetchResponse({
          success: true,
          color: "BLUE",
          message: "Salida registrada",
        }),
      );

      await act(async () => {
        render(<KioskScreen onTeacherLogin={onTeacherLoginMock} />);
      });

      const input = screen.getByPlaceholderText("12345678");
      await act(async () => {
        fireEvent.change(input, { target: { value: "20201234" } });
        const form = input.closest("form");
        if (!form) {
          throw new Error("Expected input to be inside a form.");
        }
        fireEvent.submit(form);
      });

      await act(async () => {
        await flushMicrotasks();
      });
      expect(screen.getByText("Salida registrada")).toBeInTheDocument();

      const container = screen
        .getByText("Salida registrada")
        .closest("div.min-h-screen");
      if (!container) {
        throw new Error("Expected response to be inside the kiosk container.");
      }
      expect(container).toHaveClass("bg-blue-500");
    });

    it("debe mostrar color ROJO para errores o denegaciones (TC-7.04)", async () => {
      fetchMock.mockResolvedValueOnce(
        buildFetchResponse(
          { success: false, color: "RED", message: "No matriculado" },
          { ok: false, status: 400 },
        ),
      );

      await act(async () => {
        render(<KioskScreen onTeacherLogin={onTeacherLoginMock} />);
      });

      const input = screen.getByPlaceholderText("12345678");
      await act(async () => {
        fireEvent.change(input, { target: { value: "99999999" } });
        const form = input.closest("form");
        if (!form) {
          throw new Error("Expected input to be inside a form.");
        }
        fireEvent.submit(form);
      });

      await act(async () => {
        await flushMicrotasks();
      });
      expect(screen.getByText("No matriculado")).toBeInTheDocument();

      const container = screen
        .getByText("No matriculado")
        .closest("div.min-h-screen");
      if (!container) {
        throw new Error("Expected response to be inside the kiosk container.");
      }
      expect(container).toHaveClass("bg-red-500");
    });

    it("debe restablecerse a IDLE tras 3 segundos (TC-7.05, TC-7.06)", async () => {
      vi.useFakeTimers();
      fetchMock.mockResolvedValueOnce(
        buildFetchResponse({
          success: true,
          color: "GREEN",
          message: "Exitoso",
        }),
      );

      await act(async () => {
        render(<KioskScreen onTeacherLogin={onTeacherLoginMock} />);
      });

      const input = screen.getByPlaceholderText("12345678");
      await act(async () => {
        fireEvent.change(input, { target: { value: "20201234" } });
        const form = input.closest("form");
        if (!form) {
          throw new Error("Expected input to be inside a form.");
        }
        fireEvent.submit(form);
      });

      await act(async () => {
        await flushMicrotasks();
      });

      expect(screen.getByText("Exitoso")).toBeInTheDocument();

      // 2.99s - No debe haberse reseteado (TC-7.05)
      await act(async () => {
        vi.advanceTimersByTime(2990);
      });
      expect(screen.getByText("Exitoso")).toBeInTheDocument();

      // 3.00s - Debe resetearse (TC-7.06)
      await act(async () => {
        vi.advanceTimersByTime(10);
      });
      expect(screen.getByText("Ingrese su CUI o DNI")).toBeInTheDocument();
    });

    it("debe auto-enfocar el input tras restablecerse (TC-7.08)", async () => {
      vi.useFakeTimers();
      fetchMock.mockResolvedValueOnce(
        buildFetchResponse({
          success: true,
          color: "GREEN",
          message: "Exitoso",
        }),
      );

      await act(async () => {
        render(<KioskScreen onTeacherLogin={onTeacherLoginMock} />);
      });

      const input = screen.getByPlaceholderText("12345678");
      expect(input).toHaveFocus();

      await act(async () => {
        fireEvent.change(input, { target: { value: "20201234" } });
        const form = input.closest("form");
        if (!form) {
          throw new Error("Expected input to be inside a form.");
        }
        fireEvent.submit(form);
      });

      await act(async () => {
        await flushMicrotasks();
      });

      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      const inputAfter = screen.getByPlaceholderText("12345678");
      expect(inputAfter).toHaveFocus();
    });
  },
);
