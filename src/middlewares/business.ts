import { createMiddleware } from "hono/factory";
import { z } from "zod";
import { transformEmptyToUndefined } from "@/lib/utils/transformers";
import type { MiddlewareHandler } from "hono";

export const BusinessSchema = z
  .object({
    defaultTz: z.preprocess(
      transformEmptyToUndefined,
      z.string().nonempty().default("America/Bogota")
    ),
    startHour: z.preprocess(
      transformEmptyToUndefined,
      z.coerce.number().int().min(0).max(23).default(8)
    ),
    startBreak: z.preprocess(
      transformEmptyToUndefined,
      z.coerce.number().int().min(0).max(23).default(12)
    ),
    finalBreak: z.preprocess(
      transformEmptyToUndefined,
      z.coerce.number().int().min(0).max(23).default(13)
    ),
    finalHour: z.preprocess(
      transformEmptyToUndefined,
      z.coerce.number().int().min(0).max(23).default(17)
    ),
  })
  .refine(
    ({ startHour, startBreak, finalBreak, finalHour }) => {
      const startOk = startHour < startBreak;
      const restOk = startBreak < finalBreak;
      const finalOk = finalBreak < finalHour;

      return startOk && restOk && finalOk;
    },
    { message: "Inconsistent schedule (startHour < startBreak < finalBreak < finalHour)" }
  );

export type BusinessConfig = z.infer<typeof BusinessSchema>;

export type BusinessContext = {
  Variables: { business: BusinessConfig };
};

const config: BusinessConfig = BusinessSchema.parse({
  defaultTz: process.env.BIZ_DEFAULT_TZ,
  startHour: process.env.BIZ_START_HOUR,
  startBreak: process.env.BIZ_START_BREAK,
  finalBreak: process.env.BIZ_FINAL_BREAK,
  finalHour: process.env.BIZ_FINAL_HOUR,
});

export const withBusinessConfig: MiddlewareHandler<BusinessContext> =
  createMiddleware<BusinessContext>(async (c, next) => {
    c.set("business", config);
    await next();
  });
