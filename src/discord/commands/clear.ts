import { getAllLocalizedTranslations, t } from "@/lib/locales/i18n.js";
import { getUserLang } from "@/lib/utils.js";
import type { ChatInputCommandInteraction } from "discord.js";
import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("clear")
  .setDescription(t("clearSlashCommand"))
  .setDescriptionLocalizations(getAllLocalizedTranslations("clearSlashCommand"))
  .addIntegerOption((option) =>
    option
      .setName("nombre")
      .setDescription(t("clearSlashCommandNumber", { min: 1, max: 100 }))
      .setDescriptionLocalizations(
        getAllLocalizedTranslations("clearSlashCommandNumber", {
          min: 1,
          max: 100,
        }),
      )
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(100),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .setContexts(InteractionContextType.Guild);

export const execute = async (
  interaction: ChatInputCommandInteraction,
): Promise<void> => {
  const userLang = getUserLang(interaction.locale);
  if (!interaction.guild) {
    await interaction.reply({
      content: t("commandOnlyInGuild", { lng: userLang }),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const messagesNumber = interaction.options.getInteger("nombre", true);
  if (messagesNumber < 1 || messagesNumber > 100) {
    await interaction.reply({
      content: t("clearNumberRange", { min: 1, max: 100, lng: userLang }),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  if (
    interaction.channel &&
    interaction.channel.isTextBased() &&
    "bulkDelete" in interaction.channel
  ) {
    await interaction.channel.bulkDelete(messagesNumber, true);
    await interaction.reply({
      content: t("clearDeletedMessages", {
        count: messagesNumber,
        lng: userLang,
      }),
      flags: MessageFlags.Ephemeral,
    });
  } else {
    await interaction.reply({
      content: t("clearError", { lng: userLang }),
      flags: MessageFlags.Ephemeral,
    });
  }
};
