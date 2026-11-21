import { addDays, localIsoDate } from './format'
import {
  CONDITION_KEYS,
  DENTAL_KEYS,
  type Appointment,
  type AppointmentStatus,
  type ClinicState,
  type ConditionKey,
  type ConditionRecord,
  type ConditionStatus,
  type DentalItem,
  type DentalKey,
} from './types'

const today = localIsoDate()

function at(dayOffset: number, time: string) {
  return `${addDays(today, dayOffset)}T${time}:00`
}

/** Extra visits so Overview charts have a readable day/month/year series. */
function historyAppointments(): Appointment[] {
  const patients = [
    'pat-hadas',
    'pat-tamar',
    'pat-rami',
    'pat-yonatan',
    'pat-mira',
    'pat-omar',
    'pat-yasmin',
    'pat-george',
    'pat-hana',
    'pat-khalil',
  ] as const
  const providers = ['staff-noa', 'staff-adam', 'staff-sara'] as const
  const statuses: AppointmentStatus[] = ['scheduled', 'confirmed', 'cancelled']
  const reasons = ['Exam', 'Hygiene visit', 'Follow-up check', 'Composite review', 'Sensitivity review']
  const items: Appointment[] = []
  let n = 0

  for (let day = 2; day <= 45; day += 1) {
    const volume = day % 5 === 0 ? 3 : day % 3 === 0 ? 2 : day % 2 === 0 ? 1 : 0
    for (let i = 0; i < volume; i += 1) {
      n += 1
      const offset = -day
      items.push({
        id: `appt-hist-${n}`,
        patientId: patients[n % patients.length],
        kind: n % 4 === 0 ? 'follow_up' : 'appointment',
        sourceNoteId: null,
        createdAt: at(offset - 2, '09:00'),
        revisions: [
          {
            at: at(offset - 2, '09:00'),
            authorId: 'staff-maya',
            date: addDays(today, offset),
            time: `${String(9 + (i % 6)).padStart(2, '0')}:00`,
            durationMinutes: 30 + (i % 3) * 15,
            providerId: providers[n % providers.length],
            roomId: 'room-1',
            status: statuses[n % statuses.length],
            reason: reasons[n % reasons.length],
          },
        ],
      })
    }
  }

  for (let month = 1; month <= 11; month += 1) {
    const count = 4 + ((month * 3) % 7)
    for (let i = 0; i < count; i += 1) {
      n += 1
      const day = 3 + ((i * 5) % 24)
      const date = `${today.slice(0, 4)}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      if (date >= today) continue
      items.push({
        id: `appt-hist-m-${n}`,
        patientId: patients[n % patients.length],
        kind: 'appointment',
        sourceNoteId: null,
        createdAt: `${date}T08:00:00`,
        revisions: [
          {
            at: `${date}T08:00:00`,
            authorId: 'staff-maya',
            date,
            time: `${String(9 + (i % 7)).padStart(2, '0')}:00`,
            durationMinutes: 30,
            providerId: providers[n % providers.length],
            roomId: 'room-1',
            status: i % 5 === 0 ? 'cancelled' : i % 2 === 0 ? 'confirmed' : 'scheduled',
            reason: reasons[n % reasons.length],
          },
        ],
      })
    }
  }

  for (let yearOffset = 1; yearOffset <= 4; yearOffset += 1) {
    const year = Number(today.slice(0, 4)) - yearOffset
    const count = 18 + yearOffset * 5
    for (let i = 0; i < count; i += 1) {
      n += 1
      const month = 1 + (i % 12)
      const day = 2 + ((i * 3) % 26)
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      items.push({
        id: `appt-hist-y-${n}`,
        patientId: patients[n % patients.length],
        kind: 'appointment',
        sourceNoteId: null,
        createdAt: `${date}T08:00:00`,
        revisions: [
          {
            at: `${date}T08:00:00`,
            authorId: 'staff-maya',
            date,
            time: '10:00',
            durationMinutes: 30,
            providerId: providers[n % providers.length],
            roomId: 'room-1',
            status: 'confirmed',
            reason: reasons[n % reasons.length],
          },
        ],
      })
    }
  }

  return items
}

function conditions(
  partial: Partial<Record<ConditionKey, { status: ConditionStatus; detail: string }>>,
): ConditionRecord[] {
  return CONDITION_KEYS.map((key) => ({
    key,
    status: partial[key]?.status ?? 'unknown',
    detail: partial[key]?.detail ?? '',
  }))
}

function dental(
  partial: Partial<Record<DentalKey, { status: ConditionStatus; detail: string }>>,
): DentalItem[] {
  return DENTAL_KEYS.map((key) => ({
    key,
    status: partial[key]?.status ?? 'unknown',
    detail: partial[key]?.detail ?? '',
  }))
}

export function seedState(): ClinicState {
  return {
    clinicName: 'Sycamore Dental',
    city: 'Jerusalem',
    settings: {
      dir: 'ltr',
      intlLocale: 'en-IL',
      currency: 'ILS',
      weekStartsOn: 6,
      nameOrder: 'given-family',
      toothNotation: 'fdi',
      phonePreset: 'il-mobile',
      addressPreset: 'street-city',
    },
    staff: [
      { id: 'staff-noa', givenName: 'Lina', familyName: 'Harb', role: 'dentist' },
      { id: 'staff-adam', givenName: 'Adam', familyName: 'Qasem', role: 'dentist' },
      { id: 'staff-sara', givenName: 'Reem', familyName: 'Saleh', role: 'hygienist' },
      { id: 'staff-maya', givenName: 'Dalia', familyName: 'Awad', role: 'receptionist' },
      { id: 'staff-eli', givenName: 'Karim', familyName: 'Daher', role: 'clinic_manager' },
    ],
    rooms: [
      { id: 'room-1', name: 'Room 1' },
      { id: 'room-2', name: 'Room 2' },
      { id: 'room-hygiene', name: 'Hygiene bay' },
    ],
    actingStaffId: 'staff-noa',
    patients: [
      {
        id: 'pat-hadas',
        givenName: 'Layla',
        familyName: 'Mansour',
        dateOfBirth: '1984-06-03',
        phoneDigits: '972500000101',
        email: 'layla.mansour@example.com',
        address: {
          street: '8 Demo Orchard',
          city: 'Jerusalem',
          postalCode: '9000001',
          country: 'Israel',
        },
        conditions: conditions({
          diabetes: { status: 'present', detail: 'Patient reports type 2 diabetes.' },
          blood_pressure: { status: 'present', detail: 'Patient reports high blood pressure.' },
          heart: { status: 'absent', detail: '' },
          bleeding: { status: 'unknown', detail: '' },
          allergy: { status: 'present', detail: 'Penicillin. Patient reports a rash.' },
          respiratory: { status: 'absent', detail: '' },
          neurological: { status: 'absent', detail: '' },
          liver_kidney: { status: 'absent', detail: '' },
          cancer_treatment: { status: 'absent', detail: '' },
          pregnancy: { status: 'not_applicable', detail: '' },
          anesthesia: { status: 'absent', detail: 'No reaction reported by the patient.' },
          other: { status: 'present', detail: 'Patient reports a dry mouth.' },
        }),
        medications: [
          {
            id: 'med-hadas-1',
            name: 'Metformin',
            dose: '500 mg',
            frequency: 'Twice daily',
            status: 'current',
            notes: 'Patient says they take it with meals.',
          },
          {
            id: 'med-hadas-2',
            name: 'Amlodipine',
            dose: '5 mg',
            frequency: 'Once daily',
            status: 'current',
            notes: 'Patient reports taking it in the morning.',
          },
        ],
        dental: dental({
          extraction: { status: 'absent', detail: '' },
          orthodontics: { status: 'present', detail: 'Patient reports braces as a teenager.' },
          periodontal: { status: 'absent', detail: '' },
          prosthesis: { status: 'absent', detail: '' },
          trauma: { status: 'absent', detail: '' },
          other: { status: 'present', detail: 'Patient reports cold sensitivity on the upper left.' },
        }),
        dentalNotes: 'Patient asked about a crown for the upper left first molar. This is a record of that request.',
      },
      {
        id: 'pat-rami',
        givenName: 'Rami',
        familyName: 'Khoury',
        dateOfBirth: '1991-11-22',
        phoneDigits: '972500000102',
        email: 'rami.khoury@example.com',
        address: {
          street: '3 Sample Court',
          city: 'Jerusalem',
          postalCode: '9000002',
          country: 'Israel',
        },
        conditions: conditions({
          respiratory: {
            status: 'present',
            detail: 'Patient reports asthma and says they carry an inhaler.',
          },
          bleeding: {
            status: 'present',
            detail: 'Patient reports prolonged bleeding after a past extraction.',
          },
          allergy: { status: 'present', detail: 'Latex. Patient reports itching.' },
          anesthesia: { status: 'unknown', detail: '' },
          heart: { status: 'absent', detail: '' },
          diabetes: { status: 'absent', detail: '' },
        }),
        medications: [
          {
            id: 'med-rami-1',
            name: 'Salbutamol inhaler',
            dose: '2 puffs',
            frequency: 'As needed',
            status: 'as_needed',
            notes: 'Patient reports using it before exercise and when short of breath.',
          },
        ],
        dental: dental({
          extraction: { status: 'present', detail: 'Patient reports a lower molar extraction several years ago.' },
          trauma: { status: 'absent', detail: '' },
          other: { status: 'absent', detail: '' },
        }),
        dentalNotes: '',
      },
      {
        id: 'pat-tamar',
        givenName: 'Nadine',
        familyName: 'Haddad',
        dateOfBirth: '1995-02-14',
        phoneDigits: '972500000103',
        email: 'nadine.haddad@example.com',
        address: {
          street: '21 Fictional Row',
          city: 'Jerusalem',
          postalCode: '9000003',
          country: 'Israel',
        },
        conditions: conditions({
          pregnancy: {
            status: 'present',
            detail: 'Patient reports the second trimester. This is a record of what the patient said, not a recommendation.',
          },
          anesthesia: {
            status: 'present',
            detail: 'Patient reports nausea after previous sedation.',
          },
          allergy: { status: 'absent', detail: '' },
          bleeding: { status: 'absent', detail: '' },
        }),
        medications: [
          {
            id: 'med-tamar-1',
            name: 'Prenatal vitamin',
            dose: '1 tablet',
            frequency: 'Once daily',
            status: 'current',
            notes: 'Patient reports taking a prenatal vitamin. No product was recommended here.',
          },
        ],
        dental: dental({
          orthodontics: { status: 'absent', detail: '' },
          other: { status: 'unknown', detail: '' },
        }),
        dentalNotes: '',
      },
      {
        id: 'pat-yonatan',
        givenName: 'Samir',
        familyName: 'Nasser',
        dateOfBirth: '1978-09-09',
        phoneDigits: '972500000104',
        email: 'samir.nasser@example.com',
        address: {
          street: '5 Prototype Street',
          city: 'Jerusalem',
          postalCode: '9000004',
          country: 'Israel',
        },
        conditions: conditions({
          allergy: { status: 'absent', detail: '' },
          heart: { status: 'unknown', detail: 'Patient was not sure about a past murmur.' },
        }),
        medications: [],
        dental: dental({
          trauma: { status: 'present', detail: 'Patient reports chipping a front tooth in a fall.' },
          prosthesis: { status: 'absent', detail: '' },
        }),
        dentalNotes: 'Patient reports the chip was smoothed at another clinic.',
      },
      {
        id: 'pat-mira',
        givenName: 'Mira',
        familyName: 'Sabbagh',
        dateOfBirth: '1988-04-18',
        phoneDigits: '972500000105',
        email: 'mira.sabbagh@example.com',
        address: {
          street: '12 Olive Lane',
          city: 'Jerusalem',
          postalCode: '9000005',
          country: 'Israel',
        },
        conditions: conditions({
          allergy: { status: 'present', detail: 'Ibuprofen. Patient reports stomach upset.' },
          blood_pressure: { status: 'absent', detail: '' },
        }),
        medications: [],
        dental: dental({
          periodontal: { status: 'present', detail: 'Patient reports gum bleeding when brushing.' },
        }),
        dentalNotes: '',
      },
      {
        id: 'pat-omar',
        givenName: 'Omar',
        familyName: 'Fares',
        dateOfBirth: '1993-07-29',
        phoneDigits: '972500000106',
        email: 'omar.fares@example.com',
        address: {
          street: '44 Cedar Avenue',
          city: 'Jerusalem',
          postalCode: '9000006',
          country: 'Israel',
        },
        conditions: conditions({
          diabetes: { status: 'absent', detail: '' },
          allergy: { status: 'absent', detail: '' },
          heart: { status: 'absent', detail: '' },
        }),
        medications: [],
        dental: dental({
          orthodontics: { status: 'present', detail: 'Patient reports clear aligners finished last year.' },
        }),
        dentalNotes: 'Patient asked about whitening. Recorded as a request only.',
      },
      {
        id: 'pat-yasmin',
        givenName: 'Yasmin',
        familyName: 'Daher',
        dateOfBirth: '2001-12-05',
        phoneDigits: '972500000107',
        email: 'yasmin.daher@example.com',
        address: {
          street: '9 Garden Path',
          city: 'Jerusalem',
          postalCode: '9000007',
          country: 'Israel',
        },
        conditions: conditions({
          allergy: { status: 'absent', detail: '' },
          pregnancy: { status: 'absent', detail: '' },
        }),
        medications: [],
        dental: dental({
          other: { status: 'present', detail: 'Patient reports wisdom tooth discomfort on the lower right.' },
        }),
        dentalNotes: '',
      },
      {
        id: 'pat-george',
        givenName: 'George',
        familyName: 'Salameh',
        dateOfBirth: '1969-03-11',
        phoneDigits: '972500000108',
        email: 'george.salameh@example.com',
        address: {
          street: '17 Hill View',
          city: 'Jerusalem',
          postalCode: '9000008',
          country: 'Israel',
        },
        conditions: conditions({
          blood_pressure: { status: 'present', detail: 'Patient reports controlled high blood pressure.' },
          heart: { status: 'absent', detail: '' },
          allergy: { status: 'absent', detail: '' },
        }),
        medications: [
          {
            id: 'med-george-1',
            name: 'Enalapril',
            dose: '10 mg',
            frequency: 'Once daily',
            status: 'current',
            notes: 'Patient reports taking it in the evening.',
          },
        ],
        dental: dental({
          prosthesis: { status: 'present', detail: 'Patient reports a partial denture on the lower left.' },
          extraction: { status: 'present', detail: 'Patient reports several extractions over the years.' },
        }),
        dentalNotes: '',
      },
      {
        id: 'pat-hana',
        givenName: 'Hana',
        familyName: 'Abboud',
        dateOfBirth: '1986-08-21',
        phoneDigits: '972500000109',
        email: 'hana.abboud@example.com',
        address: {
          street: '2 Market Square',
          city: 'Jerusalem',
          postalCode: '9000009',
          country: 'Israel',
        },
        conditions: conditions({
          respiratory: { status: 'present', detail: 'Patient reports seasonal allergies and mild rhinitis.' },
          allergy: { status: 'unknown', detail: '' },
        }),
        medications: [
          {
            id: 'med-hana-1',
            name: 'Loratadine',
            dose: '10 mg',
            frequency: 'As needed',
            status: 'as_needed',
            notes: 'Patient reports using it during spring.',
          },
        ],
        dental: dental({
          trauma: { status: 'absent', detail: '' },
          other: { status: 'present', detail: 'Patient reports night grinding.' },
        }),
        dentalNotes: 'Patient asked about a night guard. Recorded as a request only.',
      },
      {
        id: 'pat-khalil',
        givenName: 'Khalil',
        familyName: 'Nassar',
        dateOfBirth: '1975-01-30',
        phoneDigits: '972500000110',
        email: 'khalil.nassar@example.com',
        address: {
          street: '28 Valley Road',
          city: 'Jerusalem',
          postalCode: '9000010',
          country: 'Israel',
        },
        conditions: conditions({
          diabetes: { status: 'present', detail: 'Patient reports type 2 diabetes.' },
          liver_kidney: { status: 'absent', detail: '' },
          allergy: { status: 'absent', detail: '' },
        }),
        medications: [
          {
            id: 'med-khalil-1',
            name: 'Metformin',
            dose: '850 mg',
            frequency: 'Twice daily',
            status: 'current',
            notes: 'Patient reports taking it with breakfast and dinner.',
          },
        ],
        dental: dental({
          periodontal: { status: 'present', detail: 'Patient reports previous deep cleaning.' },
          extraction: { status: 'absent', detail: '' },
        }),
        dentalNotes: '',
      },
    ],
    notes: [
      {
        id: 'note-hadas-16',
        patientId: 'pat-hadas',
        appointmentId: 'appt-hadas-fill',
        createdAt: at(-50, '10:15'),
        revisions: [
          {
            at: at(-50, '10:15'),
            authorId: 'staff-noa',
            body: 'Occlusal caries recorded on the upper right first molar. Composite discussed with the patient.',
            toothFdi: '16',
            status: 'planned',
          },
          {
            at: at(-20, '09:40'),
            authorId: 'staff-noa',
            body: 'Composite placed on the upper right first molar. Patient reports the bite feels even.',
            toothFdi: '16',
            status: 'completed',
          },
        ],
      },
      {
        id: 'note-hadas-26',
        patientId: 'pat-hadas',
        appointmentId: 'appt-hadas-today',
        createdAt: at(-12, '11:05'),
        revisions: [
          {
            at: at(-12, '11:05'),
            authorId: 'staff-adam',
            body: 'Patient reports cold sensitivity on the upper left first molar. No treatment was marked completed.',
            toothFdi: '26',
            status: 'finding',
          },
        ],
      },
      {
        id: 'note-rami-36',
        patientId: 'pat-rami',
        appointmentId: 'appt-rami-start',
        createdAt: at(-7, '15:10'),
        revisions: [
          {
            at: at(-7, '15:10'),
            authorId: 'staff-adam',
            body: 'Root canal treatment started on the lower left first molar. A follow-up visit is still required. The procedure is not complete.',
            toothFdi: '36',
            status: 'in_progress',
          },
        ],
      },
    ],
    appointments: [
      {
        id: 'appt-hadas-fill',
        patientId: 'pat-hadas',
        kind: 'appointment',
        sourceNoteId: null,
        createdAt: at(-50, '09:00'),
        revisions: [
          {
            at: at(-50, '09:00'),
            authorId: 'staff-maya',
            date: addDays(today, -50),
            time: '10:00',
            durationMinutes: 45,
            providerId: 'staff-noa',
            roomId: 'room-1',
            status: 'confirmed',
            reason: 'Composite on upper right first molar',
          },
        ],
      },
      {
        id: 'appt-hadas-today',
        patientId: 'pat-hadas',
        kind: 'appointment',
        sourceNoteId: null,
        createdAt: at(-3, '12:00'),
        revisions: [
          {
            at: at(-3, '12:00'),
            authorId: 'staff-maya',
            date: today,
            time: '09:00',
            durationMinutes: 40,
            providerId: 'staff-noa',
            roomId: 'room-1',
            status: 'confirmed',
            reason: 'Review upper left sensitivity',
          },
        ],
      },
      {
        id: 'appt-rami-start',
        patientId: 'pat-rami',
        kind: 'appointment',
        sourceNoteId: null,
        createdAt: at(-7, '14:00'),
        revisions: [
          {
            at: at(-7, '14:00'),
            authorId: 'staff-maya',
            date: addDays(today, -7),
            time: '15:00',
            durationMinutes: 60,
            providerId: 'staff-adam',
            roomId: 'room-2',
            status: 'confirmed',
            reason: 'Start root canal treatment',
          },
        ],
      },
      {
        id: 'appt-tamar-today',
        patientId: 'pat-tamar',
        kind: 'appointment',
        sourceNoteId: null,
        createdAt: at(-2, '09:00'),
        revisions: [
          {
            at: at(-2, '09:00'),
            authorId: 'staff-maya',
            date: today,
            time: '13:00',
            durationMinutes: 45,
            providerId: 'staff-sara',
            roomId: 'room-hygiene',
            status: 'scheduled',
            reason: 'Hygiene visit',
          },
        ],
      },
      {
        id: 'appt-rami-follow',
        patientId: 'pat-rami',
        kind: 'follow_up',
        sourceNoteId: 'note-rami-36',
        createdAt: at(-7, '15:20'),
        revisions: [
          {
            at: at(-7, '15:20'),
            authorId: 'staff-adam',
            date: addDays(today, 1),
            time: '16:00',
            durationMinutes: 60,
            providerId: 'staff-adam',
            roomId: 'room-2',
            status: 'scheduled',
            reason: 'Continue root canal treatment',
          },
        ],
      },
      {
        id: 'appt-yonatan-past',
        patientId: 'pat-yonatan',
        kind: 'appointment',
        sourceNoteId: null,
        createdAt: at(-10, '08:30'),
        revisions: [
          {
            at: at(-10, '08:30'),
            authorId: 'staff-maya',
            date: addDays(today, -1),
            time: '10:30',
            durationMinutes: 30,
            providerId: 'staff-noa',
            roomId: 'room-1',
            status: 'cancelled',
            reason: 'Check chipped incisor',
          },
        ],
      },
      {
        id: 'appt-yonatan-tomorrow',
        patientId: 'pat-yonatan',
        kind: 'appointment',
        sourceNoteId: null,
        createdAt: at(-1, '11:00'),
        revisions: [
          {
            at: at(-1, '11:00'),
            authorId: 'staff-maya',
            date: addDays(today, 1),
            time: '11:00',
            durationMinutes: 30,
            providerId: 'staff-noa',
            roomId: 'room-1',
            status: 'confirmed',
            reason: 'Check chipped incisor',
          },
        ],
      },
      ...historyAppointments(),
    ],
    treatments: [
      {
        id: 'tx-hadas-16',
        patientId: 'pat-hadas',
        currency: 'ILS',
        createdAt: at(-50, '10:20'),
        revisions: [
          {
            at: at(-50, '10:20'),
            authorId: 'staff-noa',
            description: 'Composite restoration',
            toothFdi: '16',
            status: 'planned',
            price: 800,
          },
          {
            at: at(-20, '09:50'),
            authorId: 'staff-noa',
            description: 'Composite restoration',
            toothFdi: '16',
            status: 'completed',
            price: 800,
          },
        ],
      },
      {
        id: 'tx-hadas-26',
        patientId: 'pat-hadas',
        currency: 'ILS',
        createdAt: at(-12, '11:12'),
        revisions: [
          {
            at: at(-12, '11:12'),
            authorId: 'staff-noa',
            description: 'Crown',
            toothFdi: '26',
            status: 'planned',
            price: 3200,
          },
        ],
      },
      {
        id: 'tx-rami-36',
        patientId: 'pat-rami',
        currency: 'ILS',
        createdAt: at(-7, '15:16'),
        revisions: [
          {
            at: at(-7, '15:16'),
            authorId: 'staff-adam',
            description: 'Root canal treatment',
            toothFdi: '36',
            status: 'in_progress',
            price: 1800,
          },
        ],
      },
    ],
    documents: [
      {
        id: 'doc-hadas-scan',
        patientId: 'pat-hadas',
        kind: 'intraoral_scan',
        title: 'Upper arch scan',
        date: addDays(today, -12),
        source: 'Demo import',
        originalFileName: 'hadas-upper-arch-demo.stl',
        previewLabel: null,
      },
      {
        id: 'doc-rami-radio',
        patientId: 'pat-rami',
        kind: 'radiograph',
        title: 'Periapical, lower left molar',
        date: addDays(today, -7),
        source: 'Demo import',
        originalFileName: 'rami-pa-demo.dcm',
        previewLabel: 'Lower molar preview label',
      },
    ],
    invoices: [
      {
        id: 'inv-hadas-1',
        patientId: 'pat-hadas',
        currency: 'ILS',
        issuedOn: addDays(today, -20),
        lines: [
          { id: 'line-hadas-1', description: 'Composite restoration', toothFdi: '16', amount: 800 },
          { id: 'line-hadas-2', description: 'Exam', toothFdi: null, amount: 250 },
        ],
        payments: [
          {
            id: 'pay-hadas-1',
            date: addDays(today, -20),
            amount: 400,
            method: 'card',
            note: 'Partial payment at the visit.',
            recordedAt: at(-20, '09:55'),
            authorId: 'staff-maya',
          },
        ],
        revisions: [
          {
            at: at(-20, '09:52'),
            authorId: 'staff-maya',
            summary: 'created',
          },
          {
            at: at(-20, '09:55'),
            authorId: 'staff-maya',
            summary: 'payment',
          },
        ],
      },
      {
        id: 'inv-yonatan-1',
        patientId: 'pat-yonatan',
        currency: 'ILS',
        issuedOn: addDays(today, -40),
        lines: [{ id: 'line-yonatan-1', description: 'Exam', toothFdi: null, amount: 250 }],
        payments: [
          {
            id: 'pay-yonatan-1',
            date: addDays(today, -40),
            amount: 250,
            method: 'cash',
            note: '',
            recordedAt: at(-40, '11:00'),
            authorId: 'staff-eli',
          },
        ],
        revisions: [
          {
            at: at(-40, '10:58'),
            authorId: 'staff-eli',
            summary: 'created',
          },
        ],
      },
    ],
  }
}

export const STORAGE_KEY = 'sycamore-dental-demo-v6'

export function serializeState(state: ClinicState) {
  return JSON.stringify({ version: 1, state })
}

export function parseStoredState(raw: string): ClinicState {
  const data = JSON.parse(raw) as { version?: number; state?: ClinicState }
  if (data.version !== 1 || !data.state) throw new Error('unreadable')
  const state = data.state
  if (!Array.isArray(state.patients) || !Array.isArray(state.notes) || !Array.isArray(state.appointments)) {
    throw new Error('unreadable')
  }
  if (!state.settings || !Array.isArray(state.staff) || !state.actingStaffId) throw new Error('unreadable')
  return {
    ...state,
    notes: state.notes.map((note) => ({
      ...note,
      appointmentId: note.appointmentId ?? null,
    })),
    appointments: state.appointments.map((appointment) => ({
      ...appointment,
      revisions: appointment.revisions.map((revision) => {
        const legacy = revision.status as string
        return {
          ...revision,
          status:
          legacy === 'arrived' || legacy === 'completed' ? 'confirmed' : revision.status,
        }
      }),
    })),
  }
}
