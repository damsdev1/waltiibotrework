import {
  giveawayAdd,
  giveawayRemove,
} from "@/discord/modules/giveaway/GiveawayAdd.js";
import { replyEphemeral } from "@/discord/utils.js";
import {
  addUserToPending,
  AuthorizeMessageComponent,
} from "@/lib/discord/DiscordPendingAuthorizedUsers.js";
import { prisma } from "@/lib/prisma.js";
import { getUserLang } from "@/lib/utils.js";
import { MessageFlags, type ButtonInteraction } from "discord.js";
import type { Giveaway } from "../../../../../generated/prisma/index.js";

const handleAuthorize = async (
  userLang: string,
  interaction: ButtonInteraction,
  giveaway: Giveaway,
): Promise<void> => {
  const authorizeComponent = AuthorizeMessageComponent(userLang);
  await interaction.reply({
    ...authorizeComponent,
    flags: MessageFlags.Ephemeral,
    content: authorizeComponent.content ?? undefined,
    withResponse: true,
  });
  await interaction.fetchReply();
  await addUserToPending({
    userId: interaction.user.id,
    giveawayId: giveaway.interactionId,
    interaction: interaction,
    expiresAt: new Date(Date.now() + 1 * 60 * 1000), // Expires in 1 minute
  });
};

export const isGiveawayJoin = (interaction: ButtonInteraction): boolean => {
  return interaction.customId.startsWith("giveaway_join_");
};
export const handleGiveawayJoin = async (
  interaction: ButtonInteraction,
): Promise<void> => {
  const userLang = getUserLang(interaction.locale);

  const interactionId = interaction.customId.replace("giveaway_join_", "");
  const giveaway = await prisma.giveaway.findUnique({
    where: { interactionId },
  });
  if (!giveaway) {
    return replyEphemeral(interaction, "giveawayNotFound", userLang);
  }

  if (giveaway.ended) {
    return replyEphemeral(interaction, "giveawayAlreadyEnded", userLang);
  }

  const existingEntry = await prisma.giveawayEntry.findUnique({
    where: {
      GiveawayUser: { giveawayId: giveaway.id, userId: interaction.user.id },
    },
  });
  if (existingEntry) {
    try {
      await giveawayRemove(giveaway, interaction.user.id);
      return replyEphemeral(interaction, "next", userLang);
    } catch (error) {
      console.error("Error removing giveaway entry:", error);
      return replyEphemeral(interaction, "errorHappen", userLang);
    }
  }
  const response = await giveawayAdd(
    giveaway,
    interaction.user.id,
    interaction,
    interaction.client,
  );
  switch (response.type) {
    case "reply":
      return replyEphemeral(interaction, response.messageKey, userLang);
    case "authorize":
      return handleAuthorize(userLang, interaction, giveaway);
    default:
      return;
  }
};
