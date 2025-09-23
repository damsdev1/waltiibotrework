import { wizardEmbedContent } from "@/discord/modules/giveaway/GiveawayUtils.js";
import type { GiveawayWizard } from "@/lib/types/giveaway.js";
import type { ModalSubmitInteraction } from "discord.js";

export const isPrizeModal = (interaction: ModalSubmitInteraction): boolean => {
  return interaction.customId === "modal_prize";
};

export const handlePrizeModal = async (
  interaction: ModalSubmitInteraction,
  wizard: GiveawayWizard,
  userLang: string,
): Promise<void> => {
  wizard.data.prize = interaction.fields.getTextInputValue("modal_prize_input");
  wizard.pageIndex = Math.min(wizard.pages.length - 1, wizard.pageIndex + 1);
  await interaction.deferUpdate();
  await interaction.editReply(wizardEmbedContent(userLang, wizard));
};
