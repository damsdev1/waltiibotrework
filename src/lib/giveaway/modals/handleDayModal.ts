import { t } from "@/lib/locales/i18n.js";
import type { GiveawayWizard } from "@/lib/types/giveaway.js";
import { getUserLang } from "@/lib/utils.js";
import { MessageFlags, type ModalSubmitInteraction } from "discord.js";

export const handleDayModal = async (
  interaction: ModalSubmitInteraction,
  wizard: GiveawayWizard,
): Promise<boolean> => {
  if (interaction.customId !== "modal_day") {
    return false;
  }

  const year = Number(wizard.data.year);
  const month = Number(wizard.data.month);
  const day = Number(interaction.fields.getTextInputValue("modal_day_input"));

  const totalDays = new Date(year, month, 0).getDate();
  if (isNaN(day) || day < 1 || day > totalDays) {
    await interaction.reply({
      content: "Jour invalide!",
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  const today = new Date();
  if (
    year === today.getFullYear() &&
    month === today.getMonth() + 1 &&
    day < today.getDate()
  ) {
    await interaction.reply({
      content: t("giveawayWizardHandleDatePast", {
        lng: getUserLang(interaction.locale),
      }),
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  wizard.data.day = String(day).padStart(2, "0");
  wizard.pageIndex = Math.min(wizard.pages.length - 1, wizard.pageIndex + 1);
  return false;
};
