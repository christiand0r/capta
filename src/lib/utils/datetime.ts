import { addDay, addHour, format, tzDate } from "@formkit/tempo";
import type { BusinessConfig } from "@/middlewares/business";
import { getHoursUntilBreakOrEnd, getJourney, getTimeRulesInMinutes } from "./getters";

export const isHoliday = (date: Date, holidays: Set<string>, tz: string): boolean => {
  const formattedDate = format({ date, format: "YYYY-MM-DD", tz });
  return holidays.has(formattedDate);
};

export const isWeekend = (date: Date, tz: string): boolean => {
  const day = format({ date, format: "dddd", tz, locale: "en" });
  return day === "Sunday" || day === "Saturday";
};

export const isWorkingDay = (date: Date, holidays: Set<string>, tz: string): boolean => {
  return !isWeekend(date, tz) && !isHoliday(date, holidays, tz);
};

export const isJourney = (
  date: Date,
  holidays: Set<string>,
  rules: BusinessConfig
): boolean => {
  if (!isWorkingDay(date, holidays, rules.defaultTz)) return false;

  const hh = Number(format({ date, format: "H", tz: rules.defaultTz }));
  const mm = Number(format({ date, format: "m", tz: rules.defaultTz }));
  const minutes = hh * 60 + mm;

  const { startHour, startBreak, finalBreak, finalHour } = getTimeRulesInMinutes(rules);

  // Horario matutino: incluye inicio, incluye break
  const inStart = minutes >= startHour && minutes <= startBreak;

  // Horario vespertino: incluye reanudación, incluye final
  const inFinal = minutes >= finalBreak && minutes <= finalHour;

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

  return tzDate(`${ymd} ${hh}:${mm}:00`, tz);
};

/**
 * Aproxima una fecha hacia ATRÁS al momento laboral más cercano
 *
 * Casos de aproximación:
 * 1. Si ya está en horario laboral: no hace nada
 * 2. Si es día laboral pero fuera de horario:
 *    - Antes de startHour -> va al día anterior conservando la misma hora/minuto
 *    - Entre startBreak y finalBreak ->  va a la misma hora/minuto pero antes de startBreak
 *    - Después de finalHour -> va a la misma hora/minuto pero antes de finalHour
 * 3. Si es fin de semana o feriado: busca el día laboral anterior conservando hora/minuto
 */
export const backwardToJourney = (
  date: Date,
  holidays: Set<string>,
  rules: BusinessConfig
): Date => {
  let stamp = new Date(date);

  const { startHour, startBreak, finalBreak, finalHour } = getTimeRulesInMinutes(rules);

  const originalH = Number(format({ date: stamp, format: "H", tz: rules.defaultTz }));
  const originalM = Number(format({ date: stamp, format: "m", tz: rules.defaultTz }));
  const currentMinutes = originalH * 60 + originalM;

  // Si ya está en horario laboral válido
  if (isJourney(stamp, holidays, rules)) {
    return setLocalHM(stamp, originalH, originalM, rules.defaultTz);
  }

  // Si es un día laboral, pero fuera de horario
  if (isWorkingDay(stamp, holidays, rules.defaultTz)) {
    // Antes de startHour -> ir al día anterior inicio de jornada
    if (currentMinutes < startHour) {
      stamp = addDay(stamp, -1);

      // Buscar el día laboral anterior
      while (!isWorkingDay(stamp, holidays, rules.defaultTz)) {
        stamp = addDay(stamp, -1);
      }

      return setLocalHM(stamp, rules.startHour, 0, rules.defaultTz);
    }

    // Entre startBreak y finalBreak -> mapear a horario matutino
    if (currentMinutes > startBreak && currentMinutes < finalBreak) {
      return setLocalHM(stamp, originalH - 1, 0, rules.defaultTz);
    }

    // Después de finalHour -> mapear a horario vespertino
    if (currentMinutes > finalHour) {
      return setLocalHM(stamp, rules.startHour, 0, rules.defaultTz);
    }
  }

  // Si es fin de semana o feriado, buscar el día laboral anterior
  while (!isWorkingDay(stamp, holidays, rules.defaultTz)) {
    stamp = addDay(stamp, -1);
  }

  // Si la hora original está en rango laboral, usarla
  if (
    (currentMinutes >= startHour && currentMinutes <= startBreak) ||
    (currentMinutes >= finalBreak && currentMinutes <= finalHour)
  ) {
    return setLocalHM(stamp, originalH, originalM, rules.defaultTz);
  }

  // En cualquier otro caso, aproximar al final del día laboral
  return setLocalHM(stamp, rules.finalHour, 0, rules.defaultTz);
};

/**
 * Aproxima una fecha hacia ADELANTE al momento laboral más cercano
 *
 * Casos de aproximación:
 * 1. Si ya está en horario laboral: no hace nada
 * 2. Si es día laboral pero fuera de horario:
 *    - Antes de startHour -> va al mismo día en startHour
 *    - Entre startBreak y finalBreak ->  va a la mismo día en finalBreak
 *    - Después de finalHour -> va al siguiente día en startHour
 * 3. Si es fin de semana o feriado: busca el día laboral siguiente en startHour
 */
