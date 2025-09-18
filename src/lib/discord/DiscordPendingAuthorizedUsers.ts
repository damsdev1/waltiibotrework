import { giveawayAdd } from "@/lib/giveaway/GiveawayAdd.js";
import { prisma } from "@/lib/prisma.js";
import { type ButtonInteraction, type Client } from "discord.js";

type DiscordPendingUser = {
  userId: string;
  giveawayId: string;
  interaction: ButtonInteraction;
  expiresAt: Date;
};
const DiscordPendingUsersSchedulerMap = new Map<
  DiscordPendingUser,
  NodeJS.Timeout
>();
let DiscordClient: Client | undefined = undefined;

export const initializeDiscordPendingUsersScheduler = async (
  client: Client,
): Promise<void> => {
  if (client) {
    DiscordClient = client;
  }
};

const deleteUser = (discordPendingUser: DiscordPendingUser): void => {
  clearInterval(DiscordPendingUsersSchedulerMap.get(discordPendingUser));
  DiscordPendingUsersSchedulerMap.delete(discordPendingUser);
};

export const addUserToPending = (
  discordPendingUser: DiscordPendingUser,
): void => {
  // Clear existing timeout if any
  const existingInterval =
    DiscordPendingUsersSchedulerMap.get(discordPendingUser);
  if (existingInterval) {
    clearInterval(existingInterval);
  }

  const interval = setInterval(async () => {
    if (discordPendingUser.expiresAt.getTime() <= Date.now()) {
      // Remove user from pending list
      deleteUser(discordPendingUser);
    }
  }, 1000);

  DiscordPendingUsersSchedulerMap.set(discordPendingUser, interval);
};

export const validatePendingUser = async (userId: string): Promise<void> => {
  let user = null;
  for (const pendingUser of DiscordPendingUsersSchedulerMap.keys()) {
    if (pendingUser.userId === userId) {
      user = pendingUser;
      deleteUser(pendingUser);
      break;
    }
  }
  if (
    !user ||
    !user.giveawayId ||
    !user.userId ||
    Date.now() >= user.expiresAt.getTime()
  ) {
    console.error("Invalid pending user:", user);
    return;
  }
  if (!DiscordClient || !DiscordClient.isReady()) {
    console.error("Discord client is not ready");
    return;
  }
  try {
    const giveaway = await prisma.giveaway.findUnique({
      where: { interactionId: user.giveawayId },
    });
    if (!giveaway) {
      console.error(`Giveaway not found for ID: ${user.giveawayId}`);
      return;
    }
    if (!user.interaction) {
      console.error("Pending user missing interaction");
      return;
    }
    await giveawayAdd(giveaway, user.userId, null, DiscordClient);

    await user.interaction.editReply({
      content: "You have been successfully entered into the giveaway!",
      components: [],
    });
  } catch (error) {
    console.error("Error validating pending user:", error);
  }
};
