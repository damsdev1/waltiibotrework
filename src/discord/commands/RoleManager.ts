import { setConfig } from "@/discord/ConfigManager.js";
import { getAllLocalizedTranslations, t } from "@/lib/locales/i18n.js";
import type { TranslationKeys } from "@/lib/types/i18n.js";
import type {
  ChatInputCommandInteraction,
  SlashCommandRoleOption,
  SlashCommandSubcommandBuilder,
} from "discord.js";
import {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

// Helper to create a channel-setting subcommand
const createChannelSubcommand = (
  name: string,
  description: TranslationKeys,
) => {
  return (
    subcommand: SlashCommandSubcommandBuilder,
  ): SlashCommandSubcommandBuilder =>
    subcommand
      .setName(name)
      .setDescription(t(description))
      .setDescriptionLocalizations(getAllLocalizedTranslations(description))
      .addRoleOption((option: SlashCommandRoleOption) =>
        option
          .setName("role")
          .setDescription(t("roleManagerSlashCommandRoleOption"))
          .setDescriptionLocalizations(
            getAllLocalizedTranslations("roleManagerSlashCommandRoleOption"),
          )
          .setRequired(true),
      );
};

export const data = new SlashCommandBuilder()
  .setName("roles")
  .setDescription(t("roleManagerSlashCommand"))
  .addSubcommand(
    createChannelSubcommand("notif", "roleManagerSlashCommandNotif"),
  )
  .addSubcommand(
    createChannelSubcommand("unverified", "roleManagerSlashCommandUnverified"),
  )
  .addSubcommand(
    createChannelSubcommand("subscriber", "roleManagerSlashCommandSubscriber"),
  )
  .addSubcommand(
    createChannelSubcommand("t1sub", "roleManagerSlashCommandT1Sub"),
  )
  .addSubcommand(
    createChannelSubcommand("t2sub", "roleManagerSlashCommandT2Sub"),
  )
  .addSubcommand(
    createChannelSubcommand("t3sub", "roleManagerSlashCommandT3Sub"),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({
      content: t("commandOnlyInGuild"),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand();
  const role = interaction.options.getRole("role", true);
  if (!role) {
    await interaction.reply({
      content: t("roleNotFound"),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  switch (subcommand) {
    case "notif":
      await setConfig("roleNotif", role.id);
      await interaction.reply({
        content: t("roleManagerNotifRoleDefined", { role: `<@&${role.id}>` }),
        flags: MessageFlags.Ephemeral,
      });
      break;
    case "unverified":
      await setConfig("roleUnverified", role.id);
      await interaction.reply({
        content: t("roleManagerUnverifiedRoleDefined", {
          role: `<@&${role.id}>`,
        }),
        flags: MessageFlags.Ephemeral,
      });
      break;
    case "subscriber":
      await setConfig("subscriberRoleId", role.id);
      await interaction.reply({
        content: t("roleManagerSubscriberRoleDefined", {
          role: `<@&${role.id}>`,
        }),
        flags: MessageFlags.Ephemeral,
      });
      break;
    case "t1sub":
      await setConfig("T1SubRoleId", role.id);
      await interaction.reply({
        content: t("roleManagerT1SubRoleDefined", { role: `<@&${role.id}>` }),
        flags: MessageFlags.Ephemeral,
      });
      break;
    case "t2sub":
      await setConfig("T2SubRoleId", role.id);
      await interaction.reply({
        content: t("roleManagerT2SubRoleDefined", { role: `<@&${role.id}>` }),
        flags: MessageFlags.Ephemeral,
      });
      break;
    case "t3sub":
      await setConfig("T3SubRoleId", role.id);
      await interaction.reply({
        content: t("roleManagerT3SubRoleDefined", { role: `<@&${role.id}>` }),
        flags: MessageFlags.Ephemeral,
      });
      break;
    default:
      await interaction.reply({
        content: t("unknownSubcommand"),
        flags: MessageFlags.Ephemeral,
      });
      break;
  }
}
