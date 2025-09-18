import { GatewayIntentBits, Partials } from "discord.js";

export const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildMessageReactions,
  GatewayIntentBits.DirectMessages,
];

export const partials = [Partials.Message, Partials.Channel, Partials.Reaction];
