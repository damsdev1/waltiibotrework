import { default as RoutesEventSubTwitch } from "@/http/routes/eventsubtwitch.js";
import { default as RoutesOauth2 } from "@/http/routes/oauth2.js";
import { getDirName } from "@/lib/utils.js";
import Fastify from "fastify";
import path from "path";

// Get the directory name
const fastify = Fastify({
  logger: false,
});
fastify.register(import("@fastify/static"), {
  root: path.join(getDirName(import.meta), "public"),
  prefix: "/assets/", // optional: default '/'
});
fastify.register(RoutesOauth2);
fastify.register(RoutesEventSubTwitch);

const startWebServer = async (): Promise<void> => {
  try {
    await fastify.listen({ host: "::", port: 3000 });
    console.info(
      `Server is running on ${process.env.SERVER_URL || "http://localhost:3000"}`,
    );
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

export default startWebServer;
