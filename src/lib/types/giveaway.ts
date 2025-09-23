import type { GiveawayWizardData } from "@/lib/validators/giveaway.js";

export interface GiveawayWizard {
  pages: Array<GiveawayWizardPage>;
  pageIndex: number;
  data: Partial<GiveawayWizardData>;
  messageId: string;
  userId: string;
  subOnly: boolean;
  update: boolean;
  giveawayId: number | null;
}

export interface GiveawayWizardPage {
  type: "modal" | "select" | "save";
  key?: string;
  label: string;
  modalId?: string;
  options?: string[];
  placeholder?: string;
}

export interface GiveawayWizardPageModal extends GiveawayWizardPage {
  placeholder?: string;
}
