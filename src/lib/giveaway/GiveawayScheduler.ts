// GiveawayScheduler.ts
import type { Giveaway, GiveawayEntry } from "@/../generated/prisma/index.js";
import { t } from "@/lib/locales/i18n.js";
import { prisma } from "@/lib/prisma.js";
import crypto from "crypto";
import { EmbedBuilder, type Client } from "discord.js";

const GiveawaySchedulerMap = new Map<number, NodeJS.Timeout>();
let DiscordClient: Client | undefined = undefined;

const secureRandom = (max: number): number => {
  // Generate 6 bytes (48 bits) of entropy
  const buf = crypto.randomBytes(6);
  const int = buf.readUIntBE(0, 6);
  return (int / 281474976710656) * max;
};
const weightedPick = (items: string[], weights: number[]): string => {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let r = secureRandom(total);
  for (let i = 0; i < items.length; i++) {
    if (r < weights[i]) {
      return items[i];
    }
    r -= weights[i];
  }
  // If not returned in loop, return the last item as a fallback
  return items[items.length - 1];
};
const processGiveawayEnd = (
  giveawayEntries: GiveawayEntry[],
): string | null => {
  if (giveawayEntries.length === 0) {
    return null;
  }
  const usersIds = [];
  const weights = [];
  for (const entry of giveawayEntries) {
    usersIds.push(entry.userId);
    weights.push(entry.chances || 1);
  }

  return weightedPick(usersIds, weights);
};

/**
 * Schedule a single giveaway
 */
export const scheduleGiveaway = (giveaway: {
  id: number;
  endTime: Date;
}): void => {
  // Clear existing timeout if any
  const existingTimeout = GiveawaySchedulerMap.get(giveaway.id);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  const timeDiff = giveaway.endTime.getTime() - Date.now();

  const timeout = setTimeout(
    async () => {
      const entries = await prisma.giveawayEntry.findMany({
        where: { giveawayId: giveaway.id },
      });

      const winner = processGiveawayEnd(entries);
      if (winner) {
        if (DiscordClient && DiscordClient.isReady()) {
          try {
            const giveawayData = await prisma.giveaway.findUnique({
              where: { id: giveaway.id },
            });
            if (
              !giveawayData ||
              !giveawayData.channelId ||
              !giveawayData.messageId
            ) {
              console.error(
                `Giveaway data not found for ID: ${giveaway.id} or missing channel/message ID`,
              );
              return;
            }
            const channel = await DiscordClient.channels.fetch(
              giveawayData.channelId,
            );
            if (!channel || !channel.isTextBased()) {
              console.error(
                `Channel not found or not text-based for ID: ${giveawayData.channelId}`,
              );
              return;
            }
            const message = await channel.messages.fetch(
              giveawayData.messageId,
            );
            if (!message) {
              console.error(
                `Message not found for ID: ${giveawayData.messageId}`,
              );
              return;
            }
            const giveawayEmbed = new EmbedBuilder()
              .setTitle(t("giveawayAnnounceTitle"))
              .setDescription(
                t("giveawayAnnouncePrize", { prize: giveawayData.prize }),
              )
              .addFields({
                name: t("giveawayAnnounceWinner"),
                value: `<@${winner}>`,
              })
              .setColor("Aqua");
            await message.edit({
              content: t("giveawayEndedWinnerAnnouncement", {
                winnerId: `<@${winner}>`,
                prize: giveawayData.prize,
              }),
              components: [],
              embeds: [giveawayEmbed],
            });
          } catch (error) {
            console.error(
              `Error fetching giveaway data for ID: ${giveaway.id}`,
              error,
            );
            return;
          }
        }
      }
      await prisma.giveaway.update({
        where: { id: giveaway.id },
        data: { ended: true },
      });
      GiveawaySchedulerMap.delete(giveaway.id);
    },
    Math.max(timeDiff, 0),
  ); // if timeDiff <= 0, triggers immediately

  GiveawaySchedulerMap.set(giveaway.id, timeout);
};

/**
 * Initialize scheduler on bot startup
 */
export const initializeGiveawayScheduler = async (
  client: Client,
): Promise<void> => {
  // Schedule all giveaways, including past ones
  const giveaways = await prisma.giveaway.findMany({
    where: { ended: false },
  });
  if (client) {
    DiscordClient = client;
  }

  giveaways.forEach(scheduleGiveaway);
};

/**
 * Add a new giveaway in real-time
 */
export const addGiveaway = async (
  data: Omit<
    Giveaway,
    "id" | "ended" | "createdAt" | "updatedAt" | "winnerUserId"
  >,
): Promise<Giveaway> => {
  const newGiveaway = await prisma.giveaway.create({
    data: {
      interactionId: data.interactionId,
      channelId: data.channelId,
      messageId: data.messageId,
      prize: data.prize,
      endTime: data.endTime,
      ended: false,
      subOnly: data.subOnly,
    },
  });

  scheduleGiveaway(newGiveaway);
  return newGiveaway;
};

/**
 * Cancel a scheduled giveaway
 */
export const cancelGiveaway = async (id: number): Promise<void> => {
  const timeout = GiveawaySchedulerMap.get(id);
  if (timeout) clearTimeout(timeout);
  GiveawaySchedulerMap.delete(id);

  await prisma.giveaway.update({
    where: { id },
    data: { ended: true },
  });
};
