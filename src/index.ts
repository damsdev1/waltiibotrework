import botStart from "@/discord/discord.js";
import startWebServer from "@/http/server.js";
import { initI18n } from "@/lib/locales/i18n.js";
import "dotenv/config";
await initI18n();
botStart();
startWebServer();
