import { getDiscordClient } from "@/discord/modules/DiscordClientExporter.js";
import { createGiveawayEmbed } from "@/discord/modules/giveaway/GiveawayUtils.js";
import { prisma } from "@/lib/prisma.js";

const giveawayMessageUpdaterMap = new Map<number, NodeJS.Timeout>();

// randomTimeout between 1 and 5 minutes for preventing too many updates at same time if users abuse many giveaways
const randomTimeout = (): number =>
  Math.floor(Math.random() * (0.2 * 60 * 1000 - 0.1 * 60 * 1000 + 1)) +
  0.1 * 60 * 1000;
export const requestGiveawayMessageUpdate = async (
  giveawayId: number,
): Promise<void> => {
  if (giveawayMessageUpdaterMap.has(giveawayId)) {
    return;
  }
  giveawayMessageUpdaterMap.set(
    giveawayId,
    setTimeout(async () => {
      giveawayMessageUpdaterMap.delete(giveawayId);
      const giveaway = await prisma.giveaway.findFirst({
        where: { id: giveawayId },
      });
      if (!giveaway) {
        return;
      }
      const entriesNumber = await prisma.giveawayEntry.count({
        where: { giveawayId: giveaway.id },
      });
      if (!giveaway.channelId || !giveaway.messageId) {
        return;
      }
      const DiscordClient = getDiscordClient();
      if (!DiscordClient?.channels) {
        return;
      }
      const channel = await DiscordClient.channels.fetch(giveaway.channelId!);
      if (!channel || !channel.isTextBased()) {
        return;
      }
      try {
        const message = await channel.messages.fetch(giveaway.messageId);
        if (message) {
          await message.edit({
            components: message.components.map((row) => row.toJSON()),
            embeds: [
              createGiveawayEmbed(
                giveaway.prize,
                entriesNumber,
                giveaway.endTime,
              ),
            ],
          });
        }
      } catch (error) {
        console.error(
          `Failed to update giveaway message: ${giveaway.messageId}`,
          error,
        );
      }
    }, randomTimeout()),
  );
};
export const cancelGiveawayMessageUpdate = (giveawayId: number): void => {
  const timeout = giveawayMessageUpdaterMap.get(giveawayId);
  if (timeout) {
    clearTimeout(timeout);
  }
  giveawayMessageUpdaterMap.delete(giveawayId);
};
