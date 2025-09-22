import { getConfig } from "@/discord/ConfigManager.js";
import { t } from "@/lib/locales/i18n.js";
import type { GiveawayWizard } from "@/lib/types/giveaway.js";
import type { AnyComponentBuilder, BaseMessageOptions } from "discord.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from "discord.js";

export const isSubscribersRolesConfigured = (): boolean => {
  const subscriberRoleId = getConfig<string>("subscriberRoleId");
  const T1SubRoleId = getConfig<string>("T1SubRoleId");
  const T2SubRoleId = getConfig<string>("T2SubRoleId");
  const T3SubRoleId = getConfig<string>("T3SubRoleId");
  return !!(subscriberRoleId || T1SubRoleId || T2SubRoleId || T3SubRoleId);
};

// Centralized wizard navigation button IDs
export const WIZARD_NAV_IDS = ["back", "next", "cancel", "save"] as const;

function generateWizardEmbed(
  wizard: Partial<GiveawayWizard> = {},
  userLang: string = "fr",
): EmbedBuilder {
  const d: Partial<GiveawayWizard["data"]> = wizard.data || {};
  return new EmbedBuilder()
    .setTitle(t("giveawaySetup", { lng: userLang }))
    .setColor(0x00ae86)
    .addFields(
      {
        name: t("giveawayWizardPrize", { lng: userLang }),
        value: d.prize || t("giveawayWizardNotSet", { lng: userLang }),
        inline: true,
      },
      {
        name: t("giveawayWizardYear", { lng: userLang }),
        value: d.year || t("giveawayWizardNotSet", { lng: userLang }),
        inline: true,
      },
      {
        name: t("giveawayWizardMonth", { lng: userLang }),
        value: d.month || t("giveawayWizardNotSet", { lng: userLang }),
        inline: true,
      },
      {
        name: t("giveawayWizardDay", { lng: userLang }),
        value: d.day || t("giveawayWizardNotSet", { lng: userLang }),
        inline: true,
      },
      {
        name: t("giveawayWizardTime", { lng: userLang }),
        value: d.time || t("giveawayWizardNotSet", { lng: userLang }),
        inline: true,
      },
    );
}

function generatePageComponents(
  wizard: {
    pages: GiveawayWizard["pages"];
    pageIndex: GiveawayWizard["pageIndex"];
    data?: GiveawayWizard["data"];
  },
  userLang: string = "fr",
): ActionRowBuilder<AnyComponentBuilder>[] {
  const page = wizard.pages[wizard.pageIndex];
  const pageIndex = wizard.pageIndex;
  const rows = [];

  if (page.type === "save") {
    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(page.type)
          .setLabel(page.label)
          .setStyle(ButtonStyle.Success),
      ),
    );
  }

  if (page.type === "modal") {
    const btnId = page.modalId;
    if (btnId) {
      rows.push(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(btnId)
            .setLabel(page.label)
            .setStyle(ButtonStyle.Primary),
        ),
      );
    }
  }

  if (page.type === "select") {
    let select = new StringSelectMenuBuilder()
      .setCustomId(`select_${page.key}`)
      .setPlaceholder(`${page.label}`);
    if (page.options) {
      select = select.addOptions(
        page.options.map((opt: string) => ({ label: opt, value: opt })),
      );
    }
    rows.push(new ActionRowBuilder().addComponents(select));
  }

  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("back")
        .setLabel(`◀ ${t("back", { lng: userLang })}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pageIndex === 0),
      new ButtonBuilder()
        .setCustomId("next")
        .setLabel(`${t("next", { lng: userLang })} ▶`)
        .setStyle(ButtonStyle.Secondary)
        // check if current data is set
        .setDisabled(
          pageIndex === wizard.pages.length - 1 ||
            !wizard.data ||
            !page.key ||
            !wizard.data?.[page.key as keyof typeof wizard.data] ||
            wizard.data?.[page.key as keyof typeof wizard.data] === "",
        ),
      new ButtonBuilder()
        .setCustomId("cancel")
        .setLabel("❌ Cancel")
        .setStyle(ButtonStyle.Danger),
    ),
  );

  return rows;
}
export const wizardEmbedContent = (
  userLang: string,
  wizard: GiveawayWizard,
): BaseMessageOptions => {
  return {
    content: t("giveawaySetup", { lng: userLang }),
    embeds: [generateWizardEmbed(wizard, userLang)],
    components: generatePageComponents(wizard, userLang).map((row) =>
      row.toJSON(),
    ),
  };
};
