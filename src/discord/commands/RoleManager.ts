import { setConfig } from "@/discord/ConfigManager.js";
import { replyEphemeral } from "@/discord/utils.js";
import { getAllLocalizedTranslations, t } from "@/lib/locales/i18n.js";
import type { TranslationKeys } from "@/lib/types/i18n.js";
import { getUserLang } from "@/lib/utils.js";
import type {
  ChatInputCommandInteraction,
  SlashCommandRoleOption,
  SlashCommandSubcommandBuilder,
} from "discord.js";
import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

/* ---------------------- Role Config Mapping ---------------------- */
const roleConfigMap: Record<
  string,
  { configKey: string; successKey: TranslationKeys; descKey: TranslationKeys }
> = {
  notif: {
    configKey: "roleNotif",
    successKey: "roleManagerNotifRoleDefined",
    descKey: "roleManagerSlashCommandNotif",
  },
  unverified: {
    configKey: "roleUnverified",
    successKey: "roleManagerUnverifiedRoleDefined",
    descKey: "roleManagerSlashCommandUnverified",
  },
  subscriber: {
    configKey: "subscriberRoleId",
    successKey: "roleManagerSubscriberRoleDefined",
    descKey: "roleManagerSlashCommandSubscriber",
  },
  t1sub: {
    configKey: "T1SubRoleId",
    successKey: "roleManagerT1SubRoleDefined",
    descKey: "roleManagerSlashCommandT1Sub",
  },
  t2sub: {
    configKey: "T2SubRoleId",
    successKey: "roleManagerT2SubRoleDefined",
    descKey: "roleManagerSlashCommandT2Sub",
  },
  t3sub: {
    configKey: "T3SubRoleId",
    successKey: "roleManagerT3SubRoleDefined",
    descKey: "roleManagerSlashCommandT3Sub",
  },
};

/* ---------------------- Build SlashCommandBuilder ---------------------- */
export const data = ((): SlashCommandBuilder => {
  const builder = new SlashCommandBuilder()
    .setName("roles")
    .setDescription(t("roleManagerSlashCommand"))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  for (const [name, { descKey }] of Object.entries(roleConfigMap)) {
    builder.addSubcommand((sub: SlashCommandSubcommandBuilder) =>
      sub
        .setName(name)
        .setDescription(t(descKey))
        .setDescriptionLocalizations(getAllLocalizedTranslations(descKey))
        .addRoleOption((opt: SlashCommandRoleOption) =>
          opt
            .setName("role")
            .setDescription(t("roleManagerSlashCommandRoleOption"))
            .setDescriptionLocalizations(
              getAllLocalizedTranslations("roleManagerSlashCommandRoleOption"),
            )
            .setRequired(true),
        ),
    );
  }

  return builder;
})();

/* ---------------------- Execute Handler ---------------------- */
export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const lng = getUserLang(interaction.locale);

  if (!interaction.guild) {
    return replyEphemeral(interaction, "commandOnlyInGuild", lng);
  }

  const sub = interaction.options.getSubcommand();
  const role = interaction.options.getRole("role", true);

  const mapping = roleConfigMap[sub];
  if (!mapping) {
    return replyEphemeral(interaction, "unknownSubcommand", lng);
  }

  await setConfig(mapping.configKey, role.id);
  return replyEphemeral(interaction, mapping.successKey, lng, {
    roleID: `<@&${role.id}>`,
  });
}
