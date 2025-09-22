import { wizardEmbedContent } from "@/discord/modules/giveaway/GiveawayUtils.js";
import {
  handleGiveawayJoin,
  isGiveawayJoin,
} from "@/discord/modules/giveaway/buttons/handleGiveawayJoin.js";
import {
  handleWizardNavigationButtons,
  isWizardNavigationButton,
} from "@/discord/modules/giveaway/buttons/handleWizardNavigationButton.js";
import {
  isOpenInteractionModal,
  openInteractionModal,
} from "@/discord/modules/giveaway/buttons/openInteractionModal.js";
import { wizards } from "@/lib/Store.js";
import { getUserLang } from "@/lib/utils.js";
import type { Interaction } from "discord.js";

export const handleGiveawayButton = async (
  interaction: Interaction,
): Promise<void> => {
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
      await openInteractionModal(interaction, wizard.pages[wizard.pageIndex]);
      break;
    case isWizardNavigationButton(interaction, wizard):
      await handleWizardNavigationButtons(interaction, wizard);
      break;
    default:
      return; // unknown button type
  }

  const userLang = getUserLang(interaction.locale);
  // 4️⃣ If nothing else handled, update wizard message
  await interaction.update(wizardEmbedContent(userLang, wizard));
};
