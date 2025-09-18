import { wizards } from "@/lib/Store.js";
import {
  generatePageComponents,
  generateWizardEmbed,
} from "@/lib/giveaway/GiveawayUtils.js";
import { handleGiveawayJoin } from "@/lib/giveaway/buttons/handleGiveawayJoin.js";
import { handleWizardNavigationButtons } from "@/lib/giveaway/buttons/handleWizardNavigationButton.js";
import { openInteractionModal } from "@/lib/giveaway/buttons/openInteractionModal.js";
import { t } from "@/lib/locales/i18n.js";
import { getUserLang } from "@/lib/utils.js";
import type { Interaction } from "discord.js";

export const handleGiveawayButton = async (
  interaction: Interaction,
): Promise<void> => {
  if (!interaction.isButton()) {
    return;
  }

  // 1️⃣ Try giveaway join
  if (await handleGiveawayJoin(interaction)) {
    return;
  }

  const wizard = wizards.get(interaction.message?.id);
  if (!wizard || wizard.userId !== interaction.user.id) {
    return;
  }

  // 2️⃣ Show modal if relevant
  if (await openInteractionModal(interaction, wizard.pages[wizard.pageIndex])) {
    return;
  }

  // 3️⃣ Handle wizard navigation
  if (await handleWizardNavigationButtons(interaction, wizard)) {
    return;
  }

  const userLang = getUserLang(interaction.locale);
  // 4️⃣ If nothing else handled, update wizard message
  await interaction.update({
    content: t("giveawaySetup", { lng: userLang }),
    embeds: [generateWizardEmbed(wizard, userLang)],
    components: generatePageComponents(wizard, userLang).map((row) =>
      row.toJSON(),
    ),
  });
};
