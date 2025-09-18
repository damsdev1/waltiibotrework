import { DiscordFetchAPIError } from '@/lib/discord/DiscordFetchAPIError.js';
import { prisma } from '@/lib/prisma.js';
import type { UserWithoutId } from '@/lib/types/db.js';
import type { DiscordOAuth2Token } from '@/lib/validators/discord.js';
import { request } from 'urllib';

type FetchResult = { status: number } & Record<string, unknown>;

async function refreshDiscordToken(refreshToken: string): Promise<UserWithoutId> {
  const response = await request("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    data: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.DISCORD_CLIENT_ID!,
      client_secret: process.env.DISCORD_CLIENT_SECRET!,
    }).toString(),
    dataType: "json",
  });

  if (response.status < 200 || response.status >= 300) {
    throw new DiscordFetchAPIError("Failed to refresh access token");
  }

  const data = response.data as DiscordOAuth2Token;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenExpiry: new Date(Date.now() + data.expires_in * 1000),
  };
}
export async function withDiscordToken<T>(
  tokenData: UserWithoutId,
  fetchFn: (accessToken: string) => Promise<T>
): Promise<{ data: T; tokenData: UserWithoutId }> {
  let updated = false;

  // Helper: refresh and persist if successful
  const tryRefresh = async (): Promise<void> => {
    const refreshed = await refreshDiscordToken(tokenData.refreshToken!);
    tokenData = refreshed;
    updated = true;
  };

  // 🔹 1) Expiry check
  if (new Date(tokenData.tokenExpiry!) <= new Date()) {
    await tryRefresh();
  }

  // 🔹 2) API call
  let result: T = await fetchFn(tokenData.accessToken!);

  // 🔹 3) Retry on 401
  if ((result as FetchResult).status === 401) {
    await tryRefresh();
    result = await fetchFn(tokenData.accessToken!);

    if ((result as FetchResult).status === 401) {
      throw new DiscordFetchAPIError("Unauthorized even after token refresh.");
    }
  }

  // 🔹 4) Persist only if refreshed successfully
  if (updated) {
    await prisma.user.update({
      where: { id: tokenData.id },
      data: {
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        tokenExpiry: tokenData.tokenExpiry,
      },
    });
  }

  return { data: result, tokenData };
}