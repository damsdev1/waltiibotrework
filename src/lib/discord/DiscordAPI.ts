import { withDiscordToken } from "@/lib/discord/DiscordAPIHelper.js";
import { DiscordFetchAPIError } from "@/lib/discord/DiscordFetchAPIError.js";
import type { UserWithoutId } from "@/lib/types/db.js";
import type {
  DiscordConnections,
  DiscordOAuth2Token,
  DiscordUserMe,
} from "@/lib/validators/discord.js";
import {
  DiscordConnectionsValidator,
  DiscordOAuth2TokenValidator,
  DiscordUserMeValidator,
} from "@/lib/validators/discord.js";
import { request } from "urllib";
import z from "zod";

export const getDiscordToken = async (
  code: string,
): Promise<DiscordOAuth2Token> => {
  const tokenResponseData = await request(
    "https://discord.com/api/oauth2/token",
    {
      method: "POST",
      data: new URLSearchParams({
        client_id: process.env.CLIENT_ID ?? "",
        client_secret: process.env.CLIENT_SECRET ?? "",
        code,
        grant_type: "authorization_code",
        redirect_uri:
          process.env.REDIRECT_DISCORD_URI ?? "http://localhost:3000/oauth2",
        scope: "identify connections",
      }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );
  if (
    tokenResponseData.statusCode < 200 ||
    tokenResponseData.statusCode >= 300
  ) {
    console.error(
      "Error response from token endpoint:",
      tokenResponseData.data.toString(),
    );
    throw new DiscordFetchAPIError("Failed to fetch token");
  }

  try {
    return DiscordOAuth2TokenValidator.parse(
      JSON.parse(tokenResponseData.data.toString()),
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.issues);
      throw new DiscordFetchAPIError("Invalid token data structure");
    }
    console.error("Unknown error during token parsing:", error);
    throw new DiscordFetchAPIError("Unknown error occurred");
  }
};
export const getDiscordUser = async (
  tokenData: UserWithoutId,
): Promise<DiscordUserMe> => {
  async function fetchUser(
    accessToken: string,
  ): Promise<{ statusCode: number; data: unknown }> {
    return request("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
      dataType: "json",
    });
  }

  const { data: response } = await withDiscordToken(tokenData, fetchUser);

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new DiscordFetchAPIError(
      `Failed to fetch user. Status: ${response.statusCode}`,
    );
  }

  try {
    return DiscordUserMeValidator.parse(response.data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new DiscordFetchAPIError("Invalid user data structure");
    }
    console.error("Error parsing user data:", error);
    throw new DiscordFetchAPIError("Unknown error occurred");
  }
};

export const getDiscordConnections = async (
  tokenData: UserWithoutId,
): Promise<DiscordConnections> => {
  async function fetchConnections(
    accessToken: string,
  ): Promise<{ statusCode: number; data: unknown }> {
    return request("https://discord.com/api/users/@me/connections", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      dataType: "json",
    });
  }

  const { data: response } = await withDiscordToken(
    tokenData,
    fetchConnections,
  );

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new DiscordFetchAPIError(
      `Failed to fetch user connections. Status: ${response.statusCode}`,
    );
  }

  const data = Array.isArray(response.data) ? response.data : [{}];

  try {
    return DiscordConnectionsValidator.parse(
      data.filter((conn) => conn?.type === "twitch"),
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new DiscordFetchAPIError("Invalid user data structure");
    }
    console.error("Error parsing connections data:", error);
    throw new DiscordFetchAPIError("Unknown error occurred");
  }
};
