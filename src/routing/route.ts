import { useEffect, useState } from "react";
import { PATIENT_SECTIONS, type PatientSection } from "../domain/types";

export type Route =
  | { name: "today" }
  | { name: "patients" }
  | { name: "patient"; patientId: string; section: PatientSection }
  | { name: "calendar" }
  | { name: "settings" };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#/, "").replace(/^\//, "").split("/").filter(Boolean);
  if (parts[0] === "patients" && parts[1]) {
    const section = PATIENT_SECTIONS.find((item) => item === parts[2]) ?? "details";
    return { name: "patient", patientId: decodeURIComponent(parts[1]), section };
  }
  if (parts[0] === "patients") return { name: "patients" };
  if (parts[0] === "calendar") return { name: "calendar" };
  if (parts[0] === "settings") return { name: "settings" };
  return { name: "today" };
}

export function hrefFor(route: Route): string {
  switch (route.name) {
    case "today":
      return "#/today";
    case "patients":
      return "#/patients";
    case "patient":
      return `#/patients/${encodeURIComponent(route.patientId)}/${route.section}`;
    case "calendar":
      return "#/calendar";
    case "settings":
      return "#/settings";
  }
}

export function useHashRoute(): Route {
  const [hash, setHash] = useState(() => window.location.hash || "#/today");

  useEffect(() => {
    const onChange = () => setHash(window.location.hash || "#/today");
    window.addEventListener("hashchange", onChange);
    if (!window.location.hash) window.location.replace("#/today");
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return parseHash(hash);
}
