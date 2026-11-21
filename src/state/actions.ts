import { isAppointmentDuration } from "../domain/scheduling";
import { isFdiTooth } from "../domain/teeth";
import { combineLocalDateTime, createId } from "../domain/ids";
import type {
  AppState,
  Appointment,
  AuditEvent,
  ClinicSettings,
  DentalHistoryItem,
  DentalItemKind,
  EntryStatus,
  MedicalCategory,
  MedicalCondition,
  Medication,
  Revision,
  ToothEntryStatus,
  ToothRecord,
  VisitNote,
} from "../domain/types";

export type ActionError = "required" | "invalidTooth" | "invalidWhen" | "unchanged" | "invalid";

export type ActionResult =
  | { ok: true; state: AppState; id: string }
  | { ok: false; error: ActionError };

function nowIso(): string {
  return new Date().toISOString();
}

function revision(
  authorId: string,
  action: Revision["action"],
  summary: string,
  previous: Record<string, string>,
): Revision {
  return { id: createId(), at: nowIso(), authorId, action, summary, previous };
}

function audit(
  state: AppState,
  event: Omit<AuditEvent, "id" | "at" | "authorId">,
): AuditEvent {
  return {
    id: createId(),
    at: nowIso(),
    authorId: state.actorId,
    ...event,
  };
}

function fail(error: ActionError): ActionResult {
  return { ok: false, error };
}

export function addVisit(
  state: AppState,
  input: {
    patientId: string;
    summary: string;
    detail: string;
    toothFdi: string;
    toothStatus: ToothEntryStatus;
    toothNote: string;
  },
): ActionResult {
  const summary = input.summary.trim();
  const detail = input.detail.trim();
  if (!summary || !detail) return fail("required");
  if (!state.patients.some((patient) => patient.id === input.patientId)) return fail("invalid");
  if (input.toothFdi && !isFdiTooth(input.toothFdi)) return fail("invalidTooth");

  const at = nowIso();
  const visit: VisitNote = {
    id: createId(),
    patientId: input.patientId,
    summary,
    detail,
    toothFdi: input.toothFdi,
    createdAt: at,
    createdBy: state.actorId,
    updatedAt: at,
    updatedBy: state.actorId,
    revisions: [revision(state.actorId, "create", "Visit note added", {})],
  };

  let toothRecords = state.toothRecords;
  const events = [
    audit(state, {
      recordType: "visit",
      recordId: visit.id,
      patientId: input.patientId,
      action: "create",
      summary: "Visit note added",
    }),
  ];

  if (input.toothFdi) {
    const note = input.toothNote.trim() || summary;
    const tooth: ToothRecord = {
      id: createId(),
      patientId: input.patientId,
      visitId: visit.id,
      toothFdi: input.toothFdi,
      status: input.toothStatus,
      note,
      createdAt: at,
      createdBy: state.actorId,
      updatedAt: at,
      updatedBy: state.actorId,
      revisions: [revision(state.actorId, "create", "Tooth entry added", {})],
    };
    toothRecords = [tooth, ...toothRecords];
    events.push(
      audit(state, {
        recordType: "tooth",
        recordId: tooth.id,
        patientId: input.patientId,
        action: "create",
        summary: "Tooth entry added",
      }),
    );
  }

  return {
    ok: true,
    id: visit.id,
    state: {
      ...state,
      visits: [visit, ...state.visits],
      toothRecords,
      audit: [...events, ...state.audit],
    },
  };
}

export function editVisit(
  state: AppState,
  input: { visitId: string; summary: string; detail: string },
): ActionResult {
  const summary = input.summary.trim();
  const detail = input.detail.trim();
  if (!summary || !detail) return fail("required");
  const current = state.visits.find((visit) => visit.id === input.visitId);
  if (!current) return fail("invalid");
  if (current.summary === summary && current.detail === detail) return fail("unchanged");

  const at = nowIso();
  const next: VisitNote = {
    ...current,
    summary,
    detail,
    updatedAt: at,
    updatedBy: state.actorId,
    revisions: [
      ...current.revisions,
      revision(state.actorId, "edit", "Visit note edited", {
        summary: current.summary,
        detail: current.detail,
      }),
    ],
  };

  return {
    ok: true,
    id: next.id,
    state: {
      ...state,
      visits: state.visits.map((visit) => (visit.id === next.id ? next : visit)),
      audit: [
        audit(state, {
          recordType: "visit",
          recordId: next.id,
          patientId: next.patientId,
          action: "edit",
          summary: "Visit note edited",
        }),
        ...state.audit,
      ],
    },
  };
}

