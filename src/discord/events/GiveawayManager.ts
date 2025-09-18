import { Events } from "discord.js";

export const name = Events.InteractionCreate;
export const once = false;

import { handleGiveawayButton } from "@/lib/giveaway/GiveawayHandleButton.js";
import { handleModalSubmit } from "@/lib/giveaway/GiveawayModalSubmit.js";
import { handleGiveawaySelectMenu } from "@/lib/giveaway/GiveawaySelectMenu.js";
import type { Interaction } from "discord.js";

export const execute = async (interaction: Interaction): Promise<void> => {
  await handleModalSubmit(interaction);
  await handleGiveawaySelectMenu(interaction);
  await handleGiveawayButton(interaction);
};
