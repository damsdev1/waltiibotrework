import type { TranslationKeys } from "@/lib/types/i18n.js";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration.js";
import relativeTime from "dayjs/plugin/relativeTime.js";
import type {
  CommandInteraction,
  MessageComponentInteraction,
  ModalSubmitInteraction,
} from "discord.js";
import { MessageFlags } from "discord.js";
import { t } from "i18next";

dayjs.extend(duration);
dayjs.extend(relativeTime);
dayjs.locale("fr");

export const formatTimeJoinLeaveMessage = (startDate: Date): string => {
  const start = dayjs(startDate);
  const end = dayjs();
  const diff = dayjs.duration(end.diff(start));
  return `${diff.years()} ans, ${diff.months()} mois, ${diff.days()} jours, ${diff.hours()} heures, ${diff.minutes()} minutes et ${diff.seconds()} secondes`;
};
export async function replyEphemeral(
  interaction:
    | CommandInteraction
    | MessageComponentInteraction
    | ModalSubmitInteraction,
  messageKey: TranslationKeys,
  lng: string = "fr",
  variables?: Record<string, unknown>,
): Promise<void> {
  await interaction.reply({
    content: t(messageKey, { lng, ...variables }),
    flags: MessageFlags.Ephemeral,
  });
}
