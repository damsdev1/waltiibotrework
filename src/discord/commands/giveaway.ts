import { cancelGiveawayMessageUpdate } from "@/discord/modules/giveaway/GiveawayMessageUpdaterScheduler.js";
import {
  cancelGiveawayScheduler,
  processWinner,
  scheduleGiveaway,
} from "@/discord/modules/giveaway/GiveawayScheduler.js";
import { getMonthOptions } from "@/discord/modules/giveaway/GiveawaySelectMenu.js";
import {
  createGiveawayEmbed,
  createGiveawayEmbedFinished,
  isSubscribersRolesConfigured,
  wizardEmbedContent,
} from "@/discord/modules/giveaway/GiveawayUtils.js";
import { replyEphemeral } from "@/discord/utils.js";
import { getAllLocalizedTranslations, t } from "@/lib/locales/i18n.js";
import { prisma } from "@/lib/prisma.js";
import { wizards } from "@/lib/Store.js";
import type {
  GiveawayWizard,
  GiveawayWizardPage,
} from "@/lib/types/giveaway.js";
import type { TranslationKeys } from "@/lib/types/i18n.js";
import { getUserLang } from "@/lib/utils.js";
import type {
  AutocompleteInteraction,
  ChannelManager,
  ChatInputCommandInteraction,
  TextChannel,
} from "discord.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { Giveaway } from "../../../generated/prisma/index.js";

