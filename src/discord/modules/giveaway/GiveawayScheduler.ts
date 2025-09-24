// GiveawayScheduler.ts
import type { Giveaway, GiveawayEntry } from "@/../generated/prisma/index.js";
import { getDiscordClient } from "@/discord/modules/DiscordClientExporter.js";
import { createGiveawayEmbedFinished } from "@/discord/modules/giveaway/GiveawayUtils.js";
import { prisma } from "@/lib/prisma.js";
import type { TranslationKeys } from "@/lib/types/i18n.js";
import crypto from "crypto";
import type { ChannelManager } from "discord.js";

const GiveawaySchedulerMap = new Map<number, NodeJS.Timeout>();

const secureRandom = (max: number): number => {
  if (max <= 0) throw new Error("max must be > 0");
  return crypto.randomInt(0, max);
};
const weightedPickMultiple = (items: string[], weights: number[], count: number): string[] => {
  if (items.length !== weights.length) {
    throw new Error("Items and weights must have the same length");
  }

  // Convert any string weights to numbers
  const poolItems = [...items];
  const poolWeights = weights.map(Number);
  const picked: string[] = [];

  for (let n = 0; n < count && poolItems.length > 0; n++) {
    const total = poolWeights.reduce((sum, w) => sum + w, 0);
    let r = secureRandom(total);

    let idx = -1;
    for (let i = 0; i < poolItems.length; i++) {
      if (r < poolWeights[i]) {
        idx = i;
        break;
      }
      r -= poolWeights[i];
    }

    if (idx === -1) idx = poolItems.length - 1;

    picked.push(poolItems[idx]);
    poolItems.splice(idx, 1);
    poolWeights.splice(idx, 1);
  }

  return picked;
};
const processGiveawayEnd = (giveawayEntries: GiveawayEntry[], count: number = 1): string[] => {
  if (giveawayEntries.length === 0) {
    return [];
  }
  const usersIds = giveawayEntries.map((e) => e.userId);
  const weights = giveawayEntries.map((e) => e.chances || 1);
  return weightedPickMultiple(usersIds, weights, count);
};

export const processWinners = async (
  giveawayId: number,
  channelManager: ChannelManager | null,
  checkEnded: boolean = true,
): Promise<TranslationKeys> => {
  try {
    const giveawayData = await prisma.giveaway.findUnique({
      where: { id: giveawayId },
    });
    console.log(checkEnded);
    if (checkEnded && giveawayData?.ended) {
      return "giveawayAlreadyEnded";
    }
    const entries = await prisma.giveawayEntry.findMany({
      where: { giveawayId },
    });
    const winners = processGiveawayEnd(entries);
    await prisma.giveaway.update({
      where: { id: giveawayId },
      data: { ended: true },
    });
    await prisma.giveawayWinner.deleteMany({
      where: { giveawayId },
    });
    await prisma.giveawayWinner.createMany({
      data: winners.map((userId) => ({
        giveawayId,
        userId,
      })),
    });
    if (!giveawayData || !giveawayData.channelId || !giveawayData.messageId) {
      console.error(`Giveaway data not found for ID: ${giveawayId} or missing channel/message ID`);
      return "giveawayNotFound";
    }
    try {
      const channel = await channelManager?.fetch(giveawayData.channelId);
      if (!channel || !channel.isTextBased()) {
        console.error(`Channel not found or not text-based for ID: ${giveawayData.channelId}`);
        return "giveawayNotFound";
      }
      const message = await channel.messages.fetch(giveawayData.messageId);
      if (!message) {
        console.error(`Message not found for ID: ${giveawayData.messageId}`);
        return "giveawayNotFound";
      }

      await message.edit({
        content: null,
        components: [],
        embeds: [createGiveawayEmbedFinished(giveawayData.prize, entries.length, winners, giveawayData.endTime)],
      });
      return "giveawayCreatedSuccessfully";
    } catch (error) {
      console.error(`Error fetching channel or message for giveaway ID: ${giveawayId}`, error);
      return "giveawayNotFound";
    }
  } catch (error) {
    console.error(`Error fetching giveaway data for ID: ${giveawayId}`, error);
    return "errorHappen";
  }
};
/**
 * Schedule a single giveaway
 */
export const scheduleGiveaway = (giveaway: { id: number; endTime: Date }): void => {
  console.log("trigger scheduleGiveaway for", giveaway.id);
  // Clear existing timeout if any
  cancelGiveawayScheduler(giveaway.id);

  const timeDiff = giveaway.endTime.getTime() - Date.now();
  console.log(timeDiff);

  const timeout = setTimeout(
    async () => {
      await processWinners(giveaway.id, getDiscordClient()?.channels ?? null);
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
  data: Omit<Giveaway, "id" | "ended" | "createdAt" | "updatedAt">,
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
      winnerCount: Number(data.winnerCount),
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
