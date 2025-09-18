import { giveawayAdd } from "@/lib/giveaway/GiveawayAdd.js";
import { t } from "@/lib/locales/i18n.js";
import { prisma } from "@/lib/prisma.js";
import { getUserLang } from "@/lib/utils.js";
import type { ButtonInteraction } from "discord.js";
import { MessageFlags } from "discord.js";

export const handleGiveawayJoin = async (
  interaction: ButtonInteraction,
): Promise<boolean> => {
  if (!interaction.customId.startsWith("giveaway_join_")) {
    return false;
  }
  const userLang = getUserLang(interaction.locale);

  const interactionId = interaction.customId.replace("giveaway_join_", "");
  const giveaway = await prisma.giveaway.findUnique({
    where: { interactionId },
  });
  if (!giveaway) {
    await interaction.reply({
      content: t("giveawayNotFound", { lng: userLang }),
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  if (giveaway.ended) {
    await interaction.reply({
      content: t("giveawayAlreadyEnded", { lng: userLang }),
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  const existingEntry = await prisma.giveawayEntry.findUnique({
    where: {
      GiveawayUser: { giveawayId: giveaway.id, userId: interaction.user.id },
    },
  });
  if (existingEntry) {
    await interaction.reply({
      content: t("giveawayAlreadyEntered", { lng: userLang }),
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  return giveawayAdd(
    giveaway,
    interaction.user.id,
    interaction,
    interaction.client,
    userLang,
  ).catch(() => true);
};
