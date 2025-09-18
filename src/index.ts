import "dotenv/config";
import botStart from "@/discord/discord.js";
import startWebServer from "@/http/server.js";
botStart();
startWebServer();
