import { wizardEmbedContent } from "@/discord/modules/giveaway/GiveawayUtils.js";
import { wizards } from "@/lib/Store.js";
import { getUserLang } from "@/lib/utils.js";
import type { Interaction } from "discord.js";

export const getMonthOptions = (selectedYear: string): string[] => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  if (Number(selectedYear) === currentYear) {
    return Array.from({ length: 12 - currentMonth + 1 }, (_, i) => String(currentMonth + i).padStart(2, "0"));
  }
  return Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
};
const updateMonthOptions = (
  page: { key: string; index: number },
  wizard: { pages: { options?: string[] }[] },
  value: string,
): void => {
  if (page.key === "year") {
    wizard.pages[page.index + 1].options = getMonthOptions(value);
  }
};

export const handleGiveawaySelectMenu = async (interaction: Interaction): Promise<void> => {
  if (!interaction.isStringSelectMenu()) {
    return;
  }
  const wizard = wizards.get(interaction.message.id);
  if (!wizard || wizard.userId !== interaction.user.id) {
    return;
  }

  const page = wizard.pages[wizard.pageIndex];
  if (!page.key) {
    return;
  }
  (wizard.data as Record<string, unknown>)[page.key as string] = interaction.values[0];
  updateMonthOptions(
    { key: page.key, index: wizard.pageIndex },
    wizard as { pages: { options?: string[] }[] },
    interaction.values[0],
  );
  wizard.pageIndex = Math.min(wizard.pages.length - 1, wizard.pageIndex + 1);

  const userLang = getUserLang(interaction.locale);
  await interaction.update(wizardEmbedContent(userLang, wizard));
};
