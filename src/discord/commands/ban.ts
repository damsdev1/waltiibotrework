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
  .setName("ban")
  .setDescription(t("banSlashCommand"))
  .setDescriptionLocalizations(getAllLocalizedTranslations("banSlashCommand"))
  .addStringOption((option) =>
    option
      .setName("userid")
      .setDescription(t("banSlashCommandUserIdOption"))
      .setDescriptionLocalizations(
        getAllLocalizedTranslations("banSlashCommandUserIdOption"),
      )
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName("raison")
      .setDescription(t("banSlashCommandReason"))
      .setDescriptionLocalizations(
        getAllLocalizedTranslations("banSlashCommandReason"),
      )
      .setRequired(false),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
  .setContexts(InteractionContextType.Guild);

export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const executerLang = getUserLang(interaction.locale);
  if (!interaction.guild || !interaction.member) {
    await interaction.reply({
      content: t("commandOnlyInGuild", { lng: executerLang }),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const userID = interaction.options.getString("userid", true);
  const reason =
    interaction.options.getString("raison") || "Aucune raison fournie";
  try {
    const target = await interaction.guild.members.fetch(userID);
    const executer = await interaction.guild.members.fetch(interaction.user.id);
    if (!target) {
      await interaction.reply({
        content: t("userNotFound", { lng: executerLang }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (target.user.id === executer.user.id) {
      await interaction.reply({
        content: t("banYourselfError", { lng: executerLang }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (!target.bannable) {
      await interaction.reply({
        content: t("banUserBotPermissionTooHigh", { lng: executerLang }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (target.roles.highest.position >= executer.roles.highest.position) {
      await interaction.reply({
        content: t("banUserPermissionTooHigh", { lng: executerLang }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await target.ban({ reason: reason, deleteMessageSeconds: 604800 });
    await interaction.reply({
      content: t("successBan", { lng: executerLang, userID, reason }),
      flags: MessageFlags.Ephemeral,
    });
  } catch {
    try {
      await interaction.guild.members.ban(userID, {
        reason: reason,
        deleteMessageSeconds: 604800,
      });
      await interaction.reply({
        content: t("successBan", { lng: executerLang, userID, reason }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    } catch {
      await interaction.reply({
        content: t("errorBan", { lng: executerLang }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
  }
}
