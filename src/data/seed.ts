import { atLocal, createId } from "../domain/ids";
import type {
  AppState,
  Appointment,
  AuditEvent,
  DentalHistoryItem,
  MedicalCondition,
  Medication,
  Revision,
  VisitNote,
  ToothRecord,
} from "../domain/types";

const RUTH = "staff-ruth";
const SAM = "staff-sam";
const LEAH = "staff-leah";

function revision(
  authorId: string,
  at: string,
  summary: string,
  action: Revision["action"] = "create",
  previous: Record<string, string> = {},
): Revision {
  return { id: createId(), at, authorId, action, summary, previous };
}

function condition(
  id: string,
  authorId: string,
  at: string,
  data: Pick<MedicalCondition, "category" | "otherLabel" | "detail" | "status">,
): MedicalCondition {
  return {
    id,
    ...data,
    createdAt: at,
    createdBy: authorId,
    updatedAt: at,
    updatedBy: authorId,
    revisions: [revision(authorId, at, "Condition recorded")],
  };
}

function medication(
  id: string,
  authorId: string,
  at: string,
  data: Pick<Medication, "name" | "dose" | "frequency" | "status" | "notes">,
): Medication {
  return {
    id,
    ...data,
    createdAt: at,
    createdBy: authorId,
    updatedAt: at,
    updatedBy: authorId,
    revisions: [revision(authorId, at, "Medication recorded")],
  };
}

function dentalItem(
  id: string,
  authorId: string,
  at: string,
  data: Pick<DentalHistoryItem, "kind" | "otherLabel" | "detail" | "toothFdi">,
): DentalHistoryItem {
  return {
    id,
    ...data,
    createdAt: at,
    createdBy: authorId,
    updatedAt: at,
    updatedBy: authorId,
    revisions: [revision(authorId, at, "Dental history item recorded")],
  };
}

