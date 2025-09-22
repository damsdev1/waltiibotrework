import { replyEphemeral } from "@/discord/utils.js";
import { getAllLocalizedTranslations, t } from "@/lib/locales/i18n.js";
import { getUserLang } from "@/lib/utils.js";
import type { ChatInputCommandInteraction } from "discord.js";
import {
  InteractionContextType,
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
  const lng = getUserLang(interaction.locale);
  if (!interaction.guild) {
    return replyEphemeral(interaction, "commandOnlyInGuild", lng);
  }

  const messagesNumber = interaction.options.getInteger("nombre", true);
  if (messagesNumber < 1 || messagesNumber > 100) {
    return replyEphemeral(interaction, "clearNumberRange", lng, {
      min: 1,
      max: 100,
    });
  }
  if (
    interaction.channel &&
    interaction.channel.isTextBased() &&
    "bulkDelete" in interaction.channel
  ) {
    await interaction.channel.bulkDelete(messagesNumber, true);
    return replyEphemeral(interaction, "clearDeletedMessages", lng, {
      count: messagesNumber,
    });
  } else {
    return replyEphemeral(interaction, "clearError", lng);
  }
};
