import type { Client } from "discord.js";

let DiscordClient: Client | undefined = undefined;

export const initializeDiscordClientExporter = async (client: Client): Promise<void> => {
  DiscordClient = client;
};

export const getDiscordClient = (): Client | undefined => {
  return DiscordClient;
};
