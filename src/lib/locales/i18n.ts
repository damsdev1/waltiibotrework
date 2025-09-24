import type { TranslationKeys, TranslationParams } from "@/lib/types/i18n.js";
import { getDirName } from "@/lib/utils.js";
import type { Locale } from "discord.js";
import { readdirSync } from "fs";
import type { TOptions } from "i18next";
import i18next from "i18next";
import Backend from "i18next-fs-backend";
import path, { basename, extname } from "path";

const dirLocales = path.join(getDirName(import.meta), "../../config/locales");
const preloadedLangs = readdirSync(dirLocales)
  .filter((fileName) => extname(fileName) === ".json")
  .map((fileName) => basename(fileName, ".json"));
export async function initI18n(): Promise<void> {
  // ----- i18next setup -----
  await i18next.use(Backend).init({
    lng: "fr",
    fallbackLng: "fr",
    preload: preloadedLangs,
    backend: {
      loadPath: path.join(dirLocales, "{{lng}}.json"),
      addPath: path.join(dirLocales, "{{lng}}.missing.json"),
    },
    interpolation: { escapeValue: false },
    keySeparator: false,
  });
}

// ----- Typed wrapper -----

export function t<K extends TranslationKeys>(key: K, params?: TranslationParams[K] & TOptions): string {
  return i18next.t(key, params) as string;
}
export function getAllLocalizedTranslations(
  key: TranslationKeys,
  params?: TranslationParams[typeof key] & TOptions,
): Partial<Record<Locale, string | null>> | null {
  const result: Partial<Record<Locale, string | null>> = {};
  for (const lang of preloadedLangs) {
    result[lang as Locale] = i18next.t(key, { lng: lang, ...params }) || null;
  }
  return result;
}
