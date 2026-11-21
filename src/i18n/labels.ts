import type { Translator } from "./i18n";
import type {
  AppointmentStatus,
  DentalItemKind,
  EntryStatus,
  MedicalCategory,
  Medication,
  StaffRole,
  ToothEntryStatus,
} from "../domain/types";

export function categoryLabel(t: Translator, category: MedicalCategory): string {
  switch (category) {
    case "diabetes":
      return t("categories.diabetes");
    case "blood_pressure":
      return t("categories.blood_pressure");
    case "heart_circulatory":
      return t("categories.heart_circulatory");
    case "bleeding":
      return t("categories.bleeding");
    case "allergy":
      return t("categories.allergy");
    case "respiratory":
      return t("categories.respiratory");
    case "seizure_neuro":
      return t("categories.seizure_neuro");
    case "liver_kidney":
      return t("categories.liver_kidney");
    case "cancer_treatment":
      return t("categories.cancer_treatment");
    case "pregnancy":
      return t("categories.pregnancy");
    case "anesthesia_reaction":
      return t("categories.anesthesia_reaction");
    case "other":
      return t("categories.other");
  }
}

export function entryStatusLabel(t: Translator, status: EntryStatus): string {
  switch (status) {
    case "active":
      return t("entryStatus.active");
    case "resolved":
      return t("entryStatus.resolved");
    case "historical":
      return t("entryStatus.historical");
    case "not_applicable":
      return t("entryStatus.not_applicable");
    case "not_recorded":
      return t("entryStatus.not_recorded");
  }
}

export function medicationStatusLabel(t: Translator, status: Medication["status"]): string {
  return status === "current" ? t("medStatus.current") : t("medStatus.past");
}

export function dentalKindLabel(t: Translator, kind: DentalItemKind): string {
  switch (kind) {
    case "extraction":
      return t("dentalKind.extraction");
    case "restoration":
      return t("dentalKind.restoration");
    case "periodontal":
      return t("dentalKind.periodontal");
    case "orthodontic":
      return t("dentalKind.orthodontic");
    case "surgery":
      return t("dentalKind.surgery");
    case "appliance":
      return t("dentalKind.appliance");
    case "other":
      return t("dentalKind.other");
  }
}

export function toothStatusLabel(t: Translator, status: ToothEntryStatus): string {
  switch (status) {
    case "finding":
      return t("toothStatus.finding");
    case "planned":
      return t("toothStatus.planned");
    case "in_progress":
      return t("toothStatus.in_progress");
    case "completed":
      return t("toothStatus.completed");
  }
}

export function appointmentStatusLabel(t: Translator, status: AppointmentStatus): string {
  switch (status) {
    case "scheduled":
      return t("appointmentStatus.scheduled");
    case "checked_in":
      return t("appointmentStatus.checked_in");
    case "completed":
      return t("appointmentStatus.completed");
    case "cancelled":
      return t("appointmentStatus.cancelled");
    case "no_show":
      return t("appointmentStatus.no_show");
  }
}

export function roleLabel(t: Translator, role: StaffRole): string {
  switch (role) {
    case "dentist":
      return t("roles.dentist");
    case "hygienist":
      return t("roles.hygienist");
    case "receptionist":
      return t("roles.receptionist");
    case "admin":
      return t("roles.admin");
  }
}

export function roomLabel(t: Translator, roomId: string): string {
  switch (roomId) {
    case "room-1":
      return t("rooms.room-1");
    case "room-2":
      return t("rooms.room-2");
    case "hygiene":
      return t("rooms.hygiene");
    default:
      return roomId;
  }
}

export function fieldLabel(t: Translator, key: string): string {
  switch (key) {
    case "summary":
      return t("fields.summary");
    case "detail":
      return t("fields.detail");
    case "status":
      return t("fields.status");
    case "note":
      return t("fields.note");
    case "tooth":
      return t("fields.tooth");
    case "reason":
      return t("fields.reason");
    case "dose":
      return t("fields.dose");
    case "frequency":
      return t("fields.frequency");
    case "name":
      return t("fields.name");
    case "category":
      return t("fields.category");
    case "otherLabel":
      return t("fields.otherLabel");
    case "clinicName":
      return t("fields.clinicName");
    case "city":
      return t("fields.city");
    default:
      return key;
  }
}

export function previousValue(t: Translator, key: string, value: string): string {
  if (key !== "status") return value;
  switch (value) {
    case "finding":
    case "planned":
    case "in_progress":
    case "completed":
      return toothStatusLabel(t, value);
    case "active":
    case "resolved":
    case "historical":
    case "not_applicable":
    case "not_recorded":
      return entryStatusLabel(t, value);
    case "current":
    case "past":
      return medicationStatusLabel(t, value);
    case "scheduled":
    case "checked_in":
    case "cancelled":
    case "no_show":
      return appointmentStatusLabel(t, value);
    default:
      return value;
  }
}
