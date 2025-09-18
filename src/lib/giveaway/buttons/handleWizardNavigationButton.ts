import { addGiveaway } from "@/lib/giveaway/GiveawayScheduler.js";
import { prisma } from "@/lib/prisma.js";
import { wizards } from "@/lib/Store.js";
import type { GiveawayWizard } from "@/lib/types/giveaway.js";
import { GiveawayWizardDataValidator } from "@/lib/validators/giveaway.js";
import type {
  ButtonInteraction,
  TextChannel
} from "discord.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder
} from "discord.js";

const validateDateTime = (year: string, month: string, day: string, time: string): Date | null => {
  const [h, m] = time.split(":");
  if (!h || !m || isNaN(Number(h)) || isNaN(Number(m))) return null;

  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(h), Number(m));
  return date > new Date() ? date : null;
};
export const handleWizardNavigationButtons = async (
  interaction: ButtonInteraction,
  wizard: GiveawayWizard
): Promise<boolean> => {
  if (!wizard) {
    return false;
  }

  switch (interaction.customId) {
    case "back":
      wizard.pageIndex = Math.max(0, wizard.pageIndex - 1);
      break;
    case "next":
      wizard.pageIndex = Math.min(wizard.pages.length - 1, wizard.pageIndex + 1);
      break;
    case "cancel":
      await interaction.update({ content: "Wizard cancelled ❌", embeds: [], components: [] });
      wizards.delete(interaction.message.id);
      return true;
    case "save": {
      if (!GiveawayWizardDataValidator.safeParse(wizard.data).success) {
        await interaction.update({ content: "Please fill all fields before saving!", embeds: [], components: [] });
        return true;
      }
      const { prize, year, month, day, time } = wizard.data;
      const endTime = validateDateTime(year, month, day, time);
      if (!endTime) {
        await interaction.update({
          content: "❌ Invalid date/time or date is in the past!",
          embeds: [],
          components: [],
        });
        return true;
      }

      const channel = await interaction.guild?.channels.fetch(interaction.channelId);
      if (!channel || channel.type !== ChannelType.GuildText) {
        await interaction.update({
          content: "Invalid channel or insufficient permissions",
          embeds: [],
          components: [],
        });
        return true;
      }

      try {
        // Create giveaway and message in parallel where possible
        const giveawayEmbed = new EmbedBuilder()
          .setTitle("🎉 Giveaway!")
          .setDescription(`Prize: **${prize}**`)
          .addFields({ name: "Ends", value: `<t:${Math.floor(endTime.getTime() / 1000)}:F>` })
          .setColor("Aqua");

        const participateButton = new ButtonBuilder()
          .setCustomId(`giveaway_join_${interaction.message.id}`)
          .setLabel("🎉 Join Giveaway")
          .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(participateButton);

        // Send message and create DB entry in parallel
        const [message] = await Promise.all([
          (channel as TextChannel).send({ embeds: [giveawayEmbed], components: [row] }),
          addGiveaway({
            channelId: channel.id,
            prize,
            endTime,
            interactionId: interaction.message.id,
            subOnly: wizard.subOnly,
            messageId: null,
          }),
        ]);

        // Update with actual message ID
        await prisma.giveaway.update({
          where: { interactionId: interaction.message.id },
          data: { messageId: message.id },
        });

        // Cleanup and respond
        wizards.delete(interaction.message.id);
        await interaction.update({ content: "✅ Giveaway created successfully!", embeds: [], components: [] });
        return true;
      } catch (error) {
        console.error("Error creating giveaway:", error);
        await interaction.update({
          content: "❌ Failed to create giveaway. Please try again.",
          embeds: [],
          components: [],
        });
        return true;
      }
    }
    default:
      return false;
  }

  return false;
};