export const forwardToJourney = (
  date: Date,
  holidays: Set<string>,
  rules: BusinessConfig
): Date => {
  let stamp = new Date(date);

  const { startHour, startBreak, finalBreak, finalHour } = getTimeRulesInMinutes(rules);

  const originalH = Number(format({ date: stamp, format: "H", tz: rules.defaultTz }));
  const originalM = Number(format({ date: stamp, format: "m", tz: rules.defaultTz }));
  const currentMinutes = originalH * 60 + originalM;

  // Si ya está en horario laboral válido
  if (isJourney(stamp, holidays, rules)) {
    if (currentMinutes === startBreak) {
      return setLocalHM(stamp, rules.finalBreak, originalM, rules.defaultTz);
    }

    if (currentMinutes === finalHour) {
      stamp = addDay(stamp, 1);

      // Buscar siguiente día laboral
      while (!isWorkingDay(stamp, holidays, rules.defaultTz)) {
        stamp = addDay(stamp, 1);
      }

      return setLocalHM(stamp, rules.startHour, originalM, rules.defaultTz);
    }

    return setLocalHM(stamp, originalH, originalM, rules.defaultTz);
  }

  // Si es un día laboral pero fuera de horario
  if (isWorkingDay(stamp, holidays, rules.defaultTz)) {
    // Antes de startHour -> ir a startHour
    if (currentMinutes < startHour) {
      return setLocalHM(stamp, rules.startHour, originalM, rules.defaultTz);
    }

    // Entre startBreak y finalBreak -> ir a finalBreak
    if (currentMinutes > startBreak && currentMinutes < finalBreak) {
      return setLocalHM(stamp, rules.finalBreak, originalM, rules.defaultTz);
    }

    // Después de finalHour -> ir al siguiente día laboral a startHour
    if (currentMinutes > finalHour) {
      stamp = addDay(stamp, 1);

      // Buscar siguiente día laboral
      while (!isWorkingDay(stamp, holidays, rules.defaultTz)) {
        stamp = addDay(stamp, 1);
      }

      return setLocalHM(stamp, rules.startHour, originalM, rules.defaultTz);
    }
  }

  while (!isWorkingDay(stamp, holidays, rules.defaultTz)) {
    stamp = addDay(stamp, 1);
  }

  // Establecer al inicio de la jornada laboral
  return setLocalHM(stamp, rules.startHour, 0, rules.defaultTz);
};

/** Suma n días hábiles (sin sábado/domingo/feriados). */
export const addBusinessDays = (
  date: Date,
  days: number,
  holidays: Set<string>,
  rules: BusinessConfig
): Date => {
  let currentDate = new Date(date);
  let remainingDays = days;

  // Para cantidades grandes, saltar semanas completas
  if (days >= 5) {
    const fullWeeks = Math.floor(days / 5);

    currentDate = addDay(currentDate, fullWeeks * 7);

    remainingDays = days % 5;
  }

  // Completar días restantes día por día
  while (remainingDays > 0) {
    currentDate = addDay(currentDate, 1);

    if (isWorkingDay(currentDate, holidays, rules.defaultTz)) {
      remainingDays--;
    }
  }

  // Asegurar que terminamos en día laboral
  while (!isWorkingDay(currentDate, holidays, rules.defaultTz)) {
    currentDate = addDay(currentDate, 1);
  }

  return currentDate;
};

/** Suma horas hábiles respetando jornada, almuerzo y aproximación inicial hacia atrás. */
export const addBusinessHours = (
  date: Date,
  hours: number,
  holidays: Set<string>,
  rules: BusinessConfig
): Date => {
  let currentDate = new Date(date);
  let remainingHours = hours;

  const totalJourney = getJourney(rules);

  // Para cantidades grandes, convertir a días completos
  if (hours > totalJourney) {
    const fullDays = Math.floor(hours / totalJourney);

    remainingHours = hours % totalJourney;

    if (fullDays > 0) {
      currentDate = addBusinessDays(currentDate, fullDays, holidays, rules);
      currentDate = forwardToJourney(currentDate, holidays, rules);
    }
  }

  // Agregar las horas restantes
  while (remainingHours > 0) {
    // Calcular cuántas horas podemos agregar en el período actual
    const hoursUntilBreakOrEnd = getHoursUntilBreakOrEnd(currentDate, rules);

    const hoursToAddNow = Math.min(remainingHours, hoursUntilBreakOrEnd);

    // Si no hay horas disponibles en el período actual, saltar al siguiente
    if (hoursUntilBreakOrEnd === 0) {
      currentDate = forwardToJourney(currentDate, holidays, rules);
      continue;
    }

    currentDate = addHour(currentDate, hoursToAddNow);
    remainingHours -= hoursToAddNow;

    if (!isJourney(currentDate, holidays, rules)) {
      currentDate = forwardToJourney(currentDate, holidays, rules);
    }
  }

  return currentDate;
};
