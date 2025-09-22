import { setConfig } from "@/discord/ConfigManager.js";
import { getAllLocalizedTranslations, t } from "@/lib/locales/i18n.js";
import type { TranslationKeys } from "@/lib/types/i18n.js";
import { getUserLang } from "@/lib/utils.js";
import type {
  ChatInputCommandInteraction,
  InteractionResponse,
  SlashCommandRoleOption,
  SlashCommandSubcommandBuilder,
} from "discord.js";
import {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

// Helper to build role subcommands
const createRoleSubcommand =
  (name: string, descriptionKey: TranslationKeys) =>
  (sub: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder =>
    sub
      .setName(name)
      .setDescription(t(descriptionKey))
      .setDescriptionLocalizations(getAllLocalizedTranslations(descriptionKey))
      .addRoleOption((opt: SlashCommandRoleOption) =>
        opt
          .setName("role")
          .setDescription(t("roleManagerSlashCommandRoleOption"))
          .setDescriptionLocalizations(
            getAllLocalizedTranslations("roleManagerSlashCommandRoleOption"),
          )
          .setRequired(true),
      );

// Subcommand → config key and success translation key
const roleConfigMap: Record<
  string,
  { configKey: string; successKey: TranslationKeys }
> = {
  notif: { configKey: "roleNotif", successKey: "roleManagerNotifRoleDefined" },
  unverified: {
    configKey: "roleUnverified",
    successKey: "roleManagerUnverifiedRoleDefined",
  },
  subscriber: {
    configKey: "subscriberRoleId",
    successKey: "roleManagerSubscriberRoleDefined",
  },
  t1sub: {
    configKey: "T1SubRoleId",
    successKey: "roleManagerT1SubRoleDefined",
  },
  t2sub: {
    configKey: "T2SubRoleId",
    successKey: "roleManagerT2SubRoleDefined",
  },
  t3sub: {
    configKey: "T3SubRoleId",
    successKey: "roleManagerT3SubRoleDefined",
  },
};

export const data = new SlashCommandBuilder()
  .setName("roles")
  .setDescription(t("roleManagerSlashCommand"))
  .addSubcommand(createRoleSubcommand("notif", "roleManagerSlashCommandNotif"))
  .addSubcommand(
    createRoleSubcommand("unverified", "roleManagerSlashCommandUnverified"),
  )
  .addSubcommand(
    createRoleSubcommand("subscriber", "roleManagerSlashCommandSubscriber"),
  )
  .addSubcommand(createRoleSubcommand("t1sub", "roleManagerSlashCommandT1Sub"))
  .addSubcommand(createRoleSubcommand("t2sub", "roleManagerSlashCommandT2Sub"))
  .addSubcommand(createRoleSubcommand("t3sub", "roleManagerSlashCommandT3Sub"))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const replyWithRole = async (
  interaction: ChatInputCommandInteraction,
  key: TranslationKeys,
  roleId: string,
  lng: string,
): Promise<InteractionResponse<boolean>> =>
  interaction.reply({
    content: t(key, { role: `<@&${roleId}>`, lng }),
    flags: MessageFlags.Ephemeral,
  });

export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const lng = getUserLang(interaction.locale);

  if (!interaction.guild) {
    await interaction.reply({
      content: t("commandOnlyInGuild", { lng }),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const sub = interaction.options.getSubcommand();
  const role = interaction.options.getRole("role", true);

  const mapping = roleConfigMap[sub];
  if (!mapping) {
    await interaction.reply({
      content: t("unknownSubcommand", { lng }),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await setConfig(mapping.configKey, role.id);
  await replyWithRole(interaction, mapping.successKey, role.id, lng);
}
