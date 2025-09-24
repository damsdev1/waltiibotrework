import z from "zod";

export const GiveawayWizardDataValidator = z.object({
  prize: z.string().min(1),
  // winner count between 1 and 100 string
  winnerCount: z.string().regex(/^(100|[1-9]\d?)$/, "Winner count must be between 1 and 100"),
  year: z.string().regex(/^\d{4}$/, "Year must be a 4-digit number"),
  month: z.string().regex(/^(0[1-9]|1[0-2])$/, "Month must be between 01 and 12"),
  day: z.string().regex(/^(0[1-9]|[12][0-9]|3[01])$/, "Day must be between 01 and 31"),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in HH:MM format"),
});
export type GiveawayWizardData = z.infer<typeof GiveawayWizardDataValidator>;

// Helpers to build/validate end date for a giveaway wizard
export function buildWizardDate(year: string, month: string, day: string, time: string): Date | null {
  const [hh, mm] = (time || "").split(":").map((n) => Number(n));
  const Y = Number(year);
  const M = Number(month) - 1;
  const D = Number(day);
  if (Number.isNaN(Y) || Number.isNaN(M) || Number.isNaN(D) || Number.isNaN(hh) || Number.isNaN(mm)) {
    return null;
  }
  const date = new Date(Y, M, D, hh, mm, 0, 0);
  // Basic sanity: JS Date will roll over invalids; re-check components
  if (
    date.getFullYear() !== Y ||
    date.getMonth() !== M ||
    date.getDate() !== D ||
    date.getHours() !== hh ||
    date.getMinutes() !== mm
  ) {
    return null;
  }
  return date;
}

export function getWizardEndDate(data: GiveawayWizardData): Date | null {
  return buildWizardDate(data.year, data.month, data.day, data.time);
}
