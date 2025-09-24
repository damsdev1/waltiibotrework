import * as fs from "fs/promises";
import * as path from "path";

export interface BotConfig {
  announceChannel?: string;
  [key: string]: unknown;
}

const basePath = process.cwd();
const filePath = path.join(basePath, "prisma", "db", "config.json");

let cache: BotConfig = {};
let writeQueue: Promise<void> = Promise.resolve(); // queue for writes

// Load config at startup
export async function loadConfig(): Promise<void> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    cache = JSON.parse(raw) as BotConfig;
  } catch (err) {
    console.error("Failed to load config, starting with empty config.", err);
    cache = {};
  }
}

export function getConfig<T = unknown>(key: keyof BotConfig): T | undefined {
  return cache[key] as T | undefined;
}

export function getAllConfig(): BotConfig {
  return cache;
}

/**
 * Set a config value safely with a write queue
 */
export async function setConfig<T = unknown>(key: keyof BotConfig, value: T): Promise<void> {
  cache[key] = value;

  // Chain the write onto the existing queue
  writeQueue = writeQueue.then(async () => {
    try {
      await fs.writeFile(filePath, JSON.stringify(cache, null, 2), "utf8");
    } catch (err) {
      console.error("Failed to write config to file", err);
    }
  });
  // Wait for this write to finish before returning
  await writeQueue;
}
