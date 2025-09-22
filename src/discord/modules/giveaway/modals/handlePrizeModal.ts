import type { GiveawayWizard } from "@/lib/types/giveaway.js";
import type { ModalSubmitInteraction } from "discord.js";

export const isPrizeModal = (interaction: ModalSubmitInteraction): boolean => {
  return interaction.customId === "modal_prize";
};

export const handlePrizeModal = (
  interaction: ModalSubmitInteraction,
  wizard: GiveawayWizard,
): void => {
  wizard.data.prize = interaction.fields.getTextInputValue("modal_prize_input");
  wizard.pageIndex = Math.min(wizard.pages.length - 1, wizard.pageIndex + 1);
};
