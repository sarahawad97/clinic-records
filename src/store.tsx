import { createContext, useContext, useEffect, useReducer, useState, type ReactNode } from 'react'
import { nowIso } from './format'
import { parseStoredState, seedState, serializeState, STORAGE_KEY } from './seed'
import {
  CONDITION_KEYS,
  DENTAL_KEYS,
  type Appointment,
  type AppointmentKind,
  type AppointmentRevision,
  type AppointmentStatus,
  type ClinicalDocument,
  type ClinicSettings,
  type ClinicState,
  type DocumentKind,
  type InvoiceRevision,
  type NoteRevision,
  type Patient,
  type Payment,
  type RecordStatus,
  type TreatmentRevision,
  type TreatmentStatus,
  type VisitNote,
} from './types'

type Action =
  | { type: 'hydrate'; state: ClinicState }
  | { type: 'setActingStaff'; id: string }
  | { type: 'updateSettings'; patch: Partial<ClinicSettings> }
  | { type: 'setClinicName'; name: string }
  | { type: 'addPatient'; patient: Patient }
  | { type: 'addNote'; note: VisitNote }
  | { type: 'reviseNote'; noteId: string; revision: NoteRevision }
  | { type: 'deleteNote'; noteId: string; deletedAt: string; deletedById: string }
  | { type: 'addDocument'; document: ClinicalDocument }
  | { type: 'addAppointment'; appointment: Appointment }
  | { type: 'reviseAppointment'; appointmentId: string; revision: AppointmentRevision }
  | { type: 'setTreatmentStatus'; treatmentId: string; revision: TreatmentRevision }
  | { type: 'addPayment'; invoiceId: string; payment: Payment; revision: InvoiceRevision }

function reducer(state: ClinicState, action: Action): ClinicState {
  switch (action.type) {
    case 'hydrate':
      return action.state
    case 'setActingStaff':
      return { ...state, actingStaffId: action.id }
    case 'updateSettings':
      return { ...state, settings: { ...state.settings, ...action.patch } }
    case 'setClinicName':
      return { ...state, clinicName: action.name }
    case 'addPatient':
      return { ...state, patients: [action.patient, ...state.patients] }
    case 'addNote':
      return { ...state, notes: [action.note, ...state.notes] }
    case 'reviseNote':
      return {
        ...state,
        notes: state.notes.map((note) =>
          note.id === action.noteId ? { ...note, revisions: [...note.revisions, action.revision] } : note,
        ),
      }
    case 'deleteNote':
      return {
        ...state,
        notes: state.notes.map((note) =>
          note.id === action.noteId
            ? { ...note, deletedAt: action.deletedAt, deletedById: action.deletedById }
            : note,
        ),
      }
    case 'addDocument':
      return { ...state, documents: [action.document, ...state.documents] }
    case 'addAppointment':
      return { ...state, appointments: [action.appointment, ...state.appointments] }
    case 'reviseAppointment':
      return {
        ...state,
        appointments: state.appointments.map((appointment) =>
          appointment.id === action.appointmentId
            ? { ...appointment, revisions: [...appointment.revisions, action.revision] }
            : appointment,
        ),
      }
    case 'setTreatmentStatus':
      return {
        ...state,
        treatments: state.treatments.map((item) =>
          item.id === action.treatmentId ? { ...item, revisions: [...item.revisions, action.revision] } : item,
        ),
      }
    case 'addPayment':
      return {
        ...state,
        invoices: state.invoices.map((invoice) =>
          invoice.id === action.invoiceId
            ? {
                ...invoice,
                payments: [...invoice.payments, action.payment],
                revisions: [...invoice.revisions, action.revision],
              }
            : invoice,
        ),
      }
    default:
      return state
  }
}

interface ClinicApi {
  phase: 'loading' | 'error' | 'ready'
  state: ClinicState
  persistError: boolean
  restoreDemo: () => void
  setActingStaff: (id: string) => void
  updateSettings: (patch: Partial<ClinicSettings>) => void
  setClinicName: (name: string) => void
  addPatient: (input: {
    givenName: string
    familyName: string
    dateOfBirth: string
    phoneDigits: string
    email: string
    street: string
    city: string
    postalCode: string
    country: string
  }) => string
  addNote: (input: {
    patientId: string
    body: string
    toothFdi: string | null
    status: RecordStatus
    appointmentId: string | null
  }) => string
  reviseNote: (
    noteId: string,
    input: { body: string; toothFdi: string | null; status: RecordStatus },
  ) => void
  deleteNote: (noteId: string) => void
  addDocument: (input: {
    patientId: string
    kind: DocumentKind
    title: string
    date: string
    source: string
    originalFileName: string
    previewLabel: string | null
    visitNoteId?: string | null
  }) => string
  addAppointment: (input: {
    patientId: string
    kind: AppointmentKind
    sourceNoteId: string | null
    date: string
    time: string
    durationMinutes: number
    providerId: string
    roomId: string
    status: AppointmentStatus
    reason: string
  }) => string
  reviseAppointment: (
    appointmentId: string,
    input: {
      date: string
      time: string
      durationMinutes: number
      providerId: string
      roomId: string
      status: AppointmentStatus
      reason: string
    },
  ) => void
  setTreatmentStatus: (treatmentId: string, status: TreatmentStatus) => void
  addPayment: (input: {
    invoiceId: string
    date: string
    amount: number
    method: Payment['method']
    note: string
  }) => void
}

const ClinicContext = createContext<ClinicApi | null>(null)

