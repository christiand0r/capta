import { testClient } from "hono/testing";
import { describe, it, expect, beforeAll, vi } from "vitest";
import { workdays } from "@/tests/workdays/instance";
import type { BusinessConfig } from "@/middlewares/business";

const mockHolidays = new Set<string>([
  "2025-01-01", // Año Nuevo
  "2025-04-17", // Jueves Santo
  "2025-04-18", // Viernes Santo
  "2025-05-01", // Día del Trabajo
  "2025-12-25", // Navidad
]);

// Mock holiday provider con tipado explícito
vi.mock(
  "@/providers/Holidays",
  (): Record<string, unknown> => ({
    HolidayProvider: class {
      async getHolidays(): Promise<Set<string>> {
        return mockHolidays;
      }
    },
  })
);

const expectSuccessResponse = async (response: Response): Promise<SuccessResponse> => {
  expect(response.status).toBe(200);

  const data: WorkdaysResponse = (await response.json()) as WorkdaysResponse;

  if (!("date" in data)) {
    throw new Error(`Expected success response but got error: ${JSON.stringify(data)}`);
  }

  return data as SuccessResponse;
};

const expectErrorResponse = async (
  response: Response,
  expectedStatus: number
): Promise<ErrorResponse> => {
  expect(response.status).toBe(expectedStatus);

  const data: WorkdaysResponse = (await response.json()) as WorkdaysResponse;

  if (!("error" in data)) {
    throw new Error(`Expected error response but got success: ${JSON.stringify(data)}`);
  }

  return data as ErrorResponse;
};

const client = testClient(workdays);

