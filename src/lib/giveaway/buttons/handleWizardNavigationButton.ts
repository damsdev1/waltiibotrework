import { addGiveaway } from "@/lib/giveaway/GiveawayScheduler.js";
import { t } from "@/lib/locales/i18n.js";
import { prisma } from "@/lib/prisma.js";
import { wizards } from "@/lib/Store.js";
import type { GiveawayWizard } from "@/lib/types/giveaway.js";
import { getUserLang } from "@/lib/utils.js";
import { GiveawayWizardDataValidator } from "@/lib/validators/giveaway.js";
import type { ButtonInteraction } from "discord.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
} from "discord.js";

const validateDateTime = (
  year: string,
  month: string,
  day: string,
  time: string,
): Date | null => {
  const [h, m] = time.split(":");
  if (!h || !m || isNaN(Number(h)) || isNaN(Number(m))) return null;

  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(h),
    Number(m),
  );
  return date > new Date() ? date : null;
};
export const handleWizardNavigationButtons = async (
  interaction: ButtonInteraction,
  wizard: GiveawayWizard,
): Promise<boolean> => {
  if (!wizard) {
    return false;
  }
  const userLang = getUserLang(interaction.locale);
  switch (interaction.customId) {
    case "back":
      wizard.pageIndex = Math.max(0, wizard.pageIndex - 1);
      break;
    case "next":
      wizard.pageIndex = Math.min(
        wizard.pages.length - 1,
        wizard.pageIndex + 1,
      );
      break;
    case "cancel":
      await interaction.update({
        content: t("giveawayWizardCancelled", { lng: userLang }),
        embeds: [],
        components: [],
      });
      wizards.delete(interaction.message.id);
      return true;
    case "save": {
      if (!GiveawayWizardDataValidator.safeParse(wizard.data).success) {
        await interaction.update({
          content: t("giveawayWizardMissingData", { lng: userLang }),
          embeds: [],
          components: [],
        });
        return true;
      }
      const { prize, year, month, day, time } = wizard.data;
      const endTime = validateDateTime(year, month, day, time);
      if (!endTime) {
        await interaction.update({
          content: t("giveawayWizardInvalidDate", { lng: userLang }),
          embeds: [],
          components: [],
        });
        return true;
      }

      const channel = await interaction.guild?.channels.fetch(
        interaction.channelId,
      );
      if (!channel || channel.type !== ChannelType.GuildText) {
        await interaction.update({
          content: t("invalidChannelOrPermissions", { lng: userLang }),
          embeds: [],
          components: [],
        });
        return true;
      }

      try {
        // Create giveaway and message in parallel where possible
        const giveawayEmbed = new EmbedBuilder()
          .setTitle(t("giveawayAnnounceTitle"))
          .setDescription(t("giveawayAnnouncePrize", { prize }))
          .addFields({
            name: t("giveawayAnnounceEnds"),
            value: `<t:${Math.floor(endTime.getTime() / 1000)}:F>`,
          })
          .setColor("Aqua");

        const participateButton = new ButtonBuilder()
          .setCustomId(`giveaway_join_${interaction.message.id}`)
          .setLabel(t("giveawayAnnounceJoinButton"))
          .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          participateButton,
        );

        // Send message and create DB entry in parallel
        const message = await channel.send({
          embeds: [giveawayEmbed],
          components: [row],
        });

        await addGiveaway({
          channelId: channel.id,
          prize,
          endTime,
          interactionId: interaction.message.id,
          subOnly: wizard.subOnly,
          messageId: message.id,
        });

        // Update with actual message ID
        await prisma.giveaway.update({
          where: { interactionId: interaction.message.id },
          data: { messageId: message.id },
        });

        // Cleanup and respond
        wizards.delete(interaction.message.id);
        await interaction.update({
          content: t("giveawayCreatedSuccessfully", { lng: userLang }),
          embeds: [],
          components: [],
        });
        return true;
      } catch (error) {
        console.error("Error creating giveaway:", error);
        await interaction.update({
          content: t("giveawayWizardErrorCreating", { lng: userLang }),
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
