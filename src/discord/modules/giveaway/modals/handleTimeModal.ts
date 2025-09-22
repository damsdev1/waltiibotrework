import { replyEphemeral } from "@/discord/utils.js";
import type { GiveawayWizard } from "@/lib/types/giveaway.js";
import { getUserLang } from "@/lib/utils.js";
import { MessageFlags, type ModalSubmitInteraction } from "discord.js";

export const isTimeModal = (interaction: ModalSubmitInteraction): boolean => {
  return interaction.customId === "modal_time";
};

export const handleTimeModal = async (
  interaction: ModalSubmitInteraction,
  wizard: GiveawayWizard,
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

  const chosenDate = new Date(
    Number(wizard.data.year),
    Number(wizard.data.month) - 1,
    Number(wizard.data.day),
    h,
    m,
  );

  if (chosenDate < new Date()) {
    return replyEphemeral(
      interaction,
      "giveawayWizardHandleDatePast",
      getUserLang(interaction.locale),
    );
  }

  wizard.data.time = timeVal;
  wizard.pageIndex = Math.min(wizard.pages.length - 1, wizard.pageIndex + 1);
};
