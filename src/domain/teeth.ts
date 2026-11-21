import type { ToothEntryStatus, ToothRecord } from "./types";

/** Adult permanent teeth in FDI notation. */
export const UPPER_RIGHT = ["18", "17", "16", "15", "14", "13", "12", "11"];
export const UPPER_LEFT = ["21", "22", "23", "24", "25", "26", "27", "28"];
export const LOWER_RIGHT = ["48", "47", "46", "45", "44", "43", "42", "41"];
export const LOWER_LEFT = ["31", "32", "33", "34", "35", "36", "37", "38"];

/** Screen order for a clinician facing the patient. The chart isolates direction so RTL layout does not mirror anatomy. */
export const UPPER_ARCH = [...UPPER_RIGHT, ...UPPER_LEFT];
export const LOWER_ARCH = [...LOWER_RIGHT, ...LOWER_LEFT];
export const ALL_TEETH = [...UPPER_ARCH, ...LOWER_ARCH];

const TOOTH_SET = new Set(ALL_TEETH);

export function isFdiTooth(value: string): boolean {
  return TOOTH_SET.has(value);
}

const PRIORITY: ToothEntryStatus[] = ["in_progress", "planned", "finding", "completed"];

export function dominantStatus(records: ToothRecord[]): ToothEntryStatus | "none" {
  for (const status of PRIORITY) {
    if (records.some((record) => record.status === status)) return status;
  }
  return "none";
}

export function statusMark(status: ToothEntryStatus | "none"): string {
  switch (status) {
    case "finding":
      return "F";
    case "planned":
      return "P";
    case "in_progress":
      return "IP";
    case "completed":
      return "C";
    default:
      return "";
  }
}
