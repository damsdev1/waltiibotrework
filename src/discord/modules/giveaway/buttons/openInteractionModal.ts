import type { GiveawayWizardPageModal } from "@/lib/types/giveaway.js";
import type { ButtonInteraction } from "discord.js";
import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";

export const isOpenInteractionModal = (interaction: ButtonInteraction, page: GiveawayWizardPageModal): boolean => {
  return !!page && page.type === "modal" && interaction.customId === page.modalId;
};

export const openInteractionModal = async (
  interaction: ButtonInteraction,
  page: GiveawayWizardPageModal,
): Promise<void> => {
  const modal = new ModalBuilder()
    .setCustomId(page.modalId!)
    .setTitle(page.label)
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(page.modalId + "_input")
          .setLabel(page.label)
          .setPlaceholder(page.placeholder || "")
          .setStyle(TextInputStyle.Short),
      ),
    );
  await interaction.showModal(modal);
};
