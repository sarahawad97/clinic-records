import { Link, Navigate, NavLink, useParams } from 'react-router-dom'
import { ageInYears, formatDate, formatPersonName } from '../format'
import { useMessages } from '../i18n'
import { useClinic } from '../store'
import { fill } from '../text'
import type { Patient } from '../types'
import { BillingSection } from '../features/profile/BillingSection'
import { ChartSection } from '../features/profile/ChartSection'
import { DentalSection, DetailsSection, DocumentsSection, MedicalSection } from '../features/profile/RecordSections'
import { PlanSection } from '../features/profile/PlanSection'
import { VisitsSection } from '../features/profile/VisitsSection'

const SECTIONS = ['details', 'medical', 'dental', 'visits', 'chart', 'plan', 'documents', 'billing'] as const
type Section = (typeof SECTIONS)[number]

function isSection(value: string): value is Section {
  return SECTIONS.some((section) => section === value)
}

export function ProfilePage() {
  const { patientId, section } = useParams()
  const { state } = useClinic()
  const m = useMessages()
  const patient = state.patients.find((item) => item.id === patientId)
  if (!patient) {
    return (
      <div className="page stack">
        <h1>{m.profile.unknownPatient}</h1>
        <Link to="/patients">{m.profile.back}</Link>
      </div>
    )
  }
  if (!section) return <Navigate to={`/patients/${patient.id}/details`} replace />
  if (!isSection(section)) {
    return (
      <div className="page stack">
        <h1>{m.profile.unknownSection}</h1>
        <Link to={`/patients/${patient.id}/details`}>{m.profile.back}</Link>
      </div>
    )
  }

  return (
    <div className="page stack">
      <p>
        <Link to="/patients">{m.profile.back}</Link>
      </p>
      <header className="page-head">
        <h1>{formatPersonName(patient, state.settings.nameOrder)}</h1>
        <p className="meta">
          {formatDate(patient.dateOfBirth, state.settings.intlLocale)} · {fill(m.common.years, { age: ageInYears(patient.dateOfBirth) })}
        </p>
        <AllergyNote patient={patient} />
      </header>
      <nav className="section-nav" aria-label={m.profile.sections}>
        {SECTIONS.map((item) => (
          <NavLink key={item} to={`/patients/${patient.id}/${item}`}>
            {m.profile.section[item]}
          </NavLink>
        ))}
      </nav>
      <SectionView patient={patient} section={section} />
    </div>
  )
}

function AllergyNote({ patient }: { patient: Patient }) {
  const m = useMessages()
  const allergy = patient.conditions.find((condition) => condition.key === 'allergy')
  if (!allergy || allergy.status === 'unknown') return <p className="alert">{m.profile.allergyUnknown}</p>
  if (allergy.status === 'present') {
    return (
      <p className="alert">
        <strong>{m.profile.allergyPresent}.</strong> {allergy.detail}
      </p>
    )
  }
  return <p className="notice">{m.profile.allergyAbsent}</p>
}

function SectionView({ patient, section }: { patient: Patient; section: Section }) {
  switch (section) {
    case 'details':
      return <DetailsSection patient={patient} />
    case 'medical':
      return <MedicalSection patient={patient} />
    case 'dental':
      return <DentalSection patient={patient} />
    case 'visits':
      return <VisitsSection patient={patient} />
    case 'chart':
      return <ChartSection patient={patient} />
    case 'plan':
      return <PlanSection patient={patient} />
    case 'documents':
      return <DocumentsSection patient={patient} />
    case 'billing':
      return <BillingSection patient={patient} />
    default:
      return null
  }
}
