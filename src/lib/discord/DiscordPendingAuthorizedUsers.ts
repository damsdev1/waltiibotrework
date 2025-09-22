import { giveawayAdd } from "@/discord/modules/giveaway/GiveawayAdd.js";
import { t } from "@/lib/locales/i18n.js";
import { prisma } from "@/lib/prisma.js";
import type { InteractionEditReplyOptions } from "discord.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ButtonInteraction,
  type Client,
} from "discord.js";

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

export const AuthorizeMessageComponent = (
  userLang: string | undefined,
): InteractionEditReplyOptions => {
  const authorizeButton = new ButtonBuilder()
    .setLabel("Authorize")
    .setStyle(ButtonStyle.Link)
    .setURL(
      `https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(
        process.env.REDIRECT_URI || "http://localhost:3000/oauth2",
      )}&scope=identify+connections`,
    );
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    authorizeButton,
  );
  return {
    content: t("giveawayOnlyForSubNeedAuthorizeDiscord", { lng: userLang }),
    components: [row],
    // flags: MessageFlags.Ephemeral,
    // withResponse: true,
  };
};

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
    const response = await giveawayAdd(
      giveaway,
      user.userId,
      user.interaction,
      DiscordClient,
    );
    if (response.type === "reply") {
      await user.interaction.editReply({
        content: t(response.messageKey),
        components: [],
      });
      return;
    }
    return;
  } catch (error) {
    console.error("Error validating pending user:", error);
  }
};
