import z from "zod";

export const GiveawayWizardDataValidator = z.object({
  prize: z.string().min(1),
  year: z.string().regex(/^\d{4}$/, "Year must be a 4-digit number"),
  month: z.string().regex(/^(0[1-9]|1[0-2])$/, "Month must be between 01 and 12"),
  day: z.string().regex(/^(0[1-9]|[12][0-9]|3[01])$/, "Day must be between 01 and 31"),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in HH:MM format"),
});
export type GiveawayWizardData = z.infer<typeof GiveawayWizardDataValidator>;
