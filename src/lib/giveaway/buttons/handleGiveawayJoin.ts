import { getConfig } from "@/discord/ConfigManager.js";
import { isSubscribersRolesConfigured } from "@/lib/giveaway/GiveawayUtils.js";
import { t } from "@/lib/locales/i18n.js";
import { prisma } from "@/lib/prisma.js";
import { getUserLang } from "@/lib/utils.js";
import type { ButtonInteraction, GuildMember } from "discord.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from "discord.js";

const calculateGiveawayChances = (
  member: GuildMember | null | undefined,
): number => {
  const T3SubRoleId = getConfig<string>("T3SubRoleId");
  const T2SubRoleId = getConfig<string>("T2SubRoleId");
  const T1SubRoleId = getConfig<string>("T1SubRoleId");

  if (T3SubRoleId && member?.roles.cache.has(T3SubRoleId)) {
    return 6; // T3 subscribers get 6 chances
  }

  if (T2SubRoleId && member?.roles.cache.has(T2SubRoleId)) {
    return 3; // T2 subscribers get 3 chances
  }

  if (T1SubRoleId && member?.roles.cache.has(T1SubRoleId)) {
    return 1; // T1 subscribers get 1 chance
  }

  return 1; // Default: 1 chance for regular subscribers or non-subs
};

export const handleGiveawayJoin = async (
  interaction: ButtonInteraction,
): Promise<boolean> => {
  if (!interaction.customId.startsWith("giveaway_join_")) {
    return false;
  }
  const userLang = getUserLang(interaction.locale);

  const interactionId = interaction.customId.replace("giveaway_join_", "");
  const giveaway = await prisma.giveaway.findUnique({
    where: { interactionId },
  });
  if (!giveaway) {
    await interaction.reply({
      content: t("giveawayNotFound", { lng: userLang }),
      ephemeral: true,
    });
    return true;
  }

  if (giveaway.ended) {
    await interaction.reply({
      content: t("giveawayAlreadyEnded", { lng: userLang }),
      ephemeral: true,
    });
    return true;
  }

  const existingEntry = await prisma.giveawayEntry.findUnique({
    where: {
      GiveawayUser: { giveawayId: giveaway.id, userId: interaction.user.id },
    },
  });
  if (existingEntry) {
    await interaction.reply({
      content: t("giveawayAlreadyEntered", { lng: userLang }),
      ephemeral: true,
    });
    return true;
  }

  if (giveaway.subOnly) {
    const member = await interaction.guild?.members.fetch(interaction.user.id);

    if (!isSubscribersRolesConfigured()) {
      await interaction.reply({
        content: t("giveawaySubNotConfigured", { lng: userLang }),
        ephemeral: true,
      });
      return true;
    }
    const subscriberRoleId = getConfig<string>("subscriberRoleId");
    if (!member?.roles.cache.has(subscriberRoleId!)) {
      await interaction.reply({
        content: t("giveawayOnlyForSubNeedDiscordTwitchLinking", {
          lng: userLang,
        }),
        ephemeral: true,
      });
      return true;
    }
    const memberOAuth = await prisma.user.findFirst({
      where: {
        id: interaction.user.id,
      },
    });
    if (!memberOAuth) {
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
      await interaction.reply({
        content: t("giveawayOnlyForSubNeedAuthorizeDiscord", { lng: userLang }),
        components: [row],
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }
    const chances = calculateGiveawayChances(member);
    await prisma.giveawayEntry.create({
      data: {
        giveawayId: giveaway.id,
        userId: interaction.user.id,
        chances,
      },
    });
    await interaction.reply({
      content: t("giveawayEnteredSuccessfully", { lng: userLang }),
      ephemeral: true,
    });
    return true;
  }

  await prisma.giveawayEntry.create({
    data: { giveawayId: giveaway.id, userId: interaction.user.id },
  });
  await interaction.reply({
    content: t("giveawayEnteredSuccessfully", { lng: userLang }),
    ephemeral: true,
  });
  return true;
};
