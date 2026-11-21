import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createSeedState } from "../data/seed";
import type { AppState, LocaleId } from "../domain/types";
import { I18nProvider } from "../i18n/i18n";
import type { ActionResult } from "./actions";

const STORAGE_KEY = "clinic-records-demo-v1";

export function parseState(raw: string): AppState {
  const value = JSON.parse(raw) as Partial<AppState>;
  if (value.schemaVersion !== 1 || !Array.isArray(value.patients) || !value.clinic || !Array.isArray(value.staff)) {
    throw new Error("Unreadable demonstration records");
  }
  return value as AppState;
}

type ReadyClinic = {
  status: "ready";
  state: AppState;
  persistError: boolean;
  commit: (result: ActionResult) => ActionResult;
  setActor: (actorId: string) => void;
  reset: () => void;
};

type ClinicContextValue =
  | { status: "loading"; reset: () => void }
  | { status: "error"; reset: () => void }
  | ReadyClinic;

const ClinicContext = createContext<ClinicContextValue | null>(null);

export function ClinicProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [state, setState] = useState<AppState | null>(null);
  const [persistError, setPersistError] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setState(raw ? parseState(raw) : createSeedState());
      setPersistError(false);
      setStatus("ready");
    } catch {
      setState(null);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (status !== "ready" || !state) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setPersistError(false);
    } catch {
      setPersistError(true);
    }
  }, [state, status]);

  const localeId: LocaleId = state?.clinic.localeId ?? "en";

  const value = useMemo<ClinicContextValue>(() => {
    const reset = () => {
      setState(createSeedState());
      setPersistError(false);
      setStatus("ready");
    };
    if (status === "loading") return { status, reset };
    if (status === "error" || !state) return { status: "error", reset };
    return {
      status: "ready",
      state,
      persistError,
      reset,
      setActor(actorId: string) {
        setState((current) => (current ? { ...current, actorId } : current));
      },
      commit(result: ActionResult) {
        if (result.ok) setState(result.state);
        return result;
      },
    };
  }, [persistError, state, status]);

  return (
    <ClinicContext.Provider value={value}>
      <I18nProvider localeId={localeId}>{children}</I18nProvider>
    </ClinicContext.Provider>
  );
}

export function useClinic(): ClinicContextValue {
  const value = useContext(ClinicContext);
  if (!value) throw new Error("useClinic requires ClinicProvider");
  return value;
}

export function useReadyClinic(): ReadyClinic {
  const value = useClinic();
  if (value.status !== "ready") throw new Error("Clinic records are not ready");
  return value;
}
