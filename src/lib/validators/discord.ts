import z from "zod";

export const DiscordOAuth2TokenValidator = z.object({
  token_type: z.literal("Bearer"),
  access_token: z.string().min(1),
  expires_in: z.number(),
  refresh_token: z.string(),
  scope: z.string(),
});

export type DiscordOAuth2Token = z.infer<typeof DiscordOAuth2TokenValidator>;

export const DiscordUserMeValidator = z.object({
  id: z.string().min(1),
});
export type DiscordUserMe = z.infer<typeof DiscordUserMeValidator>;

const DiscordConnectionValidator = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
});

export const DiscordConnectionsValidator = z.array(DiscordConnectionValidator);
export type DiscordConnections = z.infer<typeof DiscordConnectionsValidator>;