export function addToothEntry(
  state: AppState,
  input: {
    patientId: string;
    visitId: string;
    toothFdi: string;
    status: ToothEntryStatus;
    note: string;
  },
): ActionResult {
  const note = input.note.trim();
  if (!note) return fail("required");
  if (!isFdiTooth(input.toothFdi)) return fail("invalidTooth");
  const visit = state.visits.find((item) => item.id === input.visitId && item.patientId === input.patientId);
  if (!visit) return fail("invalid");

  const at = nowIso();
  const tooth: ToothRecord = {
    id: createId(),
    patientId: input.patientId,
    visitId: visit.id,
    toothFdi: input.toothFdi,
    status: input.status,
    note,
    createdAt: at,
    createdBy: state.actorId,
    updatedAt: at,
    updatedBy: state.actorId,
    revisions: [revision(state.actorId, "create", "Tooth entry added", {})],
  };

  const linkedVisit =
    visit.toothFdi === tooth.toothFdi
      ? visit
      : {
          ...visit,
          toothFdi: visit.toothFdi || tooth.toothFdi,
        };

  return {
    ok: true,
    id: tooth.id,
    state: {
      ...state,
      visits: state.visits.map((item) => (item.id === linkedVisit.id ? linkedVisit : item)),
      toothRecords: [tooth, ...state.toothRecords],
      audit: [
        audit(state, {
          recordType: "tooth",
          recordId: tooth.id,
          patientId: input.patientId,
          action: "create",
          summary: "Tooth entry added",
        }),
        ...state.audit,
      ],
    },
  };
}

export function updateToothEntry(
  state: AppState,
  input: { recordId: string; status: ToothEntryStatus; note: string },
): ActionResult {
  const note = input.note.trim();
  if (!note) return fail("required");
  const current = state.toothRecords.find((record) => record.id === input.recordId);
  if (!current) return fail("invalid");
  if (current.status === input.status && current.note === note) return fail("unchanged");

  const at = nowIso();
  const next: ToothRecord = {
    ...current,
    status: input.status,
    note,
    updatedAt: at,
    updatedBy: state.actorId,
    revisions: [
      ...current.revisions,
      revision(state.actorId, "edit", "Tooth entry updated", {
        status: current.status,
        note: current.note,
      }),
    ],
  };

  return {
    ok: true,
    id: next.id,
    state: {
      ...state,
      toothRecords: state.toothRecords.map((record) => (record.id === next.id ? next : record)),
      audit: [
        audit(state, {
          recordType: "tooth",
          recordId: next.id,
          patientId: next.patientId,
          action: "edit",
          summary: "Tooth entry updated",
        }),
        ...state.audit,
      ],
    },
  };
}

export function scheduleFollowUp(
  state: AppState,
  input: {
    patientId: string;
    visitId: string;
    date: string;
    time: string;
    durationMinutes: number;
    providerId: string;
    roomId: string;
    reason: string;
  },
): ActionResult {
  const reason = input.reason.trim();
  if (!reason || !input.date || !input.time) return fail("required");
  const start = combineLocalDateTime(input.date, input.time);
  if (!start || new Date(start).getTime() <= Date.now()) return fail("invalidWhen");
  if (!isAppointmentDuration(input.durationMinutes)) return fail("invalid");
  const provider = state.staff.find((person) => person.id === input.providerId);
  if (!provider || (provider.role !== "dentist" && provider.role !== "hygienist")) return fail("invalid");
  if (!state.clinic.roomIds.includes(input.roomId)) return fail("invalid");
  const visit = state.visits.find((item) => item.id === input.visitId && item.patientId === input.patientId);
  if (!visit) return fail("invalid");

  const at = nowIso();
  const appointment: Appointment = {
    id: createId(),
    patientId: input.patientId,
    start,
    durationMinutes: input.durationMinutes,
    providerId: input.providerId,
    roomId: input.roomId,
    status: "scheduled",
    reason,
    followUpOfVisitId: visit.id,
    createdAt: at,
    createdBy: state.actorId,
    updatedAt: at,
    updatedBy: state.actorId,
    revisions: [revision(state.actorId, "create", "Follow-up scheduled", {})],
  };

  return {
    ok: true,
    id: appointment.id,
    state: {
      ...state,
      appointments: [...state.appointments, appointment],
      audit: [
        audit(state, {
          recordType: "appointment",
          recordId: appointment.id,
          patientId: input.patientId,
          action: "create",
          summary: "Follow-up scheduled",
        }),
        ...state.audit,
      ],
    },
  };
}

export function addCondition(
  state: AppState,
  input: {
    patientId: string;
    category: MedicalCategory;
    otherLabel: string;
    detail: string;
    status: EntryStatus;
  },
): ActionResult {
  const detail = input.detail.trim();
  const otherLabel = input.otherLabel.trim();
  if (!detail || !input.category || !input.status) return fail("required");
  if (input.category === "other" && !otherLabel) return fail("required");
  if (!state.patients.some((patient) => patient.id === input.patientId)) return fail("invalid");

  const at = nowIso();
  const condition: MedicalCondition = {
    id: createId(),
    category: input.category,
    otherLabel: input.category === "other" ? otherLabel : "",
    detail,
    status: input.status,
    createdAt: at,
    createdBy: state.actorId,
    updatedAt: at,
    updatedBy: state.actorId,
    revisions: [revision(state.actorId, "create", "Condition recorded", {})],
  };

  return {
    ok: true,
    id: condition.id,
    state: {
      ...state,
      patients: state.patients.map((patient) =>
        patient.id === input.patientId
          ? { ...patient, medicalConditions: [...patient.medicalConditions, condition] }
          : patient,
      ),
      audit: [
        audit(state, {
          recordType: "condition",
          recordId: condition.id,
          patientId: input.patientId,
          action: "create",
          summary: "Condition recorded",
        }),
        ...state.audit,
      ],
    },
  };
}

