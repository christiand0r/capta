import { format } from "@formkit/tempo";
import type { BusinessConfig } from "@/middlewares/business";

/**
 * Calcula los minutos laborales totales en un día
 */
export const getJourney = (rules: BusinessConfig): number => {
  const startHours = rules.startBreak - rules.startHour;
  const finalHours = rules.finalHour - rules.finalBreak;

  return startHours + finalHours;
};

export const getTimeRulesInMinutes = (
  rules: BusinessConfig
): Omit<BusinessConfig, "defaultTz"> => {
  return {
    startHour: rules.startHour * 60,
    startBreak: rules.startBreak * 60,
    finalBreak: rules.finalBreak * 60,
    finalHour: rules.finalHour * 60,
  };
};

/**
 * Calcula horas hasta el próximo break o final del día laboral
 */
export const getHoursUntilBreakOrEnd = (date: Date, rules: BusinessConfig): number => {
  const hh = Number(format({ date, format: "H", tz: rules.defaultTz }));
  const mm = Number(format({ date, format: "m", tz: rules.defaultTz }));
  const { startHour, startBreak, finalBreak, finalHour } = getTimeRulesInMinutes(rules);

  const currentMinutes = hh * 60 + mm;

  // Si estamos en horario matutino
  if (currentMinutes >= startHour && currentMinutes < startBreak) {
    const minutesUntilBreak = startBreak - currentMinutes;

    return Math.ceil(minutesUntilBreak / 60);
  }

  // Si estamos en horario vespertino
  if (currentMinutes >= finalBreak && currentMinutes < finalHour) {
    const minutesUntilEnd = finalHour - currentMinutes;

    return Math.ceil(minutesUntilEnd / 60);
  }

  return 0; // Límite exacto o fuera de horario
};
