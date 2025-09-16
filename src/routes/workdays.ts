import { Hono } from "hono";
import { z } from "zod";
import { tzDate } from "@formkit/tempo";
import { validate } from "@/middlewares/schema";
import { withHolidays } from "@/middlewares/holidays";
import { withBusinessConfig, type BusinessConfig } from "@/middlewares/business";
import { addBusinessDays, addBusinessHours } from "@/lib/utils/datetime";
import { BusinessError } from "@/lib/interfaces/business";
import { HolidayError, type HolidayProvider } from "@/providers/Holidays";

export type WorkdaysContext = {
  Variables: {
    business: BusinessConfig;
    holidays: HolidayProvider;
  };
};

export const workdays = new Hono<WorkdaysContext>();

workdays.use("*", withBusinessConfig);

workdays.use("*", withHolidays);

workdays.get(
  "/",
  validate(
    "query",
    z
      .object({
        date: z.iso.datetime({ offset: true }).optional(),
        days: z.coerce.number().int().positive().optional(),
        hours: z.coerce.number().int().positive().optional(),
      })
      .refine(({ days, hours }) => days || hours, {
        error: 'Must be provide almost one parameter: "days" or "hours"',
      })
  ),
  async (c) => {
    try {
      const rules = c.get("business");

      const { date, days, hours } = c.get("payload");

      /**
       * `currentDate` es la fecha base para el cálculo.
       * - Si el usuario envía `payload.date`, se usa esa fecha (en UTC con sufijo Z).
       * - Si no envía nada, se toma la fecha y hora actuales en la zona horaria de Bogotá.
       *   `tzDate` crea un Date que representa la hora local de Bogotá en ese momento.
       */
      let currentDate = date
        ? new Date(date)
        : tzDate(new Date(), rules.defaultTz);

      const holidayProvider = c.get("holidays");
      const holidays = await holidayProvider.getHolidays([currentDate.getFullYear()]);

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
