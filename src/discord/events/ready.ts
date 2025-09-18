import type { Client } from "discord.js";
import { Events } from "discord.js";

export const name = Events.ClientReady;
export const once = true;

export const execute = (client: Client): void => {
  if (client.user) {
    console.info(`Prêt! Connecté en tant que ${client.user.tag}`);
  } else {
    console.info("Prêt! Connecté !");
  }
};
