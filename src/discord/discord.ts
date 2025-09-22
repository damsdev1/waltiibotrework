import { loadConfig } from "@/discord/ConfigManager.js";
import { intents, partials } from "@/discord/intents.js";
import { initializeGiveawayScheduler } from "@/discord/modules/giveaway/GiveawayScheduler.js";
import { initializeDiscordPendingUsersScheduler } from "@/lib/discord/DiscordPendingAuthorizedUsers.js";
import { getDirName } from "@/lib/utils.js";
import { Client, Collection, REST, Routes } from "discord.js";
import * as fs from "fs";
import * as path from "path";
import { pathToFileURL } from "url";

export const client = new Client({
  intents: intents,
  partials: partials,
}) as Client & { commands: Collection<unknown, unknown> };

client.commands = new Collection();

async function loadCommands(): Promise<unknown[]> {
  const commands = [];
  const commandsPath = path.join(getDirName(import.meta), "commands");
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".ts") || file.endsWith(".js"));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = await import(pathToFileURL(filePath).href);
    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
      commands.push(command.data.toJSON());
    } else {
      console.warn(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
      );
    }
  }

  return commands;
}
async function loadRest(commands: unknown[]): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN!);
  try {
    console.info(
      `Started refreshing ${commands.length} application (/) commands.`,
    );

    const data = (await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID!,
        process.env.GUILD_ID!,
      ),
      {
        body: commands,
      },
    )) as unknown[];

    console.info(
      `Successfully reloaded ${data.length} application (/) commands.`,
    );
  } catch (error) {
    console.error(`Failed to reload application (/) commands: ${error}`);
  }
}
async function loadEvents(): Promise<void> {
  const eventsPath = path.join(getDirName(import.meta), "events");
  if (!fs.existsSync(eventsPath)) {
    console.warn(`[WARN] Events folder does not exist: ${eventsPath}`);
    return;
  }
  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file.endsWith(".ts") || file.endsWith(".js"));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = await import(pathToFileURL(filePath).href);
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  }
}
const botStart = async (): Promise<void> => {
  try {
    await loadConfig();
    const commands = await loadCommands();
    await loadRest(commands);
    await loadEvents();
    await client.login(process.env.TOKEN);
    await initializeGiveawayScheduler(client);
    await initializeDiscordPendingUsersScheduler(client);
  } catch (error) {
    console.error("Error starting bot:", error);
  }
};

export default botStart;
