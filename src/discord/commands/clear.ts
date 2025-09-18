import type {
  ChatInputCommandInteraction} from "discord.js";
import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("clear")
  .setDescription("Supprime un nombre spécifié de messages dans le canal actuel")
  .addIntegerOption((option) =>
    option
      .setName("nombre")
      .setDescription("Le nombre de messages à supprimer (entre 1 et 100)")
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(100)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .setContexts(InteractionContextType.Guild);

export const execute = async (interaction: ChatInputCommandInteraction): Promise<void> => {
  if (!interaction.guild) {
    await interaction.reply({
      content: "Cette commande ne peut être utilisée que dans un serveur.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const messagesNumber = interaction.options.getInteger("nombre", true);
  if (messagesNumber < 1 || messagesNumber > 100) {
    await interaction.reply({
      content: "Le nombre de messages à supprimer doit être entre 1 et 100.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  if (interaction.channel && interaction.channel.isTextBased() && "bulkDelete" in interaction.channel) {
    await interaction.channel.bulkDelete(messagesNumber, true);
    await interaction.reply({
      content: `${messagesNumber} message${messagesNumber > 1 ? "s" : ""} ont été supprimés.`,
      flags: MessageFlags.Ephemeral,
    });
  } else {
    await interaction.reply({
      content: "Impossible de supprimer les messages dans ce salon.",
      flags: MessageFlags.Ephemeral,
    });
  }
};
