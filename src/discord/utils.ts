import type { TranslationKeys } from "@/lib/types/i18n.js";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration.js";
import relativeTime from "dayjs/plugin/relativeTime.js";
import type {
  CommandInteraction,
  MessageComponentInteraction,
  MessageCreateOptions,
  MessagePayload,
  ModalSubmitInteraction,
} from "discord.js";
import { MessageFlags } from "discord.js";
// import { t } from "i18next";
import { t } from "@/lib/locales/i18n.js";
// New imports for helper
import type { BotConfig } from "@/discord/ConfigManager.js";
import { getConfig } from "@/discord/ConfigManager.js";
import type { Guild } from "discord.js";

dayjs.extend(duration);
dayjs.extend(relativeTime);
dayjs.locale("fr");

export const formatTimeJoinLeaveMessage = (startDate: Date): string => {
  const start = dayjs(startDate);
  const end = dayjs();
  const diff = dayjs.duration(end.diff(start));
  return `${diff.years()} ans, ${diff.months()} mois, ${diff.days()} jours, ${diff.hours()} heures, ${diff.minutes()} minutes et ${diff.seconds()} secondes`;
};

// New helper: send an embed/message to a configured channel key
export async function sendEmbedToConfiguredChannel(
  guild: Guild,
  configKey: keyof BotConfig,
  payload: string | MessagePayload | MessageCreateOptions,
): Promise<void> {
  const channelId = getConfig<string>(configKey);
  if (!channelId) {
    return;
  }

  try {
    const channel = await guild.channels.fetch(String(channelId));
    if (!channel || !channel.isTextBased()) {
      console.error(
        `Configured channel for key "${String(configKey)}" is not a text channel.`,
      );
      return;
    }
    await channel.send(payload);
  } catch (error) {
    console.error(
      `Error sending message to configured channel (${String(configKey)}):`,
      error,
    );
  }
}

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
