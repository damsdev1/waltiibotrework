import { setConfig } from "@/discord/ConfigManager.js";
import type { ChatInputCommandInteraction, SlashCommandChannelOption, SlashCommandSubcommandBuilder } from "discord.js";
import { ChannelType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

// Helper to create a channel-setting subcommand
const createChannelSubcommand = (name: string, description: string) => {
  return (subcommand: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder =>
    subcommand
      .setName(name)
      .setDescription(description)
      .addChannelOption((option: SlashCommandChannelOption) =>
        option.setName("salon").setDescription(description).addChannelTypes(ChannelType.GuildText).setRequired(true)
      );
};

const channelValid = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  channel: any,
  interaction: ChatInputCommandInteraction
): Promise<string | null> => {
  try {
    const channelValidated = await interaction.guild?.channels.fetch(channel.id);
    if (!channelValidated || channelValidated.type !== ChannelType.GuildText) {
      return "Le salon spécifié n'est pas un salon textuel valide.";
    }
    if (!interaction.guild || !interaction.guild.members.me) {
      return "Impossible d'accéder aux informations du serveur.";
    }
    if (!channelValidated.permissionsFor(interaction.guild?.members.me)?.has(PermissionFlagsBits.SendMessages)) {
      return "Je n'ai pas les permissions suffisantes pour accéder au salon.";
    }
    return null;
  } catch {
    return "Le salon spécifié est invalide.";
  }
};

const executeSubCommandChannel = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  channel: any,
  channelKey: string,
  interaction: ChatInputCommandInteraction,
  successMessage: string
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
  .setDescription("Configuration des salons")
  .addSubcommand(createChannelSubcommand("annonce", "Définir le salon des annonces"))
  .addSubcommand(createChannelSubcommand("logs_join", "Définir le salon des logs d'arrivée"))
  .addSubcommand(createChannelSubcommand("logs_leave", "Définir le salon des logs de départ"))
  .addSubcommand(createChannelSubcommand("logs_verification", "Définir le salon des logs de vérification"))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({
      content: "Cette commande ne peut être utilisée que dans un serveur.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand();
  const channel = interaction.options.getChannel("salon", true);
  if (channel.type !== ChannelType.GuildText) {
    await interaction.reply({
      content: "Veuillez sélectionner un salon textuel valide.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  switch (subcommand) {
    case "annonce":
      await executeSubCommandChannel(
        channel,
        "announceChannel",
        interaction,
        `Le salon des annonces a été défini sur <#${channel.id}>.`
      );
      break;
    case "logs_join":
      await executeSubCommandChannel(
        channel,
        "logsJoinChannel",
        interaction,
        `Le salon des logs d'arrivée a été défini sur <#${channel.id}>.`
      );
      break;
    case "logs_leave":
      await executeSubCommandChannel(
        channel,
        "logsLeaveChannel",
        interaction,
        `Le salon des logs de départ a été défini sur <#${channel.id}>.`
      );
      break;
    case "logs_verification":
      await executeSubCommandChannel(
        channel,
        "logsVerificationChannel",
        interaction,
        `Le salon des logs de vérification a été défini sur <#${channel.id}>.`
      );
      break;
    default:
      await interaction.reply({
        content: "Sous-commande inconnue.",
        flags: MessageFlags.Ephemeral,
      });
      break;
  }
}
