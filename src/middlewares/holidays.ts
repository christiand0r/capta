// src/routes/workdays/middlewares.ts
import { createMiddleware } from "hono/factory";
import { HolidayProvider } from "@/providers/Holidays";
import type { MiddlewareHandler } from "hono";

export type HolidaysContext = {
  Variables: { holidays: HolidayProvider };
};

// Singleton
const service = new HolidayProvider(
  "https://content.capta.co/Recruitment/WorkingDays.json"
);

export const withHolidays: MiddlewareHandler<HolidaysContext> =
  createMiddleware<HolidaysContext>(async (c, next) => {
    c.set("holidays", service);
    await next();
  });
