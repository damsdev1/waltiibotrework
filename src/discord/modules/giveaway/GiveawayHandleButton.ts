import { handleGiveawayJoin, isGiveawayJoin } from "@/discord/modules/giveaway/buttons/handleGiveawayJoin.js";
import {
  handleWizardNavigationButtons,
  isWizardNavigationButton,
} from "@/discord/modules/giveaway/buttons/handleWizardNavigationButton.js";
import {
  isOpenInteractionModal,
  openInteractionModal,
} from "@/discord/modules/giveaway/buttons/openInteractionModal.js";
import { wizards } from "@/lib/Store.js";
import type { Interaction } from "discord.js";

export const handleGiveawayButton = async (interaction: Interaction): Promise<void> => {
  if (!interaction.isButton()) {
    return;
  }

  // 1️⃣ Try giveaway join
  if (isGiveawayJoin(interaction)) {
    return handleGiveawayJoin(interaction);
  }

  const wizard = wizards.get(interaction.message?.id);
  if (!wizard || wizard.userId !== interaction.user.id) {
    return;
  }

  switch (true) {
    case isOpenInteractionModal(interaction, wizard.pages[wizard.pageIndex]):
      return openInteractionModal(interaction, wizard.pages[wizard.pageIndex]);
    case isWizardNavigationButton(interaction, wizard):
      return handleWizardNavigationButtons(interaction, wizard);
    default:
      return; // unknown button type
  }
};
