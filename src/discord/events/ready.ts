import type { Client } from "discord.js";
import { Events } from "discord.js";

export const name = Events.ClientReady;
export const once = true;

export const execute = (client: Client): void => {
  if (client.user) {
    console.log(`Prêt! Connecté en tant que ${client.user.tag}`);
  } else {
    console.log("Prêt! Connecté !");
  }
};
