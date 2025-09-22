import type { GiveawayEntry, Prisma } from "@/../generated/prisma/index.js";
import type { DiscordConnections } from "@/lib/validators/discord.js";

export const handleDiscordConnectionsTx = async (
  tx: Prisma.TransactionClient,
  discordUserId: string,
  connections: DiscordConnections,
  giveawayEntry: GiveawayEntry,
): Promise<void> => {
  for (const connection of connections) {
    // remove this connection for this giveaway entry from any other users
    await tx.connections.deleteMany({
      where: {
        platform: connection.type,
        platformId: connection.id,
        NOT: {
          userId: discordUserId,
        },
      },
    });
    // ensure the connection exists for the current user
    await tx.connections.upsert({
      where: {
        PlatformUser: {
          // use the named composite unique
          platform: connection.type,
          platformId: connection.id,
          giveawayEntryId: giveawayEntry.id,
        },
      },
      update: { userId: discordUserId },
      create: {
        userId: discordUserId,
        platform: connection.type,
        platformId: connection.id,
        giveawayEntryId: giveawayEntry.id,
      },
    });
  }
  const orphanedEntries = await tx.giveawayEntry.findMany({
    where: {
      connections: { none: {} }, // no connections left
    },
  });

  for (const entry of orphanedEntries) {
    await tx.giveawayEntry.delete({ where: { id: entry.id } });
  }
  // delete giveaway entry where no connections exist
};
