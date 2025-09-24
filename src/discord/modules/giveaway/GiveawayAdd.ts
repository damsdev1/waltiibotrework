import { getConfig } from "@/discord/ConfigManager.js";
import { requestGiveawayMessageUpdate } from "@/discord/modules/giveaway/GiveawayMessageUpdaterScheduler.js";
import { isSubscribersRolesConfigured } from "@/discord/modules/giveaway/GiveawayUtils.js";
import { getDiscordConnections } from "@/lib/discord/DiscordAPI.js";
import { handleDiscordConnectionsTx } from "@/lib/discord/discordConnectionManager.js";
import { prisma } from "@/lib/prisma.js";
import type { TranslationKeys } from "@/lib/types/i18n.js";
import type { ButtonInteraction, Client, GuildMember } from "discord.js";
import { DiscordAPIError } from "discord.js";
import type { Giveaway, GiveawayEntry } from "../../../../generated/prisma/index.js";

const addGiveawayEntryDB = async (member: GuildMember, userId: string, giveaway: Giveaway): Promise<GiveawayEntry> => {
  const chances = calculateGiveawayChances(member);
  return prisma.giveawayEntry.create({
    data: {
      giveawayId: giveaway.id,
      userId: userId,
      chances,
    },
  });
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
): Promise<GuildMember> => {
  if (interaction?.guild) {
    return await interaction.guild.members.fetch(userId);
  } else {
    // Fetch the guilds the bot is in and try to find the member
    if (!process.env.DISCORD_GUILD_ID) {
      throw new Error("DISCORD_GUILD_ID is not set in environment variables");
    }
    const guild = discordClient!.guilds.cache.get(process.env.DISCORD_GUILD_ID);
    if (!guild) {
      throw new Error("Bot is not in the specified guild");
    }
    return await guild.members.fetch(userId);
  }
};

export type GiveawayAddResponse = {
  success: boolean;
  messageKey: TranslationKeys;
  type: "reply" | "authorize";
};

export type GiveawayRemoveResponse = {
  success: boolean;
  messageKey: TranslationKeys;
};

const giveawayResponse = (
  success: boolean,
  messageKey: TranslationKeys,
  type: "reply" | "authorize" = "reply",
): GiveawayAddResponse => {
  return { success, messageKey, type };
};

const giveawayNeedsAuthorize = (): GiveawayAddResponse => {
  return giveawayResponse(false, "giveawayOnlyForSubNeedAuthorizeDiscord", "authorize");
};

export const giveawayRemove = async (giveaway: Giveaway, userId: string): Promise<void> => {
  await prisma.giveawayEntry.delete({
    where: {
      GiveawayUser: { giveawayId: giveaway.id, userId: userId },
    },
  });
  await requestGiveawayMessageUpdate(giveaway.id);
};

export const giveawayAdd = async (
  giveaway: Giveaway,
  userId: string,
  interaction: ButtonInteraction | null,
  discordClient: Client | null,
): Promise<GiveawayAddResponse> => {
  if (!giveaway.subOnly) {
    await prisma.giveawayEntry.create({
      data: { giveawayId: giveaway.id, userId: userId },
    });
    await requestGiveawayMessageUpdate(giveaway.id);
    return giveawayResponse(true, "giveawayEnteredSuccessfully");
  }

  if (!interaction?.guild || (discordClient && !discordClient.isReady())) {
    return giveawayResponse(false, "errorHappen");
  }
  try {
    const member = await getMember(userId, interaction, discordClient);

    if (!isSubscribersRolesConfigured()) {
      return giveawayResponse(false, "giveawaySubNotConfigured");
    }
    const subscriberRoleId = getConfig<string>("subscriberRoleId");
    if (!member.roles.cache.has(subscriberRoleId!)) {
      return giveawayResponse(false, "giveawayOnlyForSubNeedDiscordTwitchLinking");
    }

    try {
      const memberOAuth = await prisma.user.findFirst({
        where: {
          id: userId,
        },
      });
      if (!memberOAuth) {
        return giveawayNeedsAuthorize();
      }
      try {
        const memberConnectionsCheckDiscord = await getDiscordConnections(memberOAuth);
        console.log("Member connections:", memberConnectionsCheckDiscord);
        if (memberConnectionsCheckDiscord.length === 0) {
          return giveawayResponse(false, "giveawayOnlyForSubNeedDiscordTwitchLinking");
        }
        const giveawayEntry = await addGiveawayEntryDB(member, userId, giveaway);
        await prisma.$transaction(async (tx) => {
          await handleDiscordConnectionsTx(tx, userId, memberConnectionsCheckDiscord, giveawayEntry);
        });
        await requestGiveawayMessageUpdate(giveaway.id);
        return giveawayResponse(true, "giveawayEnteredSuccessfully");
      } catch (error) {
        console.error("Error fetching Discord connections:", error);
        return giveawayNeedsAuthorize();
      }
    } catch (error) {
      console.error("Error fetching member:", error);
      return giveawayResponse(false, "errorHappen");
    }
  } catch (error) {
    if (error instanceof DiscordAPIError) {
      console.error("Discord API Error fetching guild member:", error);
      return giveawayResponse(false, "userNotFound");
    } else {
      console.error("Error fetching member:", error);
      return giveawayResponse(false, "errorHappen");
    }
  }
};
