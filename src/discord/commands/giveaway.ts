import { wizards } from "@/lib/Store.js";
import {
  generatePageComponents,
  generateWizardEmbed,
  getYearOptions,
  isSubscribersRolesConfigured,
} from "@/lib/giveaway/GiveawayUtils.js";
import { getAllLocalizedTranslations, t } from "@/lib/locales/i18n.js";
import { prisma } from "@/lib/prisma.js";
import type { GiveawayWizardPage } from "@/lib/types/giveaway.js";
import { getUserLang, replyEphemeral } from "@/lib/utils.js";
import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
} from "discord.js";
import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

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
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setContexts(InteractionContextType.Guild);

async function handleCreate(
  interaction: ChatInputCommandInteraction,
  userLang: string,
): Promise<void> {
  const subCommand = interaction.options.getSubcommand();
  if (subCommand === "sub" && !isSubscribersRolesConfigured()) {
    return replyEphemeral(
      interaction,
      "giveawaySubNotConfiguredAdmin",
      userLang,
    );
  }
  const pages: GiveawayWizardPage[] = [
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
      options: [],
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
    { type: "save", key: "save", label: t("save", { lng: userLang }) },
  ];

  const reply = await interaction.reply({
    content: t("giveawaySetup", { lng: userLang }),
    embeds: [generateWizardEmbed({}, userLang)],
    components: generatePageComponents({ pages, pageIndex: 0 }, userLang).map(
      (row) => row.toJSON(),
    ),
    withResponse: true,
    flags: MessageFlags.Ephemeral,
  });

  const messageId = reply.resource?.message?.id;
  if (messageId) {
    wizards.set(messageId, {
      pages,
      pageIndex: 0,
      data: {},
      messageId,
      userId: interaction.user.id,
      subOnly: subCommand === "sub",
    });
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
  if (!giveaway.channelId) {
    return replyEphemeral(interaction, "invalidChannelOrPermissions", userLang);
  }
  const channel = await interaction.client.channels.fetch(giveaway.channelId);
  if (!channel || !channel.isTextBased()) {
    return replyEphemeral(interaction, "invalidChannelOrPermissions", userLang);
  }

  try {
    const message = await channel.messages.fetch(giveaway.messageId);
    if (message) {
      await message.delete();
    }
    await prisma.giveaway.delete({ where: { id: giveaway.id } });
    await replyEphemeral(interaction, "giveawayDeleted", userLang, {
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

export const execute = async (
  interaction: ChatInputCommandInteraction,
): Promise<void> => {
  const userLang = getUserLang(interaction.locale);
  const group = interaction.options.getSubcommandGroup(false);
  const sub = interaction.options.getSubcommand();

  if (group === "create") {
    return handleCreate(interaction, userLang);
  }
  if (sub === "delete") {
    return handleDelete(interaction, userLang);
  }

  await replyEphemeral(interaction, "unknownSubcommand", userLang);
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

  await interaction.respond(
    choices.map((choice) => ({
      name: String(choice.prize),
      value: String(choice.id),
    })),
  );
};
