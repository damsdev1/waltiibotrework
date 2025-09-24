import { setConfig } from "@/discord/ConfigManager.js";
import { replyEphemeral } from "@/discord/utils.js";
import { getAllLocalizedTranslations, t } from "@/lib/locales/i18n.js";
import type { TranslationKeys } from "@/lib/types/i18n.js";
import { getUserLang } from "@/lib/utils.js";
import type {
  Channel,
  ChatInputCommandInteraction,
  SlashCommandChannelOption,
  SlashCommandSubcommandBuilder,
} from "discord.js";
import { ChannelType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

const configMap: Record<string, { key: string; msgKey: TranslationKeys; descKey: TranslationKeys }> = {
  annonce: {
    key: "announceChannel",
    msgKey: "managerChannelsAnnouncementChannelDefined",
    descKey: "managerChannelsSlashCommandAnnouncement",
  },
  logs_join: {
    key: "logsJoinChannel",
    msgKey: "managerChannelsLogsJoinChannelDefined",
    descKey: "managerChannelsSlashCommandLogsJoin",
  },
  logs_leave: {
    key: "logsLeaveChannel",
    msgKey: "managerChannelsLogsLeaveChannelDefined",
    descKey: "managerChannelsSlashCommandLogsLeave",
  },
  logs_verification: {
    key: "logsVerificationChannel",
    msgKey: "managerChannelsLogsVerificationChannelDefined",
    descKey: "managerChannelsSlashCommandLogsVerification",
  },
};

async function validateChannel(channel: Channel, interaction: ChatInputCommandInteraction): Promise<string | null> {
  const lng = getUserLang(interaction.locale);
  try {
    const fetched = await interaction.guild?.channels.fetch(channel.id);
    if (!fetched || fetched.type !== ChannelType.GuildText) {
      return t("managerChannelsInvalidTextChannel", { lng });
    }
    if (!interaction.guild?.members.me) {
      return t("managerChannelsNoGuildInfo", { lng });
    }
    const canSend = fetched.permissionsFor(interaction.guild.members.me)?.has(PermissionFlagsBits.SendMessages);
    if (!canSend) {
      return t("managerChannelsNoSendMessagesPermission", { lng });
    }
    return null;
  } catch {
    return t("invalidChannelOrPermissions", { lng });
  }
}

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

export const data = ((): SlashCommandBuilder => {
  const builder = new SlashCommandBuilder()
    .setName("channels")
    .setDescription(t("managerChannelsSlashCommand"))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  // Dynamically add subcommands based on configMap
  for (const [name, { descKey }] of Object.entries(configMap)) {
    builder.addSubcommand((sub: SlashCommandSubcommandBuilder) =>
      sub
        .setName(name)
        .setDescription(t(descKey))
        .setDescriptionLocalizations(getAllLocalizedTranslations(descKey))
        .addChannelOption((option: SlashCommandChannelOption) =>
          option
            .setName("salon")
            .setDescription(t("managerChannelsSlashCommandChannelOption"))
            .setDescriptionLocalizations(getAllLocalizedTranslations("managerChannelsSlashCommandChannelOption"))
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        ),
    );
  }

  return builder;
})();

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const lng = getUserLang(interaction.locale);

  if (!interaction.guild) {
    return replyEphemeral(interaction, "commandOnlyInGuild", lng);
  }

  const channel = interaction.options.getChannel("salon", true);
  if (channel.type !== ChannelType.GuildText) {
    return replyEphemeral(interaction, "managerChannelsInvalidTextChannel", lng);
  }

  const sub = interaction.options.getSubcommand();
  const config = configMap[sub];
  if (!config) {
    return replyEphemeral(interaction, "unknownSubcommand", lng);
  }

  await executeChannelConfig(
    channel as Channel,
    config.key,
    interaction,
    t(config.msgKey, { lng, channelID: `<#${channel.id}>` }),
  );
}
