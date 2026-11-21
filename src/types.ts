export type StaffRole = 'dentist' | 'hygienist' | 'receptionist' | 'clinic_manager'

export interface Staff {
  id: string
  givenName: string
  familyName: string
  role: StaffRole
}

export type ConditionKey =
  | 'diabetes'
  | 'blood_pressure'
  | 'heart'
  | 'bleeding'
  | 'allergy'
  | 'respiratory'
  | 'neurological'
  | 'liver_kidney'
  | 'cancer_treatment'
  | 'pregnancy'
  | 'anesthesia'
  | 'other'

export type ConditionStatus = 'present' | 'absent' | 'unknown' | 'not_applicable'

export interface ConditionRecord {
  key: ConditionKey
  status: ConditionStatus
  detail: string
}

export type MedicationStatus = 'current' | 'stopped' | 'as_needed' | 'unknown'

export interface Medication {
  id: string
  name: string
  dose: string
  frequency: string
  status: MedicationStatus
  notes: string
}

export type DentalKey =
  | 'extraction'
  | 'orthodontics'
  | 'periodontal'
  | 'prosthesis'
  | 'trauma'
  | 'other'

export interface DentalItem {
  key: DentalKey
  status: ConditionStatus
  detail: string
}

export interface Address {
  street: string
  city: string
  postalCode: string
  country: string
}

export interface Patient {
  id: string
  givenName: string
  familyName: string
  dateOfBirth: string
  phoneDigits: string
  email: string
  address: Address
  conditions: ConditionRecord[]
  medications: Medication[]
  dental: DentalItem[]
  dentalNotes: string
}

export type RecordStatus = 'finding' | 'planned' | 'in_progress' | 'completed'
export type TreatmentStatus = 'planned' | 'in_progress' | 'completed'

export interface NoteRevision {
  at: string
  authorId: string
  body: string
  toothFdi: string | null
  status: RecordStatus
}

export interface VisitNote {
  id: string
  patientId: string
  appointmentId: string | null
  createdAt: string
  revisions: NoteRevision[]
  deletedAt?: string | null
  deletedById?: string | null
}

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'cancelled'
export type AppointmentKind = 'appointment' | 'follow_up'

export interface AppointmentRevision {
  at: string
  authorId: string
  date: string
  time: string
  durationMinutes: number
  providerId: string
  roomId: string
  status: AppointmentStatus
  reason: string
}

export interface Appointment {
  id: string
  patientId: string
  kind: AppointmentKind
  sourceNoteId: string | null
  createdAt: string
  revisions: AppointmentRevision[]
}

export interface TreatmentRevision {
  at: string
  authorId: string
  description: string
  toothFdi: string | null
  status: TreatmentStatus
  price: number
}

export interface TreatmentItem {
  id: string
  patientId: string
  currency: string
  createdAt: string
  revisions: TreatmentRevision[]
}

export type DocumentKind = 'intraoral_scan' | 'radiograph' | 'photo' | 'referral' | 'other'

export interface ClinicalDocument {
  id: string
  patientId: string
  kind: DocumentKind
  title: string
  date: string
  source: string
  originalFileName: string
  previewLabel: string | null
  visitNoteId?: string | null
}

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'other'

export interface InvoiceLine {
  id: string
  description: string
  toothFdi: string | null
  amount: number
}

export interface Payment {
  id: string
  date: string
  amount: number
  method: PaymentMethod
  note: string
  recordedAt: string
  authorId: string
}

export interface InvoiceRevision {
  at: string
  authorId: string
  summary: string
}

export interface Invoice {
  id: string
  patientId: string
  currency: string
  issuedOn: string
  lines: InvoiceLine[]
  payments: Payment[]
  revisions: InvoiceRevision[]
}

export interface Room {
  id: string
  name: string
}

export interface ClinicSettings {
  dir: 'ltr' | 'rtl'
  intlLocale: 'en-IL' | 'en-GB' | 'en-US'
  currency: 'ILS' | 'USD' | 'EUR' | 'GBP'
  weekStartsOn: 0 | 1 | 6
  nameOrder: 'given-family' | 'family-given'
  toothNotation: 'fdi'
  phonePreset: 'il-mobile' | 'international'
  addressPreset: 'street-city' | 'city-street'
}

export interface ClinicState {
  clinicName: string
  city: string
  settings: ClinicSettings
  staff: Staff[]
  rooms: Room[]
  actingStaffId: string
  patients: Patient[]
  notes: VisitNote[]
  appointments: Appointment[]
  treatments: TreatmentItem[]
  documents: ClinicalDocument[]
  invoices: Invoice[]
}

export const CONDITION_KEYS: ConditionKey[] = [
  'diabetes',
  'blood_pressure',
  'heart',
  'bleeding',
  'allergy',
  'respiratory',
  'neurological',
  'liver_kidney',
  'cancer_treatment',
  'pregnancy',
  'anesthesia',
  'other',
]

export const DENTAL_KEYS: DentalKey[] = [
  'extraction',
  'orthodontics',
  'periodontal',
  'prosthesis',
  'trauma',
  'other',
]
