import type { ChatInputCommandInteraction } from "discord.js";
import { InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("ban")
  .setDescription("Bannir un utilisateur")
  .addStringOption((option) => option.setName("userid").setDescription("ID de l'utilisateur").setRequired(true))
  .addStringOption((option) => option.setName("raison").setDescription("Raison du ban").setRequired(false))
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
  .setContexts(InteractionContextType.Guild);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild || !interaction.member) {
    await interaction.reply({
      content: "Cette commande ne peut être utilisée que dans un serveur.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const userID = interaction.options.getString("userid", true);
  const reason = interaction.options.getString("raison") || "Aucune raison fournie";
  try {
    const target = await interaction.guild.members.fetch(userID);
    const executer = await interaction.guild.members.fetch(interaction.user.id);
    if (target.roles.highest.position >= executer.roles.highest.position) {
      await interaction.reply({
        content: "Vous ne pouvez pas bannir cet utilisateur.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await target.ban({ reason: reason, deleteMessageSeconds: 604800 });
    await interaction.reply({
      content: `L'utilisateur <@${userID}> a été banni. Raison : ${reason}`,
      flags: MessageFlags.Ephemeral,
    });
  } catch {
    try {
      await interaction.guild.members.ban(userID, {
        reason: reason,
        deleteMessageSeconds: 604800,
      });
      await interaction.reply({
        content: `L'utilisateur <@${userID}> a été banni. Raison : ${reason}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    } catch {
      await interaction.reply({
        content: "Une erreur est survenue lors du ban de l'utilisateur. Veuillez vérifier l'ID.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
  }
}