export function addMedication(
  state: AppState,
  input: {
    patientId: string;
    name: string;
    dose: string;
    frequency: string;
    status: Medication["status"];
    notes: string;
  },
): ActionResult {
  const name = input.name.trim();
  const dose = input.dose.trim();
  const frequency = input.frequency.trim();
  if (!name || !dose || !frequency) return fail("required");
  if (!state.patients.some((patient) => patient.id === input.patientId)) return fail("invalid");

  const at = nowIso();
  const medication: Medication = {
    id: createId(),
    name,
    dose,
    frequency,
    status: input.status,
    notes: input.notes.trim(),
    createdAt: at,
    createdBy: state.actorId,
    updatedAt: at,
    updatedBy: state.actorId,
    revisions: [revision(state.actorId, "create", "Medication recorded", {})],
  };

  return {
    ok: true,
    id: medication.id,
    state: {
      ...state,
      patients: state.patients.map((patient) =>
        patient.id === input.patientId
          ? { ...patient, medications: [...patient.medications, medication] }
          : patient,
      ),
      audit: [
        audit(state, {
          recordType: "medication",
          recordId: medication.id,
          patientId: input.patientId,
          action: "create",
          summary: "Medication recorded",
        }),
        ...state.audit,
      ],
    },
  };
}

export function addDentalItem(
  state: AppState,
  input: {
    patientId: string;
    kind: DentalItemKind;
    otherLabel: string;
    detail: string;
    toothFdi: string;
  },
): ActionResult {
  const detail = input.detail.trim();
  const otherLabel = input.otherLabel.trim();
  if (!detail) return fail("required");
  if (input.kind === "other" && !otherLabel) return fail("required");
  if (input.toothFdi && !isFdiTooth(input.toothFdi)) return fail("invalidTooth");
  if (!state.patients.some((patient) => patient.id === input.patientId)) return fail("invalid");

  const at = nowIso();
  const item: DentalHistoryItem = {
    id: createId(),
    kind: input.kind,
    otherLabel: input.kind === "other" ? otherLabel : "",
    detail,
    toothFdi: input.toothFdi,
    createdAt: at,
    createdBy: state.actorId,
    updatedAt: at,
    updatedBy: state.actorId,
    revisions: [revision(state.actorId, "create", "Dental history item recorded", {})],
  };

  return {
    ok: true,
    id: item.id,
    state: {
      ...state,
      patients: state.patients.map((patient) =>
        patient.id === input.patientId
          ? { ...patient, dentalItems: [...patient.dentalItems, item] }
          : patient,
      ),
      audit: [
        audit(state, {
          recordType: "dental",
          recordId: item.id,
          patientId: input.patientId,
          action: "create",
          summary: "Dental history item recorded",
        }),
        ...state.audit,
      ],
    },
  };
}

export function updateSettings(
  state: AppState,
  patch: Pick<
    ClinicSettings,
    | "clinicName"
    | "city"
    | "currency"
    | "weekStartsOn"
    | "timeFormat"
    | "dateFormat"
    | "phoneFormat"
    | "addressOrder"
  >,
): ActionResult {
  const clinicName = patch.clinicName.trim();
  const city = patch.city.trim();
  if (!clinicName || !city) return fail("required");
  const previous = {
    clinicName: state.clinic.clinicName,
    city: state.clinic.city,
    currency: state.clinic.currency,
  };
  const same =
    previous.clinicName === clinicName &&
    previous.city === city &&
    state.clinic.currency === patch.currency &&
    state.clinic.weekStartsOn === patch.weekStartsOn &&
    state.clinic.timeFormat === patch.timeFormat &&
    state.clinic.dateFormat === patch.dateFormat &&
    state.clinic.phoneFormat === patch.phoneFormat &&
    state.clinic.addressOrder === patch.addressOrder;
  if (same) return fail("unchanged");

  return {
    ok: true,
    id: "clinic",
    state: {
      ...state,
      clinic: { ...state.clinic, ...patch, clinicName, city, localeId: "en", toothNotation: "fdi" },
      audit: [
        audit(state, {
          recordType: "settings",
          recordId: "clinic",
          patientId: "",
          action: "edit",
          summary: "Clinic display settings updated",
        }),
        ...state.audit,
      ],
    },
  };
}
