import { wizardEmbedContent } from "@/discord/modules/giveaway/GiveawayUtils.js";
import { replyEphemeral } from "@/discord/utils.js";
import type { GiveawayWizard } from "@/lib/types/giveaway.js";
import { getUserLang } from "@/lib/utils.js";
import { MessageFlags, type ModalSubmitInteraction } from "discord.js";

export const isDayModal = (interaction: ModalSubmitInteraction): boolean => {
  return interaction.customId === "modal_day";
};

export const handleDayModal = async (
  interaction: ModalSubmitInteraction,
  wizard: GiveawayWizard,
  userLang: string,
): Promise<void> => {
  const year = Number(wizard.data.year);
  const month = Number(wizard.data.month);
  const day = Number(interaction.fields.getTextInputValue("modal_day_input"));

  const totalDays = new Date(year, month, 0).getDate();
  if (isNaN(day) || day < 1 || day > totalDays) {
    //TODO: i18n
    await interaction.reply({
      content: "Jour invalide!",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const today = new Date();
  if (year === today.getFullYear() && month === today.getMonth() + 1 && day < today.getDate()) {
    return replyEphemeral(interaction, "giveawayWizardHandleDatePast", getUserLang(interaction.locale));
  }

  wizard.data.day = String(day).padStart(2, "0");
  wizard.pageIndex = Math.min(wizard.pages.length - 1, wizard.pageIndex + 1);
  await interaction.deferUpdate();
  await interaction.editReply(wizardEmbedContent(userLang, wizard));
};
