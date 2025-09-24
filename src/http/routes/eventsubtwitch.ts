import { getConfig } from "@/discord/ConfigManager.js";
import { getDiscordClient } from "@/discord/modules/DiscordClientExporter.js";
import { isDelayExceedStreamOnline, setDelayDateStreamOffline } from "@/lib/twitch/TwitchAPI.js";
import crypto from "crypto";
import { ChannelType } from "discord.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
// Notification request headers
const TWITCH_MESSAGE_ID = "Twitch-Eventsub-Message-Id".toLowerCase();
const TWITCH_MESSAGE_TIMESTAMP = "Twitch-Eventsub-Message-Timestamp".toLowerCase();
const TWITCH_MESSAGE_SIGNATURE = "Twitch-Eventsub-Message-Signature".toLowerCase();
const MESSAGE_TYPE = "Twitch-Eventsub-Message-Type".toLowerCase();

// Notification message types
const MESSAGE_TYPE_VERIFICATION = "webhook_callback_verification";
const MESSAGE_TYPE_NOTIFICATION = "notification";
const MESSAGE_TYPE_REVOCATION = "revocation";

// Prepend this string to the HMAC that's created from the message
const HMAC_PREFIX = "sha256=";

const sendAnnouncementTwitch = async (i: number = 0): Promise<void> => {
  const discordClient = getDiscordClient();
  if (!discordClient?.isReady()) {
    if (i < 15) {
      await new Promise((r) => setTimeout(r, 2000));
      i = i + 1;
      await sendAnnouncementTwitch(i);
    } else {
      console.error("Discord client not ready after 30 seconds, aborting Twitch announcement.");
    }
    return;
  }
  const announceChannel = getConfig("announceChannel");
  if (!announceChannel || typeof announceChannel !== "string") {
    return;
  }

  const channel = await discordClient?.channels.fetch(announceChannel);
  if (channel?.type === ChannelType.GuildText) {
    const notifTag = getConfig("roleNotif") ? `<@&${getConfig("roleNotif")}>` : "";
    channel.send(`${notifTag}
https://www.twitch.tv/waltii

ACTUELLEMENT EN LIVE.

Merci de laisser le stream ouvert pour me soutenir ! Mettez le son du navigateur en mute, pas celui du live. Vous êtes les meilleurs !`);
  }
};

const routes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.post("/eventsub", async (request: FastifyRequest, reply: FastifyReply) => {
    const secret = getSecret();
    const message = getHmacMessage(request);
    const hmac = HMAC_PREFIX + getHmac(secret, message); // Signature to compare
    const signatureHeader = request.headers[TWITCH_MESSAGE_SIGNATURE];
    if (typeof signatureHeader === "string" && verifyMessage(hmac, signatureHeader)) {
      const notification = typeof request.body === "string" ? JSON.parse(request.body) : request.body;

      if (!notification || typeof notification !== "object") {
        console.error("Invalid notification format");
        return reply.status(400).send("Bad Request");
      }

      if (MESSAGE_TYPE_NOTIFICATION === request.headers[MESSAGE_TYPE]) {
        // TODO: Do something with the event's data.

        console.log(`Event type: ${notification.subscription.type}`);
        console.log(JSON.stringify(notification.event, null, 4));
        if (notification.subscription.type === "stream.online") {
          if (isDelayExceedStreamOnline()) {
            await sendAnnouncementTwitch();
          }
        } else if (notification.subscription.type === "stream.offline") {
          setDelayDateStreamOffline();
        }
        return reply.send(204);
      } else if (MESSAGE_TYPE_VERIFICATION === request.headers[MESSAGE_TYPE]) {
        return reply.status(200).header("Content-Type", "text/plain").send(notification.challenge);
      } else if (MESSAGE_TYPE_REVOCATION === request.headers[MESSAGE_TYPE]) {
        console.log(`${notification.subscription.type} notifications revoked!`);
        console.log(`reason: ${notification.subscription.status}`);
        console.log(`condition: ${JSON.stringify(notification.subscription.condition, null, 4)}`);
        return reply.send(204);
      } else {
        console.log(`Unknown message type: ${request.headers[MESSAGE_TYPE]}`);
        return reply.send(204);
      }
    } else {
      return reply.status(403).send("Forbidden");
    }
  });
};

const getSecret = (): string => {
  if (process.env.TWITCH_EVENTSUB_SECRET) {
    return process.env.TWITCH_EVENTSUB_SECRET;
  } else {
    process.exit("TWITCH_EVENTSUB_SECRET not set in environment variables");
  }
};

// Build the message used to get the HMAC.
const getHmacMessage = (request: FastifyRequest): string => {
  const messageId =
    typeof request.headers[TWITCH_MESSAGE_ID] === "string"
      ? request.headers[TWITCH_MESSAGE_ID]
      : Array.isArray(request.headers[TWITCH_MESSAGE_ID])
        ? request.headers[TWITCH_MESSAGE_ID].join("")
        : "";
  const timestamp =
    typeof request.headers[TWITCH_MESSAGE_TIMESTAMP] === "string"
      ? request.headers[TWITCH_MESSAGE_TIMESTAMP]
      : Array.isArray(request.headers[TWITCH_MESSAGE_TIMESTAMP])
        ? request.headers[TWITCH_MESSAGE_TIMESTAMP].join("")
        : "";
  const body = typeof request.body === "string" ? request.body : request.body ? JSON.stringify(request.body) : "";
  return messageId + timestamp + body;
};

// Get the HMAC.
const getHmac = (secret: string, message: string): string => {
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
};

// Verify whether our hash matches the hash that Twitch passed in the header.
const verifyMessage = (hmac: string, verifySignature: string): boolean => {
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(verifySignature));
};
export default routes;
