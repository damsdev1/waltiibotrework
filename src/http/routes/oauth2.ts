import { getDiscordToken, getDiscordUser } from "@/lib/discord/DiscordAPI.js";
import { validatePendingUser } from "@/lib/discord/DiscordPendingAuthorizedUsers.js";
import { prisma } from "@/lib/prisma.js";
import type { UserWithoutId } from "@/lib/types/db.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

const routes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get(
    "/oauth2",
    async (request: FastifyRequest, reply: FastifyReply) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const code = (request.query as any).code;
      try {
        const discordTokenRaw = await getDiscordToken(code);

        const discordToken: UserWithoutId = {
          accessToken: discordTokenRaw.access_token,
          refreshToken: discordTokenRaw.refresh_token,
          tokenExpiry: new Date(Date.now() + discordTokenRaw.expires_in * 1000),
        };
        const discordUser = await getDiscordUser(discordToken);
        await prisma.$transaction(async (tx) => {
          await tx.user.upsert({
            where: { id: discordUser.id },
            update: {
              accessToken: discordToken.accessToken,
              refreshToken: discordToken.refreshToken,
              tokenExpiry: discordToken.tokenExpiry,
            },
            create: {
              id: discordUser.id,
              accessToken: discordToken.accessToken,
              refreshToken: discordToken.refreshToken,
              tokenExpiry: discordToken.tokenExpiry,
            },
          });
        });
        await validatePendingUser(discordUser.id);

        return reply.sendFile("oauthdone.html");
      } catch (error) {
        console.error("Unexpected error during OAuth2 process:", error);
        return reply.status(500).sendFile("oautherror.html");
      }
    },
  );
};

export default routes;
