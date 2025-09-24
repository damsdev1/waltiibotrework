import { wizardEmbedContent } from "@/discord/modules/giveaway/GiveawayUtils.js";
import { replyEphemeral } from "@/discord/utils.js";
import type { GiveawayWizard } from "@/lib/types/giveaway.js";
import { buildWizardDate } from "@/lib/validators/giveaway.js";
import { MessageFlags, type ModalSubmitInteraction } from "discord.js";

export const isTimeModal = (interaction: ModalSubmitInteraction): boolean => {
  return interaction.customId === "modal_time";
};

export const handleTimeModal = async (
  interaction: ModalSubmitInteraction,
  wizard: GiveawayWizard,
  userLang: string,
): Promise<void> => {
  const timeVal = interaction.fields.getTextInputValue("modal_time_input");
  const [h, m] = timeVal.split(":").map(Number);

  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    // TODO: i18n
    await interaction.reply({
      content: "Format de temps invalide HH:MM",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const chosenDate = buildWizardDate(
    String(wizard.data.year),
    String(wizard.data.month),
    String(wizard.data.day),
    timeVal,
  );

  if (!chosenDate || chosenDate < new Date()) {
    return replyEphemeral(interaction, "giveawayWizardHandleDatePast", userLang);
  }

  wizard.data.time = timeVal;
  wizard.pageIndex = Math.min(wizard.pages.length - 1, wizard.pageIndex + 1);
  await interaction.deferUpdate();
  await interaction.editReply(wizardEmbedContent(userLang, wizard));
};
