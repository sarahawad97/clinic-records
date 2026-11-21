import { createContext, useContext, useMemo, type ReactNode } from "react";
import { LOCALES } from "./locales";
import { en, translate, type MessageKey } from "./messages";
import type { LocaleId } from "../domain/types";

export type Translator = (key: MessageKey, vars?: Record<string, string | number>) => string;

interface I18nValue {
  t: Translator;
  direction: "ltr" | "rtl";
  localeId: LocaleId;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  localeId,
  children,
}: {
  localeId: LocaleId;
  children: ReactNode;
}) {
  const value = useMemo<I18nValue>(() => {
    const requested = LOCALES[localeId];
    const active = requested.available ? requested : LOCALES.en;
    const t: Translator = (key, vars) => translate(en, key, vars);
    return { t, direction: active.direction, localeId: active.id };
  }, [localeId]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n requires I18nProvider");
  return value;
}
