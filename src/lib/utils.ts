import path from "path";
import { fileURLToPath } from "url";

export const getDirName = (meta: ImportMeta): string => {
  const __filename = fileURLToPath(meta.url);
  return path.dirname(__filename);
};

export const getUserLang = (locale: string | null | undefined): string => {
  const userLang = locale || "fr";
  return userLang;
};
