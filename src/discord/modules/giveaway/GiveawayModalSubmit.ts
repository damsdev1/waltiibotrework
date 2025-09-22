import { wizardEmbedContent } from "@/discord/modules/giveaway/GiveawayUtils.js";
import {
  handleDayModal,
  isDayModal,
} from "@/discord/modules/giveaway/modals/handleDayModal.js";
import {
  handlePrizeModal,
  isPrizeModal,
} from "@/discord/modules/giveaway/modals/handlePrizeModal.js";
import {
  handleTimeModal,
  isTimeModal,
} from "@/discord/modules/giveaway/modals/handleTimeModal.js";
import { wizards } from "@/lib/Store.js";
import { getUserLang } from "@/lib/utils.js";
import type { Interaction } from "discord.js";

export const handleModalSubmit = async (
  interaction: Interaction,
): Promise<void> => {
  if (!interaction.isModalSubmit()) {
    return;
  }
  const wizard = wizards.get(interaction.message?.id);
  if (!wizard || wizard.userId !== interaction.user.id) {
    return;
  }
  // ✅ Handle each modal
  switch (true) {
    case isPrizeModal(interaction):
      await handlePrizeModal(interaction, wizard);
      break;
    case isDayModal(interaction):
      await handleDayModal(interaction, wizard);
      break;
    case isTimeModal(interaction):
      await handleTimeModal(interaction, wizard);
      break;
    default:
      return; // unknown modal type
  }

  const userLang = getUserLang(interaction.locale);
  // Update the wizard message
  await interaction.deferUpdate();
  await interaction.editReply(wizardEmbedContent(userLang, wizard));
};
