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
};

const channelValid = async (
  channel: Channel,
  interaction: ChatInputCommandInteraction,
): Promise<string | null> => {
  const userLang = getUserLang(interaction.locale);
  try {
    const channelValidated = await interaction.guild?.channels.fetch(
      channel.id,
    );
    if (!channelValidated || channelValidated.type !== ChannelType.GuildText) {
      return t("managerChannelsInvalidTextChannel", { lng: userLang });
    }
    if (!interaction.guild || !interaction.guild.members.me) {
      return t("managerChannelsNoGuildInfo", { lng: userLang });
    }
    if (
      !channelValidated
        .permissionsFor(interaction.guild?.members.me)
        ?.has(PermissionFlagsBits.SendMessages)
    ) {
      return t("managerChannelsNoSendMessagesPermission", { lng: userLang });
    }
    return null;
  } catch {
    return t("invalidChannelOrPermissions", { lng: userLang });
  }
};

const executeSubCommandChannel = async (
  channel: Channel,
  channelKey: string,
  interaction: ChatInputCommandInteraction,
  successMessage: string,
): Promise<void> => {
  const error = await channelValid(channel, interaction);
  if (error) {
    await interaction.reply({ content: error, flags: MessageFlags.Ephemeral });
    return;
  }
  await setConfig(channelKey, channel.id);
  await interaction.reply({
    content: successMessage,
    flags: MessageFlags.Ephemeral,
  });
};

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

export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const userLang = getUserLang(interaction.locale);
  if (!interaction.guild) {
    await interaction.reply({
      content: t("commandOnlyInGuild", { lng: userLang }),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand();
  const channel = interaction.options.getChannel("salon", true);
  if (channel.type !== ChannelType.GuildText) {
    await interaction.reply({
      content: t("managerChannelsInvalidTextChannel", { lng: userLang }),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  switch (subcommand) {
    case "annonce":
      await executeSubCommandChannel(
        channel as Channel,
        "announceChannel",
        interaction,
        t("managerChannelsAnnouncementChannelDefined", {
          lng: userLang,
          channel: `<#${channel.id}>`,
        }),
      );
      break;
    case "logs_join":
      await executeSubCommandChannel(
        channel as Channel,
        "logsJoinChannel",
        interaction,
        t("managerChannelsLogsJoinChannelDefined", {
          lng: userLang,
          channel: `<#${channel.id}>`,
        }),
      );
      break;
    case "logs_leave":
      await executeSubCommandChannel(
        channel as Channel,
        "logsLeaveChannel",
        interaction,
        t("managerChannelsLogsLeaveChannelDefined", {
          lng: userLang,
          channel: `<#${channel.id}>`,
        }),
      );
      break;
    case "logs_verification":
      await executeSubCommandChannel(
        channel as Channel,
        "logsVerificationChannel",
        interaction,
        t("managerChannelsLogsVerificationChannelDefined", {
          lng: userLang,
          channel: `<#${channel.id}>`,
        }),
      );
      break;
    default:
      await interaction.reply({
        content: t("unknownSubcommand", { lng: userLang }),
        flags: MessageFlags.Ephemeral,
      });
      break;
  }
}
