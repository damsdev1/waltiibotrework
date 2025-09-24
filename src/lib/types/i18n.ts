import frTranslationsRaw from "@/config/locales/fr.json" with { type: "json" };

// ----- Loaded JSON -----
export const translations = frTranslationsRaw;
type RawTranslations = typeof translations;

type PluralKeys =
  Extract<keyof RawTranslations, `${string}_one`> extends infer P
    ? P extends `${infer Base}_one`
      ? Base
      : never
    : never;

type NormalKeys = Exclude<keyof RawTranslations, `${string}_one` | `${string}_other`>;

type ExtractParams<T extends string> = T extends `${string}{{${infer P}}}${infer Rest}`
  ? { [K in P | keyof ExtractParams<Rest>]: string | number }
  : object;
type PluralParams = {
  [K in PluralKeys]: ExtractParams<string>; // fallback to string because keys are not literal
};
type NormalParams = {
  [K in NormalKeys]: ExtractParams<string>;
};
export type TranslationParams = PluralParams & NormalParams;
export type TranslationKeys = keyof TranslationParams;
