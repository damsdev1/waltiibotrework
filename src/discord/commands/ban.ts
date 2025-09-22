import { replyEphemeral } from "@/discord/utils.js";
import { getAllLocalizedTranslations, t } from "@/lib/locales/i18n.js";
import type { TranslationKeys } from "@/lib/types/i18n.js";
import { getUserLang } from "@/lib/utils.js";
import type { ChatInputCommandInteraction, GuildMember } from "discord.js";
import {
  InteractionContextType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

const BAN_DELETE_MESSAGE_SECONDS = 604800; // 7 days

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

function canBan(target: GuildMember, executer: GuildMember): string | null {
  if (target.user.id === executer.user.id) {
    return "banYourselfError";
  }
  if (!target.bannable) {
    return "banUserBotPermissionTooHigh";
  }
  if (target.roles.highest.position >= executer.roles.highest.position) {
    return "banUserPermissionTooHigh";
  }
  return null;
}

async function tryBan(
  interaction: ChatInputCommandInteraction,
  userID: string,
  reason: string,
): Promise<void> {
  try {
    const target = await interaction.guild!.members.fetch(userID);
    const executer = await interaction.guild!.members.fetch(
      interaction.user.id,
    );

    const banErrorKey = canBan(target, executer);
    if (banErrorKey) {
      return replyEphemeral(
        interaction,
        banErrorKey as TranslationKeys,
        getUserLang(interaction.locale),
      );
    }

    await target.ban({
      reason: reason,
      deleteMessageSeconds: BAN_DELETE_MESSAGE_SECONDS,
    });
    return replyEphemeral(
      interaction,
      "successBan",
      getUserLang(interaction.locale),
      { userID, reason },
    );
  } catch {
    try {
      await interaction.guild!.members.ban(userID, {
        reason: reason,
        deleteMessageSeconds: BAN_DELETE_MESSAGE_SECONDS,
      });
      return replyEphemeral(
        interaction,
        "successBan",
        getUserLang(interaction.locale),
        { userID, reason },
      );
    } catch {
      return replyEphemeral(
        interaction,
        "errorBan",
        getUserLang(interaction.locale),
      );
    }
  }
}

export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const executerLang = getUserLang(interaction.locale);
  if (!interaction.guild || !interaction.member) {
    return replyEphemeral(interaction, "commandOnlyInGuild", executerLang);
  }
  const userID = interaction.options.getString("userid", true);
  const reason =
    interaction.options.getString("raison") || "Aucune raison fournie";

  return tryBan(interaction, userID, reason);
}
