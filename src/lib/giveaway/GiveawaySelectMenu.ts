import { wizards } from "@/lib/Store.js";
import { generatePageComponents, generateWizardEmbed, getMonthOptions } from "@/lib/giveaway/GiveawayUtils.js";
import type { Interaction } from "discord.js";

export const handleGiveawaySelectMenu = async (interaction: Interaction): Promise<void> => {
  if (interaction.isStringSelectMenu()) {
    const wizard = wizards.get(interaction.message.id);
    if (!wizard || wizard.userId !== interaction.user.id) {
      return;
    }

    const page = wizard.pages[wizard.pageIndex];
    wizard.data[page.key] = interaction.values[0];

    if (page.key === "year") {
      wizard.pages[2].options = getMonthOptions(interaction.values[0]);
    }
    wizard.pageIndex = Math.min(wizard.pages.length - 1, wizard.pageIndex + 1);
    await interaction.update({
      content: "Updated:",
      embeds: [generateWizardEmbed(wizard)],
      components: generatePageComponents(wizard).map((row) => row.toJSON()),
    });
  }
};
