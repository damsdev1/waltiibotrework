import type { Prisma } from "@/../generated/prisma/index.js";
import type { DiscordConnections } from "@/lib/validators/discord.js";

export const handleDiscordConnectionsTx = async (
  tx: Prisma.TransactionClient,
  discordUserId: string,
  connections: DiscordConnections,
): Promise<void> => {
  for (const connection of connections) {
    // remove this connection from any other users
    await tx.connections.deleteMany({
      where: {
        platform: connection.type,
        platformId: connection.id,
        NOT: { userId: discordUserId },
      },
    });

    // ensure the connection exists for the current user
    await tx.connections.upsert({
      where: {
        PlatformPlatformId: {
          // use the named composite unique
          platform: connection.type,
          platformId: connection.id,
        },
      },
      update: { userId: discordUserId },
      create: {
        userId: discordUserId,
        platform: connection.type,
        platformId: connection.id,
      },
    });
  }
};
