import type { GiveawayWizard } from "@/lib/types/giveaway.js";
import type { ModalSubmitInteraction } from "discord.js";

export const handlePrizeModal = (
  interaction: ModalSubmitInteraction,
  wizard: GiveawayWizard,
): boolean => {
  if (interaction.customId !== "modal_prize") {
    return false;
  }

  wizard.data.prize = interaction.fields.getTextInputValue("modal_prize_input");
  wizard.pageIndex = Math.min(wizard.pages.length - 1, wizard.pageIndex + 1);
  return false;
};
