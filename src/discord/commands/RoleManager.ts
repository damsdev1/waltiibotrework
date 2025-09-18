import { setConfig } from "@/discord/ConfigManager.js";
import type { ChatInputCommandInteraction, SlashCommandRoleOption, SlashCommandSubcommandBuilder } from "discord.js";
import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

// Helper to create a channel-setting subcommand
const createChannelSubcommand = (name: string, description: string) => {
  return (subcommand: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder =>
    subcommand
      .setName(name)
      .setDescription(description)
      .addRoleOption((option: SlashCommandRoleOption) =>
        option.setName("role").setDescription(description).setRequired(true)
      );
};

export const data = new SlashCommandBuilder()
  .setName("roles")
  .setDescription("Configuration des salons")
  .addSubcommand(createChannelSubcommand("notif", "Définir le rôle des notifications"))
  .addSubcommand(createChannelSubcommand("unverified", "Définir le rôle des non vérifiés"))
  .addSubcommand(createChannelSubcommand("subscriber", "Définir le rôle des subscribers"))
  .addSubcommand(createChannelSubcommand("t1sub", "Définir le rôle des T1 subscribers"))
  .addSubcommand(createChannelSubcommand("t2sub", "Définir le rôle des T2 subscribers"))
  .addSubcommand(createChannelSubcommand("t3sub", "Définir le rôle des T3 subscribers"))
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
  const role = interaction.options.getRole("role", true);
  if (!role) {
    await interaction.reply({
      content: "Veuillez sélectionner un rôle valide.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  switch (subcommand) {
    case "notif":
      await setConfig("roleNotif", role.id);
      await interaction.reply({
        content: `Le rôle de notification a été défini sur <@&${role.id}>.`,
        flags: MessageFlags.Ephemeral,
      });
      break;
    case "unverified":
      await setConfig("roleUnverified", role.id);
      await interaction.reply({
        content: `Le rôle des non vérifiés a été défini sur <@&${role.id}>.`,
        flags: MessageFlags.Ephemeral,
      });
      break;
    case "subscriber":
      await setConfig("subscriberRoleId", role.id);
      await interaction.reply({
        content: `Le rôle de subscriber a été défini sur <@&${role.id}>.`,
        flags: MessageFlags.Ephemeral,
      });
      break;
    case "t1sub":
      await setConfig("T1SubRoleId", role.id);
      await interaction.reply({
        content: `Le rôle de T1 subscriber a été défini sur <@&${role.id}>.`,
        flags: MessageFlags.Ephemeral,
      });
      break;
    case "t2sub":
      await setConfig("T2SubRoleId", role.id);
      await interaction.reply({
        content: `Le rôle de T2 subscriber a été défini sur <@&${role.id}>.`,
        flags: MessageFlags.Ephemeral,
      });
      break;
    case "t3sub":
      await setConfig("T3SubRoleId", role.id);
      await interaction.reply({
        content: `Le rôle de T3 subscriber a été défini sur <@&${role.id}>.`,
        flags: MessageFlags.Ephemeral,
      });
      break;
    default:
      await interaction.reply({
        content: "Sous-commande inconnue.",
        flags: MessageFlags.Ephemeral,
      });
      break;
  }
}