describe("Capta Holidays API", () => {
  describe("CASOS BASICOS", () => {
    it("Sumar días", async () => {
      const query: WorkdaysQuery = {
        date: "2025-09-22T15:00:00.000Z", // Lunes 10:00 AM Colombia
        days: "3",
      };

      const res: Response = await client.index.$get({ query });
      const data: SuccessResponse = await expectSuccessResponse(res);

      expect(data.date).toBe("2025-09-25T15:00:00.000Z"); // Jueves 10:00 AM
    });

    it("Sumar horas", async () => {
      const query: WorkdaysQuery = {
        date: "2025-09-22T15:00:00.000Z", // Lunes 10:00 AM Colombia
        hours: "4",
      };

      const res: Response = await client.index.$get({ query });
      const data: SuccessResponse = await expectSuccessResponse(res);

      expect(data.date).toBe("2025-09-22T20:00:00.000Z"); // Lunes 2:00 PM Colombia
    });

    it("Sumar días y horas", async () => {
      const query: WorkdaysQuery = {
        date: "2025-09-25T23:17:00.000Z", // Lunes 3:00 PM Colombia
        days: "2",
        hours: "4",
      };

      const res: Response = await client.index.$get({ query });
      const data: SuccessResponse = await expectSuccessResponse(res);

      expect(data.date).toBe("2025-09-29T17:00:00.000Z"); // Lunes 12:00 PM Colombia
    });
  });

  describe("APROXIMACIONES HACIA ATRÁS", (): void => {
    it("Día laboral, pero antes de inicio de jornada", async (): Promise<void> => {
      const query: WorkdaysQuery = {
        date: "2025-09-22T12:00:00.000Z", //  ⁠Lunes 22 de septiembre, 07:00 AM
        hours: "1",
      };

      const res: Response = await client.index.$get({ query });
      const data: SuccessResponse = await expectSuccessResponse(res);

      expect(data.date).toBe("2025-09-19T14:00:00.000Z"); // viernes 19 de septiembre, 9:00 AM
    });

    it("Día laboral, pero durante break", async (): Promise<void> => {
      const query: WorkdaysQuery = {
        date: "2025-09-22T17:30:00.000Z", // ⁠Lunes 22 de septiembre, 12:30 PM
        hours: "2",
      };

      const res: Response = await client.index.$get({ query });
      const data: SuccessResponse = await expectSuccessResponse(res);

      expect(data.date).toBe("2025-09-22T19:00:00.000Z"); // Lunes 22 de septiembre, 2:00 AM
    });

    it("Día laboral, pero despues de final de jornada", async (): Promise<void> => {
      const query: WorkdaysQuery = {
        date: "2025-09-22T22:10:00.000Z", // ⁠Lunes 22 de septiembre, 5:10 PM
        hours: "1",
      };

      const res: Response = await client.index.$get({ query });
      const data: SuccessResponse = await expectSuccessResponse(res);

      expect(data.date).toBe("2025-09-22T14:00:00.000Z"); // Lunes 22 de septiembre, 9:00 AM
    });

    it("Día no laboral, pero dentro de horario de jornada", async (): Promise<void> => {
      const query: WorkdaysQuery = {
        date: "2025-01-01T13:30:00.000Z", // ⁠Año nuevo, 8:30 AM
        hours: "1",
      };

      const res: Response = await client.index.$get({ query });
      const data: SuccessResponse = await expectSuccessResponse(res);

      expect(data.date).toBe("2024-12-31T14:30:00.000Z"); // 31 de diciembre, 9:30 AM
    });

    it("Día no laboral, pero fuera de horario de jornada", async (): Promise<void> => {
      const query: WorkdaysQuery = {
        date: "2025-05-01T11:30:00.000Z", // ⁠Día del trabajador, 6:30 AM
        hours: "1",
      };

      const res: Response = await client.index.$get({ query });
      const data: SuccessResponse = await expectSuccessResponse(res);

      expect(data.date).toBe("2025-05-02T14:00:00.000Z"); // Viernes 2 de mayo, 9:00 AM
    });
  });

  describe("MANEJO DE MINUTOS", (): void => {
    it("Conservar minutos", async (): Promise<void> => {
      const query: WorkdaysQuery = {
        date: "2025-09-22T16:30:00.000Z", //  ⁠Lunes 22 de septiembre, 11:30 AM
        hours: "3",
      };

      const res: Response = await client.index.$get({ query });
      const data: SuccessResponse = await expectSuccessResponse(res);

      expect(data.date).toBe("2025-09-22T20:30:00.000Z"); // Lunes 22 de septiembre, 3:30 PM
    });

    it("Redondear minutos hacía abajo", async (): Promise<void> => {
      const query: WorkdaysQuery = {
        date: "2025-09-22T23:30:00.000Z", //  ⁠Lunes 22 de septiembre, 6:30 PM
        hours: "3",
      };

      const res: Response = await client.index.$get({ query });
      const data: SuccessResponse = await expectSuccessResponse(res);

      expect(data.date).toBe("2025-09-22T16:00:00.000Z"); // Lunes 22 de septiembre, 11:00 AM
    });
  });

  describe("CANTIDADES GRANDES", (): void => {
    it("Muchos días", async (): Promise<void> => {
      const query: WorkdaysQuery = {
        date: "2025-01-01T15:00:00.000Z", // 1 enero 10:00 AM Colombia
        days: "500",
      };

      const res: Response = await client.index.$get({ query });
      const data: SuccessResponse = await expectSuccessResponse(res);

      // Verificar que no falle y retorne una fecha válida
      expect(data.date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it("Muchas horas", async (): Promise<void> => {
      const query: WorkdaysQuery = {
        date: "2025-01-01T15:00:00.000Z", // 1 enero 10:00 AM Colombia
        hours: "420",
      };

      const res: Response = await client.index.$get({ query });
      const data: SuccessResponse = await expectSuccessResponse(res);

      expect(data.date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it("Muchos dias y horas", async (): Promise<void> => {
      const query: WorkdaysQuery = {
        date: "2025-01-01T15:00:00.000Z", // 1 enero 10:00 AM Colombia
        days: "100",
        hours: "100",
      };

      const res: Response = await client.index.$get({ query });
      const data: SuccessResponse = await expectSuccessResponse(res);

      expect(data.date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe("CASOS COMPLEJOS", () => {
    it("Fin de jornada", async () => {
      const query: WorkdaysQuery = {
        date: "2025-09-22T21:00:00.000Z", // Lunes 4:00 PM Colombia
        hours: "2",
      };

      const res: Response = await client.index.$get({ query });
      const data: SuccessResponse = await expectSuccessResponse(res);

      expect(data.date).toBe("2025-09-23T14:00:00.000Z"); // Martes 9:00 AM Colombia
    });

    it("Exactamente en el inicio de break", async () => {
      const query: WorkdaysQuery = {
        date: "2025-09-22T17:00:00.000Z", // Lunes 12:00 PM Colombia (límite)
        hours: "1",
      };

      const res: Response = await client.index.$get({ query });
      const data: SuccessResponse = await expectSuccessResponse(res);

      expect(data.date).toBe("2025-09-22T19:00:00.000Z"); // Lunes 2:00 PM Colombia
    });

    it("Exactamente en el fin de jornada", async () => {
      const query: WorkdaysQuery = {
        date: "2025-09-22T22:00:00.000Z", // Lunes 12:00 PM Colombia (límite)
        hours: "1",
      };

      const res: Response = await client.index.$get({ query });
      const data: SuccessResponse = await expectSuccessResponse(res);

      expect(data.date).toBe("2025-09-23T14:00:00.000Z"); // Martes 9:00 AM Colombia
    });

    it("Cambio de semana por horas", async () => {
      const query: WorkdaysQuery = {
        date: "2025-09-26T20:00:00.000Z", // Viernes 3:00 PM Colombia
        hours: "6",
      };

      const res: Response = await client.index.$get({ query });
      const data: SuccessResponse = await expectSuccessResponse(res);

      expect(data.date).toBe("2025-09-29T17:00:00.000Z"); // Lunes 12:00 PM Colombia
    });
  });

  describe("CASOS DE ERROR", () => {
    it("Parametros totalmente vacíos", async () => {
      const res: Response = await client.index.$get({ query: {} });
      const data: ErrorResponse = await expectErrorResponse(res, 400);

      expect(data.error).toContain("INVALID_QUERY_VALUES");
      expect(data.message).toContain("Must be provide almost one parameter");
    });

    it("Requiere al menos un parametro", async () => {
      const res: Response = await client.index.$get({
        query: {
          date: "2025-12-25T15:00:00.000Z",
        },
      });
      const data: ErrorResponse = await expectErrorResponse(res, 400);

      expect(data.error).toContain("INVALID_QUERY_VALUES");
      expect(data.message).toContain("Must be provide almost one parameter");
    });

    it("Rechazar valores negativos", async () => {
      const query: WorkdaysQuery = {
        days: "-5",
      };

      const res: Response = await client.index.$get({ query });
      const data: ErrorResponse = await expectErrorResponse(res, 400);

      expect(data.error).toContain("INVALID_QUERY_VALUES");
      expect(data.message).toContain("Too small: expected number to be >0");
    });

    it("Rechazar valores iguales a 0", async () => {
      const query: WorkdaysQuery = {
        hours: "0",
        days: "0",
      };

      const res: Response = await client.index.$get({ query });
      const data: ErrorResponse = await expectErrorResponse(res, 400);

      expect(data.error).toContain("INVALID_QUERY_VALUES");
      expect(data.message).toContain("Too small: expected number to be >0");
    });

    it("Rechazar fechas sin formato adecuado", async () => {
      const query: WorkdaysQuery = {
        date: "invalid-date",
        hours: "1",
      };

      const res: Response = await client.index.$get({ query });
      const data: ErrorResponse = await expectErrorResponse(res, 400);

      expect(data.error).toContain("INVALID_QUERY_VALUES");
      expect(data.message).toContain("Invalid ISO datetime");
    });

    it("Cantidad de días excesiva", async () => {
      const query: WorkdaysQuery = {
        days: "999999",
      };

      const res: Response = await client.index.$get({ query });
      const data: ErrorResponse = await expectErrorResponse(res, 400);

      expect(data.error).toContain("INVALID_QUERY_VALUES");
      expect(data.message).toContain("Maximum 2680 days allowed");
    });

    it("Cantidad de horas excesiva", async () => {
      const query: WorkdaysQuery = {
        hours: "999999",
      };

      const res: Response = await client.index.$get({ query });
      const data: ErrorResponse = await expectErrorResponse(res, 400);

      expect(data.error).toContain("INVALID_QUERY_VALUES");
      expect(data.message).toContain("Maximum 21440 hours allowed");
    });
  });
});
