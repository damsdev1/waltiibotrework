import { Events } from "discord.js";

export const name = Events.InteractionCreate;
export const once = false;

import { handleGiveawayButton } from "@/discord/modules/giveaway/GiveawayHandleButton.js";
import { handleModalSubmit } from "@/discord/modules/giveaway/GiveawayModalSubmit.js";
import { handleGiveawaySelectMenu } from "@/discord/modules/giveaway/GiveawaySelectMenu.js";
import type { Interaction } from "discord.js";

export const execute = async (interaction: Interaction): Promise<void> => {
  await handleModalSubmit(interaction);
  await handleGiveawaySelectMenu(interaction);
  await handleGiveawayButton(interaction);
};
