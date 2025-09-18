import { wizards } from "@/lib/Store.js";
import {
  generatePageComponents,
  generateWizardEmbed,
} from "@/lib/giveaway/GiveawayUtils.js";
import { handleDayModal } from "@/lib/giveaway/modals/handleDayModal.js";
import { handlePrizeModal } from "@/lib/giveaway/modals/handlePrizeModal.js";
import { handleTimeModal } from "@/lib/giveaway/modals/handleTimeModal.js";
import { t } from "@/lib/locales/i18n.js";
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
  const userLang = getUserLang(interaction.locale);

  // ✅ Handle each modal
  if (handlePrizeModal(interaction, wizard)) {
    return;
  }
  if (await handleDayModal(interaction, wizard)) {
    return;
  }
  if (await handleTimeModal(interaction, wizard)) {
    return;
  }
  // ✅ Update the wizard message
  await interaction.deferUpdate();
  await interaction.editReply({
    content: t("giveawaySetup", { lng: userLang }),
    embeds: [generateWizardEmbed(wizard, userLang)],
    components: generatePageComponents(wizard, userLang).map((row) =>
      row.toJSON(),
    ),
  });
};
