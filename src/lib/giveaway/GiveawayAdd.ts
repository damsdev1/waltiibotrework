import { getConfig } from "@/discord/ConfigManager.js";
import { getDiscordConnections } from "@/lib/discord/DiscordAPI.js";
import { handleDiscordConnectionsTx } from "@/lib/discord/discordConnectionManager.js";
import { addUserToPending } from "@/lib/discord/DiscordPendingAuthorizedUsers.js";
import { isSubscribersRolesConfigured } from "@/lib/giveaway/GiveawayUtils.js";
import { t } from "@/lib/locales/i18n.js";
import { prisma } from "@/lib/prisma.js";
import type {
  ButtonInteraction,
  Client,
  GuildMember,
  InteractionReplyOptions,
} from "discord.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from "discord.js";
import type { Giveaway, Prisma } from "../../../generated/prisma/index.js";

const addGiveawayEntryTx = async (
  tx: Prisma.TransactionClient,
  member: GuildMember,
  userId: string,
  giveaway: Giveaway,
): Promise<void> => {
  const chances = calculateGiveawayChances(member);
  await tx.giveawayEntry.create({
    data: {
      giveawayId: giveaway.id,
      userId: userId,
      chances,
    },
  });
};
const AuthorizeMessageComponent = (
  userLang: string | undefined,
): InteractionReplyOptions => {
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
    flags: MessageFlags.Ephemeral,
    withResponse: true,
  };
};

const handleAuthorize = async (
  interaction: ButtonInteraction,
  userLang: string | undefined,
  giveaway: Giveaway,
): Promise<void> => {
  try {
    await interaction.reply(AuthorizeMessageComponent(userLang));
    await interaction.fetchReply();
    await addUserToPending({
      userId: interaction.user.id,
      giveawayId: giveaway.interactionId,
      interaction: interaction,
      expiresAt: new Date(Date.now() + 1 * 60 * 1000), // Expires in 1 minute
    });
  } catch (error) {
    console.error("Error sending authorize message:", error);
  }
};

const calculateGiveawayChances = (member: GuildMember): number => {
  const T3SubRoleId = getConfig<string>("T3SubRoleId");
  const T2SubRoleId = getConfig<string>("T2SubRoleId");
  const T1SubRoleId = getConfig<string>("T1SubRoleId");

  if (T3SubRoleId && member.roles.cache.has(T3SubRoleId)) {
    return 6; // T3 subscribers get 6 chances
  }

  if (T2SubRoleId && member.roles.cache.has(T2SubRoleId)) {
    return 3; // T2 subscribers get 3 chances
  }

  if (T1SubRoleId && member.roles.cache.has(T1SubRoleId)) {
    return 1; // T1 subscribers get 1 chance
  }

  return 1; // Default: 1 chance for regular subscribers or non-subs
};

const getMember = async (
  userId: string,
  interaction: ButtonInteraction | null,
  discordClient: Client | null,
): Promise<GuildMember | null> => {
  try {
    if (interaction?.guild) {
      return await interaction.guild.members.fetch(userId);
    } else {
      if (discordClient?.isReady()) {
        // Fetch the guilds the bot is in and try to find the member
        if (!process.env.DISCORD_GUILD_ID) {
          return null;
        }
        const guilds = discordClient.guilds.cache.get(
          process.env.DISCORD_GUILD_ID,
        );
        if (!guilds) {
          return null;
        }
        return await guilds.members.fetch(userId);
      }
    }
    return null;
  } catch {
    return null;
  }
};

export const giveawayAdd = async (
  giveaway: Giveaway,
  userId: string,
  interaction: ButtonInteraction | null,
  discordClient: Client | null,
  userLang: string | undefined = undefined,
): Promise<boolean> => {
  if (giveaway.subOnly) {
    if (!interaction || (discordClient && !discordClient.isReady())) {
      return true;
    }
    try {
      const member = await getMember(userId, interaction, discordClient);
      if (!member) {
        if (interaction) {
          await interaction.reply({
            content: t("giveawaySubNotConfigured", { lng: userLang }),
            flags: MessageFlags.Ephemeral,
          });
        }
        throw new Error("Member not found");
      }

      if (!isSubscribersRolesConfigured()) {
        if (interaction) {
          await interaction.reply({
            content: t("giveawaySubNotConfigured", { lng: userLang }),
            flags: MessageFlags.Ephemeral,
          });
        }

        throw new Error("Subscriber roles not configured");
      }
      const subscriberRoleId = getConfig<string>("subscriberRoleId");
      if (!member.roles.cache.has(subscriberRoleId!)) {
        if (interaction) {
          await interaction.reply({
            content: t("giveawayOnlyForSubNeedDiscordTwitchLinking", {
              lng: userLang,
            }),
            flags: MessageFlags.Ephemeral,
          });
        }

        throw new Error("User is not a subscriber");
      }

      try {
        if (interaction) {
          const memberOAuth = await prisma.user.findFirst({
            where: {
              id: userId,
            },
          });
          if (!memberOAuth) {
            await handleAuthorize(interaction, userLang, giveaway);

            return true;
          }
          try {
            const memberConnectionsCheckDiscord =
              await getDiscordConnections(memberOAuth);
            if (memberConnectionsCheckDiscord.length === 0) {
              await handleAuthorize(interaction, userLang, giveaway);

              return true;
            }
            await prisma.$transaction(async (tx) => {
              await handleDiscordConnectionsTx(
                tx,
                memberOAuth.id,
                memberConnectionsCheckDiscord,
              );
              await addGiveawayEntryTx(tx, member, userId, giveaway);
            });

            await interaction.reply({
              content: t("giveawayEnteredSuccessfully", { lng: userLang }),
              flags: MessageFlags.Ephemeral,
            });
          } catch (error) {
            console.error("Error fetching Discord connections:", error);
            await handleAuthorize(interaction, userLang, giveaway);

            return true;
          }
        } else {
          await prisma.$transaction(async (tx) => {
            await addGiveawayEntryTx(tx, member, userId, giveaway);
          });
        }
        return true;
      } catch (error) {
        console.error("Error fetching Discord connections:", error);
        if (interaction) {
          await handleAuthorize(interaction, userLang, giveaway);
        }
        return true;
      }
    } catch (error) {
      console.error("Error fetching guild member:", error);
      if (interaction) {
        await interaction.reply({
          content: t("errorHappen", { lng: userLang }),
          flags: MessageFlags.Ephemeral,
        });
      }
      throw error;
    }
  } else {
    await prisma.giveawayEntry.create({
      data: { giveawayId: giveaway.id, userId: userId },
    });
    if (interaction) {
      await interaction.reply({
        content: t("giveawayEnteredSuccessfully", { lng: userLang }),
        flags: MessageFlags.Ephemeral,
      });
    }

    return true;
  }
};
