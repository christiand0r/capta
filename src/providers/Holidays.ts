import { BusinessError, type BusinessErrorCode } from "@/lib/interfaces/business";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export type HolidayCacheEntry = { at: number; data: Set<string> };

const holidayErrorMessages = {
  HOLIDAYS_FETCH_FAILED: "An error occurred while trying to fetch the holidays",
  HOLIDAYS_EMPTY_PAYLOAD: "The list of holidays is empty or invalid",
  HOLIDAYS_INVALID_YEAR_VALUE: "Invalid years",
  HOLIDAYS_INVALID_YEARS_COUNT: "At least one year is required",
  HOLIDAYS_TIMEOUT: "Timeout while fetching holidays",
} as const;

export class HolidayError extends Error {
  public readonly code: BusinessErrorCode;
  public readonly status: ContentfulStatusCode;
  public readonly cause?: unknown;

  constructor(
    code: BusinessErrorCode,
    message: string,
    status: ContentfulStatusCode = 500,
    cause?: unknown
  ) {
    super(message);
    this.name = "HolidayError";
    this.code = code;
    this.status = status;
    this.cause = cause;
  }
}

export class HolidayProvider {
  private cache: Map<string, HolidayCacheEntry> = new Map();

  constructor(
    private readonly url: string,
    private readonly staleTime: number = 24 * 60 * 60 * 1_000,
    private readonly abortTime: number = 5_000
  ) {}

  async getHolidays(years: number[]): Promise<Set<string>> {
    if (!Array.isArray(years) || years.length === 0) {
      throw new HolidayError(
        BusinessError.INVALID_PARAMETERS,
        holidayErrorMessages.HOLIDAYS_INVALID_YEARS_COUNT,
        400
      );
    }

    if (!years.every((y) => Number.isInteger(y) && y >= 1900 && y <= 3000)) {
      throw new HolidayError(
        BusinessError.INVALID_PARAMETERS,
        holidayErrorMessages.HOLIDAYS_INVALID_YEAR_VALUE,
        400
      );
    }

    const now = Date.now();
    const key = [...years].sort((a, b) => a - b).join("|");

    const hit = this.cache.get(key);

    // Si el valor ya existe en cache, devolvemos inmediatamente
    if (hit && now - hit.at < this.staleTime) return hit.data;

    const controller = new AbortController();

    // Abortar si tarda más del tiempo indicado
    const timeout = setTimeout(() => controller.abort(), this.abortTime);

    try {
      const res = await fetch(this.url, {
        method: "GET",
        signal: controller.signal,
        headers: { accept: "application/json" },
      });

      if (!res.ok) {
        throw new HolidayError(
          BusinessError.UPSTREAM_FAILURE,
          `${holidayErrorMessages.HOLIDAYS_FETCH_FAILED} [HTTP:${res.status}]`,
          503,
          res.statusText
        );
      }

      const data = (await res.json()) as unknown as string[];

      const holidays = new Set(data.filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item)));

      if (holidays.size === 0) {
        throw new HolidayError(
          BusinessError.UPSTREAM_FAILURE,
          holidayErrorMessages.HOLIDAYS_EMPTY_PAYLOAD,
          502
        );
      }

      this.cache.set(key, { at: now, data: holidays });

      return holidays;
    } catch (err) {
      if (err instanceof HolidayError) throw err;

      if (err && typeof err === "object" && (err as Error).name === "AbortError") {
        throw new HolidayError(
          BusinessError.UPSTREAM_FAILURE,
          holidayErrorMessages.HOLIDAYS_TIMEOUT,
          503,
          err
        );
      }

      throw new HolidayError(
        BusinessError.UPSTREAM_FAILURE,
        holidayErrorMessages.HOLIDAYS_FETCH_FAILED,
        503,
        err
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
