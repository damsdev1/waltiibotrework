import { default as RoutesOauth2 } from "@/http/routes/oauth2.js";
import Fastify from "fastify";
import path from "path";
import { fileURLToPath } from "url";

// Convert import.meta.url to a file path
const __filename = fileURLToPath(import.meta.url);

// Get the directory name
const __dirname = path.dirname(__filename);
const fastify = Fastify({
  logger: false,
});
fastify.register(import("@fastify/static"), {
  root: path.join(__dirname, "public"),
  prefix: "/assets/", // optional: default '/'
});
fastify.register(RoutesOauth2);

const startWebServer = async (): Promise<void> => {
  try {
    await fastify.listen({ port: 3000 });
    console.log(`Server is running on ${process.env.SERVER_URL || "http://localhost:3000"}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

export default startWebServer;
