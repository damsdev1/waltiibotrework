import { setConfig } from "@/discord/ConfigManager.js";
import { getAllLocalizedTranslations, t } from "@/lib/locales/i18n.js";
import type { TranslationKeys } from "@/lib/types/i18n.js";
import { getUserLang } from "@/lib/utils.js";
import type {
  Channel,
  ChatInputCommandInteraction,
  SlashCommandChannelOption,
  SlashCommandSubcommandBuilder,
} from "discord.js";
import {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

/* ------------------------- Subcommand Factory -------------------------- */
const createChannelSubcommand =
  (name: string, description: TranslationKeys) =>
  (subcommand: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder =>
    subcommand
      .setName(name)
      .setDescription(description)
      .setDescriptionLocalizations(getAllLocalizedTranslations(description))
      .addChannelOption((option: SlashCommandChannelOption) =>
        option
          .setName("salon")
          .setDescription(t("managerChannelsSlashCommandChannelOption"))
          .setDescriptionLocalizations(
            getAllLocalizedTranslations(
              "managerChannelsSlashCommandChannelOption",
            ),
          )
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true),
      );

/* ------------------------- Channel Validation -------------------------- */
async function validateChannel(
  channel: Channel,
  interaction: ChatInputCommandInteraction,
): Promise<string | null> {
  const lng = getUserLang(interaction.locale);

  try {
    const fetched = await interaction.guild?.channels.fetch(channel.id);
    if (!fetched || fetched.type !== ChannelType.GuildText) {
      return t("managerChannelsInvalidTextChannel", { lng });
    }
    if (!interaction.guild || !interaction.guild.members.me) {
      return t("managerChannelsNoGuildInfo", { lng });
    }
    const hasSendPerm = fetched
      .permissionsFor(interaction.guild.members.me)
      ?.has(PermissionFlagsBits.SendMessages);
    if (!hasSendPerm) {
      return t("managerChannelsNoSendMessagesPermission", { lng });
    }
    return null;
  } catch {
    return t("invalidChannelOrPermissions", { lng });
  }
}

/* ----------------------- Execute Channel Subcommand --------------------- */
async function executeChannelConfig(
  channel: Channel,
  key: string,
  interaction: ChatInputCommandInteraction,
  successMessage: string,
): Promise<void> {
  const error = await validateChannel(channel, interaction);
  if (error) {
    await interaction.reply({ content: error, flags: MessageFlags.Ephemeral });
    return;
  }
  await setConfig(key, channel.id);
  await interaction.reply({
    content: successMessage,
    flags: MessageFlags.Ephemeral,
  });
}

/* ---------------------------- Slash Builder ---------------------------- */
export const data = new SlashCommandBuilder()
  .setName("channels")
  .setDescription(t("managerChannelsSlashCommand"))
  .addSubcommand(
    createChannelSubcommand(
      "annonce",
      "managerChannelsSlashCommandAnnouncement",
    ),
  )
  .addSubcommand(
    createChannelSubcommand("logs_join", "managerChannelsSlashCommandLogsJoin"),
  )
  .addSubcommand(
    createChannelSubcommand(
      "logs_leave",
      "managerChannelsSlashCommandLogsLeave",
    ),
  )
  .addSubcommand(
    createChannelSubcommand(
      "logs_verification",
      "managerChannelsSlashCommandLogsVerification",
    ),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

/* ------------------------------- Execute ------------------------------- */
export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const lng = getUserLang(interaction.locale);

  if (!interaction.guild) {
    await interaction.reply({
      content: t("commandOnlyInGuild", { lng }),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const sub = interaction.options.getSubcommand();
  const channel = interaction.options.getChannel("salon", true);

  if (channel.type !== ChannelType.GuildText) {
    await interaction.reply({
      content: t("managerChannelsInvalidTextChannel", { lng }),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Map of subcommands to config keys and messages
  const configMap: Record<string, { key: string; msgKey: TranslationKeys }> = {
    annonce: {
      key: "announceChannel",
      msgKey: "managerChannelsAnnouncementChannelDefined",
    },
    logs_join: {
      key: "logsJoinChannel",
      msgKey: "managerChannelsLogsJoinChannelDefined",
    },
    logs_leave: {
      key: "logsLeaveChannel",
      msgKey: "managerChannelsLogsLeaveChannelDefined",
    },
    logs_verification: {
      key: "logsVerificationChannel",
      msgKey: "managerChannelsLogsVerificationChannelDefined",
    },
  };

  const config = configMap[sub];
  if (!config) {
    await interaction.reply({
      content: t("unknownSubcommand", { lng }),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await executeChannelConfig(
    channel as Channel,
    config.key,
    interaction,
    t(config.msgKey, { lng, channel: `<#${channel.id}>` }),
  );
}
