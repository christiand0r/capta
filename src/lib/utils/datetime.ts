import { addDay, addHour, format, tzDate } from "@formkit/tempo";
import type { BusinessConfig } from "@/middlewares/business";

export const isHoliday = (date: Date, holidays: Set<string>, tz: string): boolean => {
  const formattedDate = format({ date, format: "YYYY-MM-DD", tz });

  return holidays.has(formattedDate);
};

export const isWeekend = (date: Date, tz: string): boolean => {
  const day = format({ date, format: "dddd", tz, locale: "en" });

  return day === "Sunday" || day === "Saturday";
};

export const isJourney = (
  date: Date,
  holidays: Set<string>,
  rules: BusinessConfig
): boolean => {
  if (isWeekend(date, rules.defaultTz) || isHoliday(date, holidays, rules.defaultTz)) {
    return false;
  }

  const hh = Number(format({ date, format: "H", tz: rules.defaultTz }));
  const mm = Number(format({ date, format: "m", tz: rules.defaultTz }));
  const minutes = hh * 60 + mm;

  const startHour = rules.startHour * 60;
  const startBreak = rules.startBreak * 60;
  const finalBreak = rules.finalBreak * 60;
  const finalHour = rules.finalHour * 60;

  // Se incluye las 8:00am y se excluye 12:00pm
  const inStart = minutes >= startHour && minutes < startBreak;

  // Se incluye las 1:00pm y 17:00pm
  const inFinal = minutes >= finalBreak && minutes < finalHour;

  return inStart || inFinal;
};

export const setLocalHM = (
  date: Date,
  hour: number,
  minute: number,
  tz: string
): Date => {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  const ymd = format({ date, format: "YYYY-MM-DD", tz });

  return tzDate(`${ymd} ${hh}:${mm}`, tz);
};

/** Suma n días hábiles (sin sábado/domingo/feriados). */
export const addBusinessDays = (
  date: Date,
  days: number,
  holidays: Set<string>,
  rules: BusinessConfig
): Date => {
  let stamp = new Date(date);
  let remaining = days;

  const step = 1;

  while (remaining > 0) {
    stamp = addDay(stamp, step);

    if (isWeekend(stamp, rules.defaultTz) || isHoliday(stamp, holidays, rules.defaultTz))
      continue;

    remaining -= step;
  }

  return stamp;
};

/** Suma horas hábiles respetando jornada, almuerzo y aproximación inicial hacia atrás. */
export const addBusinessHours = (
  date: Date,
  hours: number,
  holidays: Set<string>,
  rules: BusinessConfig
): Date => {
  let stamp = new Date(date);
  let remaining = Math.abs(hours);

  const step = 1;
  const journeyTime =
    rules.startBreak - rules.startHour + (rules.finalHour - rules.finalBreak);

  // Ajustar la fecha inicial al día y hora laboral más cercanos.
  while (!isJourney(stamp, holidays, rules)) {
    if (
      isWeekend(stamp, rules.defaultTz) ||
      isHoliday(stamp, holidays, rules.defaultTz)
    ) {
      stamp = addDay(stamp, -1);

      continue;
    }

    // Si la fecha es un día hábil pero la hora no lo es (fuera de jornada o almuerzo)
    stamp = addHour(stamp, -1);
  }

  // Sumar bloques de días laborales completos
  if (remaining >= journeyTime) {
    const fullDays = Math.floor(remaining / journeyTime);

    remaining -= fullDays * journeyTime;

    stamp = addBusinessDays(stamp, fullDays, holidays, rules);
  }

  while (remaining > 0) {
    if (
      isWeekend(stamp, rules.defaultTz) ||
      isHoliday(stamp, holidays, rules.defaultTz)
    ) {
      stamp = addDay(stamp, 1);

      continue;
    }

    // Si la nueva hora es laboral, se descuenta del saldo
    if (isJourney(stamp, holidays, rules)) {
      remaining -= 1;
    }

    stamp = addHour(stamp, step);
  }

  // Conserva hora y minuto locales
  const hh = Number(format({ date: stamp, format: "H", tz: rules.defaultTz }));
  const mm = Number(format({ date: stamp, format: "m", tz: rules.defaultTz }));

  stamp = setLocalHM(stamp, hh, mm, rules.defaultTz);

  return stamp;
};
