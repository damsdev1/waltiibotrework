// GiveawayScheduler.ts
import type { Giveaway, GiveawayEntry } from "@/../generated/prisma/index.js";
import { t } from "@/lib/locales/i18n.js";
import { prisma } from "@/lib/prisma.js";
import crypto from "crypto";
import { EmbedBuilder, type Client, type TextBasedChannel } from "discord.js";

const GiveawaySchedulerMap = new Map<number, NodeJS.Timeout>();
let discordClient: Client | undefined;

const secureRandom = (max: number): number => {
  const buf = crypto.randomBytes(6); // 48 bits of entropy
  const int = buf.readUIntBE(0, 6);
  return (int / 281_474_976_710_656) * max;
};

const weightedPick = (items: string[], weights: number[]): string =>
  items[
    weights.reduce(
      (acc, w, i) => {
        const r = secureRandom(acc.total + w);
        return r < w
          ? { index: i, total: acc.total + w }
          : { ...acc, total: acc.total + w };
      },
      { index: items.length - 1, total: 0 },
    ).index
  ];

/** Pick a winner ID or return null */
const processGiveawayEnd = (entries: GiveawayEntry[]): string | null => {
  if (!entries.length) return null;
  const ids = entries.map((e) => e.userId);
  const weights = entries.map((e) => e.chances || 1);
  return weightedPick(ids, weights);
};

const announceWinner = async (
  giveawayId: number,
  winner: string,
): Promise<void> => {
  const giveawayData = await prisma.giveaway.findUnique({
    where: { id: giveawayId },
  });
  if (!giveawayData?.channelId || !giveawayData?.messageId) {
    console.error(
      `Giveaway data missing channel/message for ID: ${giveawayId}`,
    );
    return;
  }

  const channel = await discordClient?.channels.fetch(giveawayData.channelId);
  if (!channel || !channel.isTextBased()) {
    console.error(
      `Channel not found or not text-based for ID: ${giveawayData.channelId}`,
    );
    return;
  }

  const message = await (channel as TextBasedChannel).messages.fetch(
    giveawayData.messageId,
  );
  if (!message) {
    console.error(`Message not found for ID: ${giveawayData.messageId}`);
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(t("giveawayAnnounceTitle"))
    .setDescription(t("giveawayAnnouncePrize", { prize: giveawayData.prize }))
    .addFields({ name: t("giveawayAnnounceWinner"), value: `<@${winner}>` })
    .setColor("Aqua");

  await message.edit({
    content: t("giveawayEndedWinnerAnnouncement", {
      winnerId: `<@${winner}>`,
      prize: giveawayData.prize,
    }),
    components: [],
    embeds: [embed],
  });
};

export const scheduleGiveaway = (giveaway: {
  id: number;
  endTime: Date;
}): void => {
  const existingTimeout = GiveawaySchedulerMap.get(giveaway.id);
  if (existingTimeout) clearTimeout(existingTimeout);

  const delay = Math.max(giveaway.endTime.getTime() - Date.now(), 0);

  const timeout = setTimeout(async () => {
    const entries = await prisma.giveawayEntry.findMany({
      where: { giveawayId: giveaway.id },
    });
    const winner = processGiveawayEnd(entries);

    if (winner && discordClient?.isReady()) {
      try {
        await announceWinner(giveaway.id, winner);
      } catch (err) {
        console.error(`Error announcing giveaway ${giveaway.id}`, err);
      }
    }

    await prisma.giveaway.update({
      where: { id: giveaway.id },
      data: { ended: true },
    });
    GiveawaySchedulerMap.delete(giveaway.id);
  }, delay);

  GiveawaySchedulerMap.set(giveaway.id, timeout);
};

export const initializeGiveawayScheduler = async (
  client: Client,
): Promise<void> => {
  discordClient = client;
  const giveaways = await prisma.giveaway.findMany({ where: { ended: false } });
  giveaways.forEach(scheduleGiveaway);
};

export const addGiveaway = async (
  data: Omit<
    Giveaway,
    "id" | "ended" | "createdAt" | "updatedAt" | "winnerUserId"
  >,
): Promise<Giveaway> => {
  const newGiveaway = await prisma.giveaway.create({
    data: { ...data, ended: false },
  });
  scheduleGiveaway(newGiveaway);
  return newGiveaway;
};

export const cancelGiveaway = async (id: number): Promise<void> => {
  const timeout = GiveawaySchedulerMap.get(id);
  if (timeout) clearTimeout(timeout);
  GiveawaySchedulerMap.delete(id);
  await prisma.giveaway.update({ where: { id }, data: { ended: true } });
};
