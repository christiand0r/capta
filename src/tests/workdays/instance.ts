import { Hono } from "hono";
import { z } from "zod";
import { format } from "@formkit/tempo";
import { validate } from "@/middlewares/schema";
import { withHolidays } from "@/middlewares/holidays";
import { withBusinessConfig, type BusinessConfig } from "@/middlewares/business";
import {
  addBusinessDays,
  addBusinessHours,
  backwardToJourney,
} from "@/lib/utils/datetime";
import { BusinessError } from "@/lib/interfaces/business";
import { HolidayError, type HolidayProvider } from "@/providers/Holidays";

export type WorkdaysContext = {
  Variables: {
    business: BusinessConfig;
    holidays: HolidayProvider;
  };
};

export const workdays = new Hono<WorkdaysContext>()
  .use("*", withBusinessConfig)
  .use("*", withHolidays)
  .get(
    "/",
    validate(
      "query",
      z
        .object({
          date: z.iso.datetime({ offset: true }).optional(),
          days: z.coerce
            .number()
            .int()
            .positive()
            .max(2_680, "Maximum 2680 days allowed")
            .optional(),
          hours: z.coerce
            .number()
            .int()
            .positive()
            .max(21_440, "Maximum 21440 hours allowed")
            .optional(),
        })
        .refine(({ days, hours }) => days || hours, {
          error: 'Must be provide almost one parameter: "days" or "hours"',
        })
    ),
    async (c) => {
      try {
        const rules = c.get("business");

        const { date, days, hours } = c.get("payload");

        const holidayProvider = c.get("holidays");

        const now = new Date();

        /**
         * `input` es la fecha base para el cálculo.
         * - Si el usuario envía `payload.date`, se usa esa fecha (en UTC con sufijo Z).
         * - Si no envía nada, se toma la fecha y hora actuales en la zona horaria de Bogotá.
         */
        let input = date
          ? date
          : format({
              date: new Date(),
              format: "YYYY-MM-DD HH:mm:ss Z",
              tz: rules.defaultTz,
            });

        const holidays = await holidayProvider.getHolidays([now.getFullYear()]);

        // Retroceder a una fecha válida si es necesario
        let currentDate = backwardToJourney(input, holidays, rules);

        if (days) {
          currentDate = addBusinessDays(currentDate, days, holidays, rules);
        }

        if (hours) {
          currentDate = addBusinessHours(currentDate, hours, holidays, rules);
        }

        return c.json({ date: currentDate.toISOString() }, 200);
      } catch (err) {
        if (err instanceof HolidayError) {
          return c.json(
            {
              error: err.code,
              message: err.message,
            },
            err.status
          );
        }

        return c.json(
          {
            error: BusinessError.INTERNAL_ERROR,
            message: "Unexpected error",
          },
          500
        );
      }
    }
  );
