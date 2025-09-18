import type { GiveawayWizard } from '@/lib/types/giveaway.js';
import type { AnyComponentBuilder } from "discord.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } from "discord.js";

export function getYearOptions(): string[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  return Array.from({ length: 5 }, (_, i) => String(currentYear + i));
}

export function getMonthOptions(selectedYear: string): string[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  if (Number(selectedYear) === currentYear) {
    return Array.from({ length: 12 - currentMonth + 1 }, (_, i) => String(currentMonth + i).padStart(2, "0"));
  }
  return Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
}

export function getDayOptions(selectedYear: number, selectedMonth: number): string[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();
  const totalDays = new Date(selectedYear, selectedMonth, 0).getDate();
  if (selectedYear === currentYear && selectedMonth === currentMonth) {
    return Array.from({ length: totalDays - currentDay + 1 }, (_, i) => String(currentDay + i).padStart(2, "0"));
  }
  return Array.from({ length: totalDays }, (_, i) => String(i + 1).padStart(2, "0"));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function generatePageComponents(wizard: { pages: any; pageIndex: any; data?: any }): ActionRowBuilder<AnyComponentBuilder>[] {
  const page = wizard.pages[wizard.pageIndex];
  const pageIndex = wizard.pageIndex;
  const rows = [];

  if (page.type === "save") {
    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("save").setLabel("💾 Save").setStyle(ButtonStyle.Success)
      )
    );
  }

  if (page.type === "modal") {
    const btnId = page.modalId;
    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(btnId).setLabel(page.label).setStyle(ButtonStyle.Primary)
      )
    );
  }

  if (page.type === "select") {
    const select = new StringSelectMenuBuilder()
      .setCustomId(`select_${page.key}`)
      .setPlaceholder(`Choose ${page.label}`)
      .addOptions(page.options.map((opt: string) => ({ label: opt, value: opt })));
    rows.push(new ActionRowBuilder().addComponents(select));
  }

  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("back")
        .setLabel("◀ Back")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pageIndex === 0),
      new ButtonBuilder()
        .setCustomId("next")
        .setLabel("Next ▶")
        .setStyle(ButtonStyle.Secondary)
        // check if current data is set
        .setDisabled(
          pageIndex === wizard.pages.length - 1 ||
          !wizard.data ||
          !wizard.data[page.key] ||
          wizard.data[page.key] === ""
        ),
      new ButtonBuilder().setCustomId("cancel").setLabel("❌ Cancel").setStyle(ButtonStyle.Danger)
    )
  );

  return rows;
}

export function generateWizardEmbed(wizard: Partial<GiveawayWizard> = {}): EmbedBuilder {
  const d: Partial<GiveawayWizard["data"]> = wizard.data || {};
  return new EmbedBuilder()
    .setTitle("Giveaway Setup")
    .setColor(0x00ae86)
    .addFields(
      { name: "Prize", value: d.prize || "Not set", inline: true },
      { name: "Year", value: d.year || "Not set", inline: true },
      { name: "Month", value: d.month || "Not set", inline: true },
      { name: "Day", value: d.day || "Not set", inline: true },
      { name: "Time", value: d.time || "Not set", inline: true }
    );
}
