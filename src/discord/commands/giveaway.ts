import { wizards } from "@/lib/Store.js";
import { generatePageComponents, generateWizardEmbed, getYearOptions } from "@/lib/giveaway/GiveawayUtils.js";
import { prisma } from '@/lib/prisma.js';
import type { GiveawayWizardPage } from '@/lib/types/giveaway.js';
import type { AutocompleteInteraction, ChatInputCommandInteraction } from "discord.js";
import { InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("giveaway")
  .setDescription("Commande giveaway")
  .addSubcommandGroup((group) =>
    group
      .setName("create")
      .setDescription("Créer un giveaway")
      .addSubcommand((subcommand) =>
        subcommand.setName("sub").setDescription("Créer un giveaway pour les subscribers uniquement")
      )
      .addSubcommand((subcommand) => subcommand.setName("all").setDescription("Créer un giveaway pour tous"))
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("delete").setDescription("Supprimer un giveaway existant (non implémenté)").addStringOption((option) =>
      option.setName("id").setDescription("ID du giveaway à supprimer").setRequired(true).setAutocomplete(true)
    ))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setContexts(InteractionContextType.Guild);

export const execute = async (interaction: ChatInputCommandInteraction): Promise<void> => {
  const subcommandGroup = interaction.options.getSubcommandGroup();
  if (subcommandGroup === "create") {
    const pages: GiveawayWizardPage[] = [
      { type: "modal", key: "prize", label: "Renseigner la récompense", modalId: "modal_prize", placeholder: "Renseigner la récompense" },
      { type: "select", key: "year", label: "Choisir l'année", options: getYearOptions() },
      { type: "select", key: "month", label: "Choisir le mois", options: [] },
      { type: "modal", key: "day", label: "Choisir le jour", modalId: "modal_day", placeholder: "Jour" },
      { type: "modal", key: "time", label: "Choisir l'heure", modalId: "modal_time", placeholder: "HH:MM" },
      { type: "save", key: "save", label: "Sauvegarder" },
    ];

    const reply = await interaction.reply({
      content: "Configuration du giveaway:",
      embeds: [generateWizardEmbed()],
      components: generatePageComponents({ pages, pageIndex: 0 }).map((row) => row.toJSON()),
      withResponse: true,
      flags: MessageFlags.Ephemeral,
    });
    wizards.set(reply.resource?.message?.id, {
      pages,
      pageIndex: 0,
      data: {},
      messageId: reply.resource?.message?.id,
      userId: interaction.user.id,
      subOnly: interaction.options.getSubcommand() === "sub",
    });
  } else {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === "delete") {
      const giveawayId = interaction.options.getString("id", true);
      const giveaway = await prisma.giveaway.findUnique({ where: { id: parseInt(giveawayId) } });
      if (!giveaway) {
        await interaction.reply({ content: "Giveaway non trouvé.", flags: MessageFlags.Ephemeral });
        return;
      }
      if (!giveaway.channelId) {
        await interaction.reply({ content: "Salon invalide ou permissions insuffisantes", flags: MessageFlags.Ephemeral });
        return;
      }
      const channel = await interaction.client.channels.fetch(giveaway.channelId);
      if (!channel || !channel.isTextBased()) {
        await interaction.reply({ content: "Salon invalide ou permissions insuffisantes", flags: MessageFlags.Ephemeral });
        return;
      }
      try {
        if (giveaway.messageId) {
          const message = await channel.messages.fetch(giveaway.messageId);
          if (message) {
            await message.delete();
          }
        }
        await prisma.giveaway.delete({ where: { id: giveaway.id } });
        await interaction.reply({ content: `Le giveaway '${giveaway.prize}' a été supprimé.`, flags: MessageFlags.Ephemeral });
      } catch {
        console.error(`Failed to delete message with ID: ${giveaway.messageId}`);
        await interaction.reply({ content: "Le giveaway a été supprimé de la base de données, mais le message n'a pas pu être supprimé.", flags: MessageFlags.Ephemeral });
      }
    } else {
      await interaction.reply("Sous-commande inconnue.");
    }
  };
}
export const autocomplete = async (interaction: AutocompleteInteraction): Promise<void> => {
  const focusedValue = interaction.options.getFocused();
  const choices = await prisma.giveaway.findMany({
    where: {
      prize: { contains: focusedValue },
    },
  });

  await interaction.respond(
    choices.map((choice) => ({
      name: String(choice.prize),
      value: String(choice.id),
    }))
  );
};
