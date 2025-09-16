import { createMiddleware } from "hono/factory";
import { z } from "zod";
import type { MiddlewareHandler } from "hono";

type ValidationContext<T> = {
  Variables: { payload: T };
};

export function validate<S extends z.ZodObject>(
  source: "body" | "query" | "param",
  schema: S
): MiddlewareHandler<ValidationContext<z.infer<S>>> {
  return createMiddleware<ValidationContext<z.infer<S>>>(async (c, next) => {
    let data: Record<string, string> | unknown;

    switch (source) {
      case "body":
        data = (await c.req.json().catch(() => ({}))) as unknown;
        break;

      case "query":
        data = c.req.query();
        break;

      case "param":
        data = c.req.param();
        break;

      default:
        return c.json(
          {
            code: "INVALID_SOURCE_SCHEMA",
            error: "Invalid source for schema validation",
          },
          500
        );
    }

    const result = schema.safeParse(data);

    if (!result.success) {
      const error = result.error.issues[0];

      const code = `INVALID_${source}_VALUES`.toUpperCase();

      const field = error?.path?.join(".") ?? "";
      const message = error?.message ?? "Invalid input";

      return c.json({ error: code, field, message }, 400);
    }

    c.set("payload", result.data);

    await next();
  });
}
