import type {
  Client,
  Collection,
  Interaction,
  SlashCommandBuilder,
} from "discord.js";
import { Events, MessageFlags } from "discord.js";

export const name = Events.InteractionCreate;
export const once = false;

interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: Interaction) => Promise<void>;
  autocomplete?: (interaction: Interaction) => Promise<void>;
}

interface ClientDiscord extends Client {
  commands: Collection<string, Command>;
}

export const execute = async (interaction: Interaction): Promise<void> => {
  if (interaction.isChatInputCommand()) {
    const command = (interaction.client as ClientDiscord).commands.get(
      interaction.commandName,
    );

    if (!command) {
      console.error(
        `No command matching ${interaction.commandName} was found.`,
      );
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "There was an error while executing this command!",
        flags: MessageFlags.Ephemeral,
      });
    }
  } else if (interaction.isAutocomplete()) {
    const command = (interaction.client as ClientDiscord).commands.get(
      interaction.commandName,
    );

    if (!command) {
      console.error(
        `No command matching ${interaction.commandName} was found.`,
      );
      return;
    }

    try {
      if (command.autocomplete) {
        await command.autocomplete(interaction);
      }
    } catch (error) {
      console.error(error);
    }
  }
};
