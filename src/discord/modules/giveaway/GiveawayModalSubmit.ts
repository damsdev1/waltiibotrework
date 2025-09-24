import { handleDayModal, isDayModal } from "@/discord/modules/giveaway/modals/handleDayModal.js";
import { handlePrizeModal, isPrizeModal } from "@/discord/modules/giveaway/modals/handlePrizeModal.js";
import { handleTimeModal, isTimeModal } from "@/discord/modules/giveaway/modals/handleTimeModal.js";
import { wizards } from "@/lib/Store.js";
import { getUserLang } from "@/lib/utils.js";
import type { Interaction } from "discord.js";

export const handleModalSubmit = async (interaction: Interaction): Promise<void> => {
  if (!interaction.isModalSubmit()) {
    return;
  }
  const messageId = interaction.message?.id;
  if (!messageId) {
    return;
  }
  const wizard = wizards.get(messageId);
  if (!wizard || wizard.userId !== interaction.user.id) {
    return;
  }
  const userLang = getUserLang(interaction.locale);

  // ✅ Handle each modal
  switch (true) {
    case isPrizeModal(interaction):
      await handlePrizeModal(interaction, wizard, userLang);
      break;
    case isDayModal(interaction):
      await handleDayModal(interaction, wizard, userLang);
      break;
    case isTimeModal(interaction):
      await handleTimeModal(interaction, wizard, userLang);
      break;
    default:
      return; // unknown modal type
  }
};