export function ClinicProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, seedState)
  const [phase, setPhase] = useState<ClinicApi['phase']>('loading')
  const [persistError, setPersistError] = useState(false)

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      if (cancelled) return
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (!raw) {
          dispatch({ type: 'hydrate', state: seedState() })
        } else {
          dispatch({ type: 'hydrate', state: parseStoredState(raw) })
        }
        setPhase('ready')
      } catch {
        setPhase('error')
      }
    }, 200)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (phase !== 'ready') return
    try {
      window.localStorage.setItem(STORAGE_KEY, serializeState(state))
      setPersistError(false)
    } catch {
      setPersistError(true)
    }
  }, [state, phase])

  const api: ClinicApi = {
    phase,
    state,
    persistError,
    restoreDemo: () => {
      dispatch({ type: 'hydrate', state: seedState() })
      setPhase('ready')
    },
    setActingStaff: (id) => dispatch({ type: 'setActingStaff', id }),
    updateSettings: (patch) => dispatch({ type: 'updateSettings', patch }),
    setClinicName: (name) => dispatch({ type: 'setClinicName', name }),
    addPatient: (input) => {
      const patient: Patient = {
        id: crypto.randomUUID(),
        givenName: input.givenName.trim(),
        familyName: input.familyName.trim(),
        dateOfBirth: input.dateOfBirth,
        phoneDigits: input.phoneDigits,
        email: input.email.trim(),
        address: {
          street: input.street.trim(),
          city: input.city.trim() || state.city,
          postalCode: input.postalCode.trim(),
          country: input.country.trim() || 'Israel',
        },
        conditions: CONDITION_KEYS.map((key) => ({ key, status: 'unknown', detail: '' })),
        medications: [],
        dental: DENTAL_KEYS.map((key) => ({ key, status: 'unknown', detail: '' })),
        dentalNotes: '',
      }
      dispatch({ type: 'addPatient', patient })
      return patient.id
    },
    addNote: (input) => {
      const at = nowIso()
      const note: VisitNote = {
        id: crypto.randomUUID(),
        patientId: input.patientId,
        appointmentId: input.appointmentId,
        createdAt: at,
        revisions: [
          {
            at,
            authorId: state.actingStaffId,
            body: input.body.trim(),
            toothFdi: input.toothFdi,
            status: input.status,
          },
        ],
      }
      dispatch({ type: 'addNote', note })
      return note.id
    },
    reviseNote: (noteId, input) => {
      dispatch({
        type: 'reviseNote',
        noteId,
        revision: {
          at: nowIso(),
          authorId: state.actingStaffId,
          body: input.body.trim(),
          toothFdi: input.toothFdi,
          status: input.status,
        },
      })
    },
    deleteNote: (noteId) => {
      dispatch({
        type: 'deleteNote',
        noteId,
        deletedAt: nowIso(),
        deletedById: state.actingStaffId,
      })
    },
    addDocument: (input) => {
      const document: ClinicalDocument = {
        id: crypto.randomUUID(),
        patientId: input.patientId,
        kind: input.kind,
        title: input.title.trim(),
        date: input.date,
        source: input.source.trim(),
        originalFileName: input.originalFileName.trim(),
        previewLabel: input.previewLabel,
        visitNoteId: input.visitNoteId ?? null,
      }
      dispatch({ type: 'addDocument', document })
      return document.id
    },
    addAppointment: (input) => {
      const at = nowIso()
      const appointment: Appointment = {
        id: crypto.randomUUID(),
        patientId: input.patientId,
        kind: input.kind,
        sourceNoteId: input.sourceNoteId,
        createdAt: at,
        revisions: [
          {
            at,
            authorId: state.actingStaffId,
            date: input.date,
            time: input.time,
            durationMinutes: input.durationMinutes,
            providerId: input.providerId,
            roomId: input.roomId,
            status: input.status,
            reason: input.reason.trim(),
          },
        ],
      }
      dispatch({ type: 'addAppointment', appointment })
      return appointment.id
    },
    reviseAppointment: (appointmentId, input) => {
      dispatch({
        type: 'reviseAppointment',
        appointmentId,
        revision: {
          at: nowIso(),
          authorId: state.actingStaffId,
          date: input.date,
          time: input.time,
          durationMinutes: input.durationMinutes,
          providerId: input.providerId,
          roomId: input.roomId,
          status: input.status,
          reason: input.reason.trim(),
        },
      })
    },
    setTreatmentStatus: (treatmentId, status) => {
      const item = state.treatments.find((entry) => entry.id === treatmentId)
      if (!item) return
      const latest = item.revisions[item.revisions.length - 1]
      const revision: TreatmentRevision = {
        at: nowIso(),
        authorId: state.actingStaffId,
        description: latest.description,
        toothFdi: latest.toothFdi,
        status,
        price: latest.price,
      }
      dispatch({ type: 'setTreatmentStatus', treatmentId, revision })
    },
    addPayment: (input) => {
      const at = nowIso()
      const payment: Payment = {
        id: crypto.randomUUID(),
        date: input.date,
        amount: input.amount,
        method: input.method,
        note: input.note.trim(),
        recordedAt: at,
        authorId: state.actingStaffId,
      }
      dispatch({
        type: 'addPayment',
        invoiceId: input.invoiceId,
        payment,
        revision: { at, authorId: state.actingStaffId, summary: 'payment' },
      })
    },
  }

  return <ClinicContext.Provider value={api}>{children}</ClinicContext.Provider>
}

export function useClinic() {
  const value = useContext(ClinicContext)
  if (!value) throw new Error('useClinic must be used within ClinicProvider')
  return value
}