export function createSeedState(): AppState {
  const earlier = atLocal(-400, 10, 0);
  const lastMonth = atLocal(-32, 14, 0);
  const yesterday = atLocal(-1, 9, 0);
  const recordedAt = atLocal(-120, 11, 30);

  const danaVisit: VisitNote = {
    id: "visit-dana-exam",
    patientId: "patient-dana",
    summary: "Cold sensitivity, upper right",
    detail:
      "Dana Example reported cold sensitivity. Staff recorded a finding on tooth 16. No treatment was completed at this visit.",
    toothFdi: "16",
    createdAt: yesterday,
    createdBy: RUTH,
    updatedAt: yesterday,
    updatedBy: RUTH,
    revisions: [revision(RUTH, yesterday, "Visit note added")],
  };

  const noaVisit: VisitNote = {
    id: "visit-noa-plan",
    patientId: "patient-noa",
    summary: "Plan for tooth 26",
    detail:
      "Staff and Noa Placeholder discussed a future restoration on tooth 26. The item is planned only. It has not been started.",
    toothFdi: "26",
    createdAt: lastMonth,
    createdBy: RUTH,
    updatedAt: lastMonth,
    updatedBy: RUTH,
    revisions: [revision(RUTH, lastMonth, "Visit note added")],
  };

  const omarVisit: VisitNote = {
    id: "visit-omar-progress",
    patientId: "patient-omar",
    summary: "Treatment in progress on tooth 46",
    detail:
      "Staff recorded that treatment on tooth 46 is still in progress. This note does not mark it complete.",
    toothFdi: "46",
    createdAt: earlier,
    createdBy: RUTH,
    updatedAt: earlier,
    updatedBy: RUTH,
    revisions: [revision(RUTH, earlier, "Visit note added")],
  };

  const eliVisit: VisitNote = {
    id: "visit-eli-done",
    patientId: "patient-eli",
    summary: "Completed restoration on tooth 36",
    detail:
      "Staff recorded a completed restoration on tooth 36. The completed status was entered by the dentist, not applied automatically.",
    toothFdi: "36",
    createdAt: earlier,
    createdBy: RUTH,
    updatedAt: earlier,
    updatedBy: RUTH,
    revisions: [revision(RUTH, earlier, "Visit note added")],
  };

  const tooth = (
    id: string,
    visit: VisitNote,
    status: ToothRecord["status"],
    note: string,
  ): ToothRecord => ({
    id,
    patientId: visit.patientId,
    visitId: visit.id,
    toothFdi: visit.toothFdi,
    status,
    note,
    createdAt: visit.createdAt,
    createdBy: visit.createdBy,
    updatedAt: visit.updatedAt,
    updatedBy: visit.updatedBy,
    revisions: [revision(visit.createdBy, visit.createdAt, "Tooth entry added")],
  });

  const appointment = (
    id: string,
    patientId: string,
    start: string,
    durationMinutes: number,
    providerId: string,
    roomId: string,
    status: Appointment["status"],
    reason: string,
    followUpOfVisitId: string,
    authorId: string,
  ): Appointment => ({
    id,
    patientId,
    start,
    durationMinutes,
    providerId,
    roomId,
    status,
    reason,
    followUpOfVisitId,
    createdAt: recordedAt,
    createdBy: authorId,
    updatedAt: recordedAt,
    updatedBy: authorId,
    revisions: [revision(authorId, recordedAt, "Appointment recorded")],
  });

  const audit: AuditEvent[] = [];

  return {
    schemaVersion: 1,
    actorId: RUTH,
    clinic: {
      clinicName: "Sycamore Dental Demo",
      city: "Jerusalem",
      currency: "ILS",
      toothNotation: "fdi",
      weekStartsOn: "sunday",
      timeFormat: "24h",
      dateFormat: "dayMonth",
      phoneFormat: "international",
      addressOrder: "streetFirst",
      localeId: "en",
      roomIds: ["room-1", "room-2", "hygiene"],
    },
    staff: [
      { id: RUTH, givenName: "Ruth", familyName: "Demo", role: "dentist" },
      { id: SAM, givenName: "Sam", familyName: "Example", role: "hygienist" },
      { id: LEAH, givenName: "Leah", familyName: "Sample", role: "receptionist" },
      { id: "staff-amir", givenName: "Amir", familyName: "Demo", role: "admin" },
    ],
    patients: [
      {
        id: "patient-dana",
        chartNumber: "D-1001",
        givenName: "Dana",
        familyName: "Example",
        dateOfBirth: "1986-03-14",
        phone: "+97225550142",
        email: "dana.example@demo.test",
        address: {
          line1: "14 Sample Lane",
          city: "Jerusalem",
          postalCode: "9100001",
          country: "Israel",
        },
        emergencyContactName: "Avi Example",
        emergencyContactPhone: "+97225550143",
        medicalConditions: [
          condition("cond-dana-allergy", RUTH, recordedAt, {
            category: "allergy",
            otherLabel: "",
            detail: "Patient reports a rash after penicillin.",
            status: "active",
          }),
          condition("cond-dana-diabetes", RUTH, recordedAt, {
            category: "diabetes",
            otherLabel: "",
            detail: "Patient reports type 2 diabetes. No recent lab result is on file.",
            status: "active",
          }),
        ],
        medications: [
          medication("med-dana-1", LEAH, recordedAt, {
            name: "Metformin",
            dose: "500 mg",
            frequency: "Twice daily",
            status: "current",
            notes: "Patient-reported. Not verified in this demo.",
          }),
        ],
        dentalSummary: "Regular attender. Reports cold sensitivity on the upper right.",
        dentalItems: [
          dentalItem("dent-dana-1", RUTH, recordedAt, {
            kind: "restoration",
            otherLabel: "",
            detail: "An older restoration is recorded as present. Placement date is unknown.",
            toothFdi: "26",
          }),
        ],
      },
      {
        id: "patient-omar",
        chartNumber: "D-1002",
        givenName: "Omar",
        familyName: "Specimen",
        dateOfBirth: "1972-08-02",
        phone: "+97225550155",
        email: "omar.specimen@demo.test",
        address: {
          line1: "8 Demo Street",
          city: "Jerusalem",
          postalCode: "9100002",
          country: "Israel",
        },
        emergencyContactName: "Rana Specimen",
        emergencyContactPhone: "+97225550156",
        medicalConditions: [
          condition("cond-omar-bp", RUTH, recordedAt, {
            category: "blood_pressure",
            otherLabel: "",
            detail: "Patient reports high blood pressure.",
            status: "active",
          }),
        ],
        medications: [
          medication("med-omar-1", LEAH, recordedAt, {
            name: "Amlodipine",
            dose: "5 mg",
            frequency: "Once daily",
            status: "current",
            notes: "Patient-reported. Not verified in this demo.",
          }),
        ],
        dentalSummary: "Treatment on tooth 46 is recorded as still in progress.",
        dentalItems: [
          dentalItem("dent-omar-1", SAM, recordedAt, {
            kind: "periodontal",
            otherLabel: "",
            detail: "Patient reports a previous deep cleaning.",
            toothFdi: "",
          }),
        ],
      },
      {
        id: "patient-noa",
        chartNumber: "D-1003",
        givenName: "Noa",
        familyName: "Placeholder",
        dateOfBirth: "1994-12-01",
        phone: "+97225550170",
        email: "noa.placeholder@demo.test",
        address: {
          line1: "3 Fictional Court",
          city: "Jerusalem",
          postalCode: "9100003",
          country: "Israel",
        },
        emergencyContactName: "Yonatan Placeholder",
        emergencyContactPhone: "+97225550171",
        medicalConditions: [
          condition("cond-noa-asthma", RUTH, recordedAt, {
            category: "respiratory",
            otherLabel: "",
            detail: "Patient reports asthma and uses an inhaler before dental visits.",
            status: "active",
          }),
          condition("cond-noa-anesthesia", RUTH, recordedAt, {
            category: "anesthesia_reaction",
            otherLabel: "",
            detail: "Patient reports nausea after a previous local anesthetic.",
            status: "historical",
          }),
        ],
        medications: [
          medication("med-noa-1", LEAH, recordedAt, {
            name: "Salbutamol inhaler",
            dose: "2 puffs",
            frequency: "As needed",
            status: "current",
            notes: "Patient-reported. Not verified in this demo.",
          }),
        ],
        dentalSummary: "A restoration on tooth 26 is planned and has not been started.",
        dentalItems: [],
      },
      {
        id: "patient-eli",
        chartNumber: "D-1004",
        givenName: "Eli",
        familyName: "Mock",
        dateOfBirth: "1991-05-19",
        phone: "+97225550188",
        email: "eli.mock@demo.test",
        address: {
          line1: "21 Practice Road",
          city: "Jerusalem",
          postalCode: "9100004",
          country: "Israel",
        },
        emergencyContactName: "Maya Mock",
        emergencyContactPhone: "+97225550189",
        medicalConditions: [],
        medications: [],
        dentalSummary: "One completed restoration is on file. No other treatment is recorded.",
        dentalItems: [],
      },
    ],
    visits: [danaVisit, noaVisit, omarVisit, eliVisit],
    toothRecords: [
      tooth(
        "tooth-dana-16",
        danaVisit,
        "finding",
        "Finding recorded: cold sensitivity. No procedure completed.",
      ),
      tooth(
        "tooth-noa-26",
        noaVisit,
        "planned",
        "Restoration is planned. It has not been started.",
      ),
      tooth(
        "tooth-omar-46",
        omarVisit,
        "in_progress",
        "Treatment is in progress and is not marked complete.",
      ),
      tooth(
        "tooth-eli-36",
        eliVisit,
        "completed",
        "Dentist recorded this restoration as completed.",
      ),
    ],
    appointments: [
      appointment(
        "appt-dana-yesterday",
        "patient-dana",
        yesterday,
        45,
        RUTH,
        "room-1",
        "completed",
        "Examination",
        "",
        LEAH,
      ),
      appointment(
        "appt-omar-today",
        "patient-omar",
        atLocal(0, 9, 30),
        45,
        SAM,
        "hygiene",
        "scheduled",
        "Hygiene visit",
        "",
        LEAH,
      ),
      appointment(
        "appt-noa-today",
        "patient-noa",
        atLocal(0, 11, 15),
        30,
        RUTH,
        "room-2",
        "scheduled",
        "Check-up",
        "",
        LEAH,
      ),
      appointment(
        "appt-dana-followup",
        "patient-dana",
        atLocal(0, 16, 0),
        30,
        RUTH,
        "room-1",
        "scheduled",
        "Follow-up: cold sensitivity",
        danaVisit.id,
        LEAH,
      ),
      appointment(
        "appt-eli-tomorrow",
        "patient-eli",
        atLocal(1, 10, 0),
        60,
        RUTH,
        "room-1",
        "scheduled",
        "New patient visit",
        "",
        LEAH,
      ),
    ],
    audit,
  };
}
