import { getDiscordClient } from "@/discord/modules/DiscordClientExporter.js";
import { createGiveawayEmbed } from "@/discord/modules/giveaway/GiveawayUtils.js";
import { prisma } from "@/lib/prisma.js";

type EmptyTimeout = { type: "check"; endDate: Date; timeout: NodeJS.Timeout };
type NormalTimeout = { type: "normal"; endDate: Date; timeout: NodeJS.Timeout };
const giveawayMessageUpdaterMap = new Map<
  number,
  EmptyTimeout | NormalTimeout
>();

const giveawayUpdate = async (giveawayId: number): Promise<void> => {
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
            giveaway.winnerCount,
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
};

// randomTimeout between 1 and 5 minutes for preventing too many updates at same time if users abuse many giveaways
const randomTimeout = (): number =>
  Math.floor(Math.random() * (5 * 60 * 1000 - 1 * 60 * 1000 + 1)) +
  1 * 60 * 1000;
export const requestGiveawayMessageUpdate = async (
  giveawayId: number,
): Promise<void> => {
  if (giveawayMessageUpdaterMap.has(giveawayId)) {
    const existing = giveawayMessageUpdaterMap.get(giveawayId);
    if (existing?.type === "check") {
      const date = existing.endDate;
      const remaining = date.getTime() - Date.now();
      if (remaining > 0) {
        console.log(
          "Extending existing check timeout for giveaway",
          giveawayId,
          "by",
          remaining,
          "ms",
        );
        giveawayMessageUpdaterMap.delete(giveawayId);
        giveawayMessageUpdaterMap.set(giveawayId, {
          type: "normal",
          endDate: new Date(Date.now() + remaining),
          timeout: setTimeout(async () => {
            giveawayMessageUpdaterMap.delete(giveawayId);
            await giveawayUpdate(giveawayId);
          }, remaining),
        });
      } else {
        // If time passed, clear and set a normal timeout
        clearTimeout(existing.timeout);
        giveawayMessageUpdaterMap.delete(giveawayId);
      }
    }
    return;
  } else {
    await giveawayUpdate(giveawayId);
    const timeout = randomTimeout();
    const endDate = new Date(Date.now() + timeout);
    giveawayMessageUpdaterMap.set(giveawayId, {
      type: "check",
      endDate,
      timeout: setTimeout(() => {
        giveawayMessageUpdaterMap.delete(giveawayId);
      }, timeout),
    });
  }
  // giveawayMessageUpdaterMap.set(
  //   giveawayId,
  //   setTimeout(async () => {
  //     giveawayMessageUpdaterMap.delete(giveawayId);
  //     await giveawayUpdate(giveawayId);
  //   }, randomTimeout())
  // );
};
export const cancelGiveawayMessageUpdate = (giveawayId: number): void => {
  const timeoutObj = giveawayMessageUpdaterMap.get(giveawayId);
  if (timeoutObj) {
    clearTimeout(timeoutObj.timeout);
  }
  giveawayMessageUpdaterMap.delete(giveawayId);
};