function getYearOptions(): string[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  return Array.from({ length: 5 }, (_, i) => String(currentYear + i));
}
const getPages = (
  userLang: string,
  monthOptions: string[] = [],
  saveLabelKey: TranslationKeys = "save",
): GiveawayWizardPage[] => [
  {
    type: "modal",
    key: "prize",
    label: t("giveawayEnterPrize", { lng: userLang }),
    modalId: "modal_prize",
    placeholder: t("giveawayEnterPrize", { lng: userLang }),
  },
  {
    type: "select",
    key: "year",
    label: t("giveawayChooseYear", { lng: userLang }),
    options: getYearOptions(),
  },
  {
    type: "select",
    key: "month",
    label: t("giveawayChooseMonth", { lng: userLang }),
    options: monthOptions,
  },
  {
    type: "modal",
    key: "day",
    label: t("giveawayChooseDay", { lng: userLang }),
    modalId: "modal_day",
    placeholder: "11",
  },
  {
    type: "modal",
    key: "time",
    label: t("giveawayChooseTime", { lng: userLang }),
    modalId: "modal_time",
    placeholder: "HH:MM",
  },
  { type: "save", key: "save", label: t(saveLabelKey, { lng: userLang }) },
];
// TODO: /roll, /reroll, /edit
export const data = new SlashCommandBuilder()
  .setName("giveaway")
  .setDescription(t("giveawaySlashCommand"))
  .setDescriptionLocalizations(
    getAllLocalizedTranslations("giveawaySlashCommand"),
  )
  .addSubcommandGroup((group) =>
    group
      .setName("create")
      .setDescription(t("giveawaySlashCommandCreate"))
      .setDescriptionLocalizations(
        getAllLocalizedTranslations("giveawaySlashCommandCreate"),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("sub")
          .setDescription(t("giveawaySlashCommandCreateSub"))
          .setDescriptionLocalizations(
            getAllLocalizedTranslations("giveawaySlashCommandCreateSub"),
          ),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("all")
          .setDescription(t("giveawaySlashCommandCreateAll"))
          .setDescriptionLocalizations(
            getAllLocalizedTranslations("giveawaySlashCommandCreateAll"),
          ),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("delete")
      .setDescription(t("giveawaySlashCommandDelete"))
      .setDescriptionLocalizations(
        getAllLocalizedTranslations("giveawaySlashCommandDelete"),
      )
      .addStringOption((option) =>
        option
          .setName("id")
          .setDescription(t("giveawaySlashCommandDeleteId"))
          .setDescriptionLocalizations(
            getAllLocalizedTranslations("giveawaySlashCommandDeleteId"),
          )
          .setRequired(true)
          .setAutocomplete(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("edit")
      .setDescription("cvaca")
      .addStringOption((option) =>
        option
          .setName("id")
          .setDescription("caca")
          .setRequired(true)
          .setAutocomplete(true),
      ),
  )

  .addSubcommand((subcommand) =>
    subcommand
      .setName("roll")
      .setDescription("cvaca")
      .addStringOption((option) =>
        option
          .setName("id")
          .setDescription("caca")
          .setRequired(true)
          .setAutocomplete(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("reroll")
      .setDescription("cvaca")
      .addStringOption((option) =>
        option
          .setName("id")
          .setDescription("caca")
          .setRequired(true)
          .setAutocomplete(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("resend")
      .setDescription("cvaca")
      .addStringOption((option) =>
        option
          .setName("id")
          .setDescription("caca")
          .setRequired(true)
          .setAutocomplete(true),
      ),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setContexts(InteractionContextType.Guild);

async function handleCreate(
  interaction: ChatInputCommandInteraction,
  userLang: string,
): Promise<void> {
  const subCommand = interaction.options.getSubcommand();
  if (subCommand === "sub" && !isSubscribersRolesConfigured()) {
    return replyEphemeral(interaction, "giveawaySubNotConfigured", userLang);
  }

  const reply = await interaction.reply({
    ...wizardEmbedContent(userLang, {
      pages: getPages(userLang),
      pageIndex: 0,
    } as GiveawayWizard),
    withResponse: true,
    flags: MessageFlags.Ephemeral,
  });

  const messageId = reply.resource?.message?.id;
  if (messageId) {
    wizards.set(messageId, {
      pages: getPages(userLang),
      pageIndex: 0,
      data: {},
      messageId,
      userId: interaction.user.id,
      subOnly: subCommand === "sub",
      update: false,
      giveawayId: null,
    });
  }
}

const giveawayDeleteMessage = async (
  giveaway: Giveaway,
  channelManager: ChannelManager,
): Promise<void> => {
  if (!giveaway?.channelId) {
    return;
  }
  const channel = await channelManager
    .fetch(giveaway.channelId)
    .catch(() => null);
  if (!channel || !channel.isTextBased()) {
    return;
  }
  const message = await channel.messages
    .fetch(giveaway.messageId)
    .catch(() => null);
  if (message) {
    message.delete().catch(() => null);
  }
};

async function handleEdit(
  interaction: ChatInputCommandInteraction,
  userLang: string,
): Promise<void> {
  const giveawayId = interaction.options.getString("id", true);
  const giveaway = await prisma.giveaway.findUnique({
    where: { id: parseInt(giveawayId) },
  });
  if (!giveaway) {
    return replyEphemeral(interaction, "giveawayNotFound", userLang);
  }
  if (giveaway.ended) {
    return replyEphemeral(interaction, "giveawayAlreadyEnded", userLang);
  }

  const reply = await interaction.reply({
    ...wizardEmbedContent(userLang, {
      pages: getPages(userLang),
      pageIndex: 0,
    } as GiveawayWizard),
    withResponse: true,
    flags: MessageFlags.Ephemeral,
  });

  const messageId = reply.resource?.message?.id;
  if (messageId) {
    wizards.set(messageId, {
      pages: getPages(
        userLang,
        getMonthOptions(String(giveaway.endTime.getFullYear())),
        "back",
      ),
      pageIndex: 0,
      data: {
        prize: giveaway.prize,
        year: String(giveaway.endTime.getFullYear()),
        month: String(giveaway.endTime.getMonth() + 1).padStart(2, "0"),
        day: String(giveaway.endTime.getDate()).padStart(2, "0"),
        time: giveaway.endTime.toTimeString().slice(0, 5),
      },
      messageId,
      userId: interaction.user.id,
      subOnly: giveaway.subOnly,
      update: true,
      giveawayId: giveaway.id,
    });
    const wizard = wizards.get(messageId);
    console.log(wizard);
    if (!wizard) {
      return;
    }
    await interaction.editReply(wizardEmbedContent(userLang, wizard));
  }
}

async function handleDelete(
  interaction: ChatInputCommandInteraction,
  userLang: string,
): Promise<void> {
  const giveawayId = interaction.options.getString("id", true);
  const giveaway = await prisma.giveaway.findUnique({
    where: { id: parseInt(giveawayId) },
  });
  if (!giveaway) {
    return replyEphemeral(interaction, "giveawayNotFound", userLang);
  }
  await giveawayDeleteMessage(giveaway, interaction.client.channels);

  try {
    await cancelGiveawayScheduler(giveaway.id);
    await cancelGiveawayMessageUpdate(giveaway.id);
    await prisma.giveaway.delete({ where: { id: giveaway.id } });
    return replyEphemeral(interaction, "giveawayDeleted", userLang, {
      prize: giveaway.prize,
    });
  } catch (error) {
    console.error(
      `Failed to delete giveaway message: ${giveaway.messageId}`,
      error,
    );
    return replyEphemeral(interaction, "giveawayDeletedDBOnly", userLang);
  }
}

async function handleRoll(
  interaction: ChatInputCommandInteraction,
  userLang: string,
  reroll: boolean = false,
): Promise<void> {
  const giveawayId = interaction.options.getString("id", true);
  try {
    const result = await processWinner(
      parseInt(giveawayId, 10),
      interaction.client.channels ?? null,
      reroll,
    );
    return replyEphemeral(interaction, result, userLang);
  } catch (error) {
    console.error("Error fetching giveaway:", error);
    return replyEphemeral(interaction, "giveawayNotFound", userLang);
  }
}

async function handleResend(
  interaction: ChatInputCommandInteraction,
  userLang: string,
): Promise<void> {
  const channel = interaction.channel;
  const giveawayId = interaction.options.getString("id", true);
  try {
    const giveaway = await prisma.giveaway.findUnique({
      where: { id: parseInt(giveawayId) },
    });
    if (!giveaway) {
      return replyEphemeral(interaction, "giveawayNotFound", userLang);
    }
    if (!channel || !channel.isTextBased()) {
      return replyEphemeral(
        interaction,
        "invalidChannelOrPermissions",
        userLang,
      );
    }
    try {
      const entriesNumber = await prisma.giveawayEntry.count({
        where: { giveawayId: giveaway.id },
      });
      let embed;
      const rows = [];
      if (giveaway.ended) {
        embed = createGiveawayEmbedFinished(
          giveaway.prize,
          entriesNumber,
          giveaway.winnerUserId ? [giveaway.winnerUserId] : [],
          giveaway.endTime,
        );
      } else {
        embed = createGiveawayEmbed(
          giveaway.prize,
          entriesNumber,
          giveaway.endTime,
        );
        const participateButton = new ButtonBuilder()
          .setCustomId(`giveaway_join_${giveaway.interactionId}`)
          .setLabel(t("giveawayAnnounceJoinButton"))
          .setStyle(ButtonStyle.Primary);

        rows.push(
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            participateButton,
          ),
        );
      }

      const message = await (channel as TextChannel).send({
        embeds: [embed],
        components: rows,
      });
      if (message) {
        await prisma.giveaway.update({
          where: { id: giveaway.id },
          data: { channelId: channel.id, messageId: message.id },
        });
        await cancelGiveawayMessageUpdate(giveaway.id);
        if (!giveaway.ended) {
          await cancelGiveawayScheduler(giveaway.id);
          scheduleGiveaway(giveaway);
        }
        return replyEphemeral(interaction, "back", userLang, {
          prize: giveaway.prize,
        });
      }
      return replyEphemeral(interaction, "errorHappen", userLang);
    } catch (error) {
      console.error(
        `Failed to resend giveaway message to channel: ${channel.id}`,
        error,
      );
      return replyEphemeral(
        interaction,
        "invalidChannelOrPermissions",
        userLang,
      );
    }
  } catch (error) {
    console.error("Error happened:", error);
    return replyEphemeral(interaction, "errorHappen", userLang);
  }
}
export const execute = async (
  interaction: ChatInputCommandInteraction,
): Promise<void> => {
  const userLang = getUserLang(interaction.locale);
  const group = interaction.options.getSubcommandGroup(false);
  const sub = interaction.options.getSubcommand();

  if (group === "create") {
    return handleCreate(interaction, userLang);
  }
  switch (sub) {
    case "edit":
      return handleEdit(interaction, userLang);
    case "delete":
      return handleDelete(interaction, userLang);
    case "roll":
      return handleRoll(interaction, userLang);
    case "reroll":
      return handleRoll(interaction, userLang, true);
    case "resend":
      return handleResend(interaction, userLang);
  }

  return replyEphemeral(interaction, "unknownSubcommand", userLang);
};

export const autocomplete = async (
  interaction: AutocompleteInteraction,
): Promise<void> => {
  const focusedValue = interaction.options.getFocused();
  const choices = await prisma.giveaway.findMany({
    where: {
      prize: { contains: focusedValue },
    },
  });

  return interaction.respond(
    choices.map((choice) => ({
      name: String(choice.prize),
      value: String(choice.id),
    })),
  );
};
