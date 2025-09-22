import { t } from "@/lib/locales/i18n.js";
import type { TranslationKeys } from "@/lib/types/i18n.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { MessageFlags } from "discord.js";
import path from "path";
import { fileURLToPath } from "url";

export const getDirName = (meta: ImportMeta): string => {
  const __filename = fileURLToPath(meta.url);
  return path.dirname(__filename);
};

export const getUserLang = (locale: string | null | undefined): string => {
  const userLang = locale || "fr";
  return userLang;
};

export async function replyEphemeral(
  interaction: ChatInputCommandInteraction,
  messageKey: TranslationKeys,
  lng: string = "fr",
  variables?: Record<string, unknown>,
): Promise<void> {
  await interaction.reply({
    content: t(messageKey, { lng, ...variables }),
    flags: MessageFlags.Ephemeral,
  });
}
