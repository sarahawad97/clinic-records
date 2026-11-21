import type { LocaleId } from "../domain/types";

export interface LocaleDefinition {
  id: LocaleId;
  direction: "ltr" | "rtl";
  available: boolean;
}

/**
 * Hebrew and Arabic are registered so layout direction can be configured later.
 * Their message catalogs stay empty until a person reviews the clinical wording.
 * Do not machine-translate clinical terms into those catalogs.
 */
export const LOCALES: Record<LocaleId, LocaleDefinition> = {
  en: { id: "en", direction: "ltr", available: true },
  he: { id: "he", direction: "rtl", available: false },
  ar: { id: "ar", direction: "rtl", available: false },
};

export const LOCALE_ORDER: LocaleId[] = ["en", "he", "ar"];
