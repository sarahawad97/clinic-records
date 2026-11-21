export type StaffRole = "dentist" | "hygienist" | "receptionist" | "admin";

export interface StaffMember {
  id: string;
  givenName: string;
  familyName: string;
  role: StaffRole;
}

export type MedicalCategory =
  | "diabetes"
  | "blood_pressure"
  | "heart_circulatory"
  | "bleeding"
  | "allergy"
  | "respiratory"
  | "seizure_neuro"
  | "liver_kidney"
  | "cancer_treatment"
  | "pregnancy"
  | "anesthesia_reaction"
  | "other";

export const MEDICAL_CATEGORIES: MedicalCategory[] = [
  "diabetes",
  "blood_pressure",
  "heart_circulatory",
  "bleeding",
  "allergy",
  "respiratory",
  "seizure_neuro",
  "liver_kidney",
  "cancer_treatment",
  "pregnancy",
  "anesthesia_reaction",
  "other",
];

export type EntryStatus =
  | "active"
  | "resolved"
  | "historical"
  | "not_applicable"
  | "not_recorded";

export interface Revision {
  id: string;
  at: string;
  authorId: string;
  action: "create" | "edit";
  summary: string;
  previous: Record<string, string>;
}

export interface MedicalCondition {
  id: string;
  category: MedicalCategory;
  otherLabel: string;
  detail: string;
  status: EntryStatus;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  revisions: Revision[];
}

export interface Medication {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  status: "current" | "past";
  notes: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  revisions: Revision[];
}

export type DentalItemKind =
  | "extraction"
  | "restoration"
  | "periodontal"
  | "orthodontic"
  | "surgery"
  | "appliance"
  | "other";

export interface DentalHistoryItem {
  id: string;
  kind: DentalItemKind;
  otherLabel: string;
  detail: string;
  toothFdi: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  revisions: Revision[];
}

export interface Address {
  line1: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface Patient {
  id: string;
  chartNumber: string;
  givenName: string;
  familyName: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  address: Address;
  emergencyContactName: string;
  emergencyContactPhone: string;
  medicalConditions: MedicalCondition[];
  medications: Medication[];
  dentalSummary: string;
  dentalItems: DentalHistoryItem[];
}

export interface VisitNote {
  id: string;
  patientId: string;
  summary: string;
  detail: string;
  toothFdi: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  revisions: Revision[];
}

export type ToothEntryStatus = "finding" | "planned" | "in_progress" | "completed";

export const TOOTH_ENTRY_STATUSES: ToothEntryStatus[] = [
  "finding",
  "planned",
  "in_progress",
  "completed",
];

export interface ToothRecord {
  id: string;
  patientId: string;
  visitId: string;
  toothFdi: string;
  status: ToothEntryStatus;
  note: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  revisions: Revision[];
}

export type AppointmentStatus =
  | "scheduled"
  | "checked_in"
  | "completed"
  | "cancelled"
  | "no_show";

export interface Appointment {
  id: string;
  patientId: string;
  start: string;
  durationMinutes: number;
  providerId: string;
  roomId: string;
  status: AppointmentStatus;
  reason: string;
  followUpOfVisitId: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  revisions: Revision[];
}

export type AuditRecordType =
  | "visit"
  | "tooth"
  | "appointment"
  | "condition"
  | "medication"
  | "dental"
  | "settings";

export interface AuditEvent {
  id: string;
  at: string;
  authorId: string;
  recordType: AuditRecordType;
  recordId: string;
  patientId: string;
  action: "create" | "edit";
  summary: string;
}

export type ToothNotationId = "fdi" | "universal" | "palmer";
export type WeekStart = "sunday" | "monday";
export type TimeFormat = "24h" | "12h";
export type DateFormatStyle = "dayMonth" | "monthDay";
export type PhoneFormatStyle = "international" | "grouped";
export type AddressOrder = "streetFirst" | "cityFirst";
export type CurrencyCode = "ILS" | "USD" | "EUR";
export type LocaleId = "en" | "he" | "ar";

export interface ClinicSettings {
  clinicName: string;
  city: string;
  currency: CurrencyCode;
  toothNotation: ToothNotationId;
  weekStartsOn: WeekStart;
  timeFormat: TimeFormat;
  dateFormat: DateFormatStyle;
  phoneFormat: PhoneFormatStyle;
  addressOrder: AddressOrder;
  localeId: LocaleId;
  roomIds: string[];
}

export interface AppState {
  schemaVersion: 1;
  clinic: ClinicSettings;
  staff: StaffMember[];
  patients: Patient[];
  visits: VisitNote[];
  toothRecords: ToothRecord[];
  appointments: Appointment[];
  audit: AuditEvent[];
  actorId: string;
}

export type PatientSection = "details" | "medical" | "dental" | "visits" | "chart";

export const PATIENT_SECTIONS: PatientSection[] = [
  "details",
  "medical",
  "dental",
  "visits",
  "chart",
];
