import { cancelGiveawayMessageUpdate } from "@/discord/modules/giveaway/GiveawayMessageUpdaterScheduler.js";
import {
  addGiveaway,
  cancelGiveawayScheduler,
  scheduleGiveaway,
} from "@/discord/modules/giveaway/GiveawayScheduler.js";
import {
  createGiveawayEmbed,
  createGiveawayEmbedFinished,
  WIZARD_NAV_IDS,
  wizardEmbedContent,
} from "@/discord/modules/giveaway/GiveawayUtils.js";
import { t } from "@/lib/locales/i18n.js";
import { prisma } from "@/lib/prisma.js";
import { wizards } from "@/lib/Store.js";
import type { GiveawayWizard } from "@/lib/types/giveaway.js";
import { getUserLang } from "@/lib/utils.js";
import {
  buildWizardDate,
  GiveawayWizardDataValidator,
} from "@/lib/validators/giveaway.js";
import type { ButtonInteraction } from "discord.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} from "discord.js";

export const isWizardNavigationButton = (
  interaction: ButtonInteraction,
  wizard: GiveawayWizard,
): boolean => {
  return (
    !!wizard &&
    WIZARD_NAV_IDS.includes(
      interaction.customId as (typeof WIZARD_NAV_IDS)[number],
    )
  );
};

export const handleWizardNavigationButtons = async (
  interaction: ButtonInteraction,
  wizard: GiveawayWizard,
): Promise<void> => {
  const userLang = getUserLang(interaction.locale);
  switch (interaction.customId) {
    case "back":
      wizard.pageIndex = Math.max(0, wizard.pageIndex - 1);
      await interaction.update(wizardEmbedContent(userLang, wizard));
      return;
    case "next":
      wizard.pageIndex = Math.min(
        wizard.pages.length - 1,
        wizard.pageIndex + 1,
      );
      console.log(wizard);
      await interaction.update(wizardEmbedContent(userLang, wizard));
      return;
    case "cancel":
      wizards.delete(interaction.message.id);
      await interaction.update({
        content: t("giveawayWizardCancelled", { lng: userLang }),
        embeds: [],
        components: [],
      });
      return;
    case "save": {
      if (!GiveawayWizardDataValidator.safeParse(wizard.data).success) {
        await interaction.update({
          content: t("giveawayWizardMissingData", { lng: userLang }),
          embeds: [],
          components: [],
        });
        return;
      }
      const { prize, year, month, day, time } = wizard.data;
      if (!prize || !year || !month || !day || !time) {
        await interaction.update({
          content: t("giveawayWizardMissingData", { lng: userLang }),
          embeds: [],
          components: [],
        });
        return;
      }
      // Use shared builder and ensure endTime is in the future
      const endTime = buildWizardDate(year, month, day, time);
      if (!endTime || endTime <= new Date()) {
        await interaction.update({
          content: t("giveawayWizardInvalidDate", { lng: userLang }),
          embeds: [],
          components: [],
        });
        return;
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
        return;
      }

      try {
        if (wizard.update) {
          if (!wizard.giveawayId) {
            return;
          }
          const entriesNumber = await prisma.giveawayEntry.count({
            where: { giveawayId: wizard.giveawayId },
          });
          const rows = [];
          let embed;
          let ended = false;
          const giveawayOrignal = await prisma.giveaway.findFirst({
            where: { id: wizard.giveawayId },
            select: {
              winnerUserId: true,
              interactionId: true,
              messageId: true,
            },
          });
          if (endTime <= new Date()) {
            ended = true;
            embed = createGiveawayEmbedFinished(
              prize,
              entriesNumber,
              giveawayOrignal?.winnerUserId
                ? [giveawayOrignal.winnerUserId]
                : [],
              endTime,
            );
          } else {
            embed = createGiveawayEmbed(prize, entriesNumber, endTime);
            const participateButton = new ButtonBuilder()
              .setCustomId(`giveaway_join_${giveawayOrignal?.interactionId}`)
              .setLabel(t("giveawayAnnounceJoinButton"))
              .setStyle(ButtonStyle.Primary);

            rows.push(
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                participateButton,
              ),
            );
          }
          const message = giveawayOrignal?.messageId
            ? await channel.messages
                .fetch(giveawayOrignal.messageId)
                .catch(() => null)
            : null;
          console.log(message);
          if (!message) {
            const messageSend = await channel
              .send({
                embeds: [embed],
                components: rows.map((r) => r.toJSON()),
              })
              .catch(() => null);
            if (messageSend) {
              await prisma.giveaway.update({
                where: { id: wizard.giveawayId },
                data: {
                  prize,
                  channelId: channel.id,
                  messageId: messageSend.id,
                  ended,
                  endTime,
                  subOnly: wizard.subOnly,
                },
              });
              await cancelGiveawayMessageUpdate(wizard.giveawayId);
              await cancelGiveawayScheduler(wizard.giveawayId);
              if (!ended) {
                scheduleGiveaway({ id: wizard.giveawayId, endTime });
              }
            }
            return;
          } else {
            await message.edit({
              embeds: [embed],
              components: rows.map((r) => r.toJSON()),
            });
          }
          await interaction.update({
            content: t("giveawayCreatedSuccessfully", { lng: userLang }),
            embeds: [],
            components: [],
          });
          return;
        }
        const participateButton = new ButtonBuilder()
          .setCustomId(`giveaway_join_${interaction.message.id}`)
          .setLabel(t("giveawayAnnounceJoinButton"))
          .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          participateButton,
        );

        // Send message and create DB entry in parallel
        const message = await channel.send({
          embeds: [createGiveawayEmbed(prize, 0, endTime)],
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
        return;
      } catch (error) {
        console.error("Error creating giveaway:", error);
        await interaction.update({
          content: t("giveawayWizardErrorCreating", { lng: userLang }),
          embeds: [],
          components: [],
        });
        return;
      }
    }
  }
};
