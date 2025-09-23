// GiveawayScheduler.ts
import type { Giveaway, GiveawayEntry } from "@/../generated/prisma/index.js";
import { getDiscordClient } from "@/discord/modules/DiscordClientExporter.js";
import { createGiveawayEmbedFinished } from "@/discord/modules/giveaway/GiveawayUtils.js";
import { t } from "@/lib/locales/i18n.js";
import { prisma } from "@/lib/prisma.js";
import type { TranslationKeys } from "@/lib/types/i18n.js";
import crypto from "crypto";
import type { ChannelManager } from "discord.js";

const GiveawaySchedulerMap = new Map<number, NodeJS.Timeout>();

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

export const processWinner = async (
  giveawayId: number,
  channelManager: ChannelManager | null,
  checkEnded: boolean = true,
): Promise<TranslationKeys> => {
  const entries = await prisma.giveawayEntry.findMany({
    where: { giveawayId },
  });
  const winner = processGiveawayEnd(entries);
  if (winner) {
    try {
      const giveawayData = await prisma.giveaway.findUnique({
        where: { id: giveawayId },
      });
      if (checkEnded && giveawayData?.ended) {
        return "giveawayAlreadyEnded";
      }
      if (!giveawayData || !giveawayData.channelId || !giveawayData.messageId) {
        console.error(
          `Giveaway data not found for ID: ${giveawayId} or missing channel/message ID`,
        );
        return "giveawayNotFound";
      }
      try {
        const channel = await channelManager?.fetch(giveawayData.channelId);
        if (!channel || !channel.isTextBased()) {
          console.error(
            `Channel not found or not text-based for ID: ${giveawayData.channelId}`,
          );
          return "giveawayNotFound";
        }
        const message = await channel.messages.fetch(giveawayData.messageId);
        if (!message) {
          console.error(`Message not found for ID: ${giveawayData.messageId}`);
          return "giveawayNotFound";
        }

        await message.edit({
          content: t("giveawayEndedWinnerAnnouncement", {
            winnerId: `<@${winner}>`,
            prize: giveawayData.prize,
          }),
          components: [],
          embeds: [
            createGiveawayEmbedFinished(
              giveawayData.prize,
              entries.length,
              [winner],
              giveawayData.endTime,
            ),
          ],
        });
      } catch (error) {
        console.error(
          `Error fetching channel or message for giveaway ID: ${giveawayId}`,
          error,
        );
        return "giveawayNotFound";
      }
    } catch (error) {
      console.error(
        `Error fetching giveaway data for ID: ${giveawayId}`,
        error,
      );
      return "errorHappen";
    }
  }
  await prisma.giveaway.update({
    where: { id: giveawayId },
    data: { winnerUserId: winner || null, ended: true },
  });
  cancelGiveawayScheduler(giveawayId);
  return "successBan";
};
/**
 * Schedule a single giveaway
 */
export const scheduleGiveaway = (giveaway: {
  id: number;
  endTime: Date;
}): void => {
  // Clear existing timeout if any
  cancelGiveawayScheduler(giveaway.id);

  const timeDiff = giveaway.endTime.getTime() - Date.now();

  const timeout = setTimeout(
    async () => {
      await processWinner(giveaway.id, getDiscordClient()?.channels ?? null);
    },
    Math.max(timeDiff, 0),
  ); // if timeDiff <= 0, triggers immediately

  GiveawaySchedulerMap.set(giveaway.id, timeout);
};

export const initializeGiveawayScheduler = async (): Promise<void> => {
  const giveaways = await prisma.giveaway.findMany({
    where: { ended: false },
  });

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
export const cancelGiveawayScheduler = async (id: number): Promise<void> => {
  const timeout = GiveawaySchedulerMap.get(id);
  if (timeout) {
    clearTimeout(timeout);
  }
  GiveawaySchedulerMap.delete(id);
};
