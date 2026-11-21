import { Link } from 'react-router-dom'
import { EmptyState } from '../../components/States'
import { ageInYears, formatAddress, formatDate, formatPhone } from '../../format'
import { useMessages } from '../../i18n'
import { useClinic } from '../../store'
import { fill } from '../../text'
import type { Patient } from '../../types'

export function DetailsSection({ patient }: { patient: Patient }) {
  const { state } = useClinic()
  const m = useMessages()
  const address = formatAddress(patient.address, state.settings.addressPreset)
  return (
    <section className="stack" aria-labelledby="details-heading">
      <h2 id="details-heading">{m.details.heading}</h2>
      <div className="split">
        <article className="card stack">
          <h3>{m.details.identity}</h3>
          <dl className="facts">
            <div>
              <dt>{m.details.born}</dt>
              <dd>
                {formatDate(patient.dateOfBirth, state.settings.intlLocale)} ·{' '}
                {fill(m.common.years, { age: ageInYears(patient.dateOfBirth) })}
              </dd>
            </div>
            <div>
              <dt>{m.profile.recordId}</dt>
              <dd>{patient.id}</dd>
            </div>
          </dl>
        </article>
        <article className="card stack">
          <h3>{m.details.contact}</h3>
          <dl className="facts">
            <div>
              <dt>{m.details.phone}</dt>
              <dd dir="ltr">{formatPhone(patient.phoneDigits, state.settings.phonePreset)}</dd>
            </div>
            <div>
              <dt>{m.details.email}</dt>
              <dd dir="ltr">{patient.email}</dd>
            </div>
            <div>
              <dt>{m.details.address}</dt>
              <dd>
                {address.map((line) => (
                  <span key={line} className="address-line">
                    {line}
                  </span>
                ))}
              </dd>
            </div>
          </dl>
        </article>
      </div>
    </section>
  )
}

export function MedicalSection({ patient }: { patient: Patient }) {
  const m = useMessages()
  return (
    <section className="stack" aria-labelledby="medical-heading">
      <h2 id="medical-heading">{m.medical.heading}</h2>
      <p>{m.medical.intro}</p>
      <ul className="person-list">
        {patient.conditions.map((condition) => (
          <li key={condition.key} className="card">
            <h3>{m.conditions[condition.key]}</h3>
            <dl className="facts">
              <div>
                <dt>{m.medical.status}</dt>
                <dd>{m.conditionStatus[condition.status]}</dd>
              </div>
              <div>
                <dt>{m.medical.detail}</dt>
                <dd>{condition.detail || m.medical.noDetail}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
      <h3>{m.medical.medications}</h3>
      {patient.medications.length === 0 ? (
        <EmptyState>{m.medical.emptyMedications}</EmptyState>
      ) : (
        <ul className="person-list">
          {patient.medications.map((medication) => (
            <li key={medication.id} className="card">
              <h4>{medication.name}</h4>
              <dl className="facts">
                <div>
                  <dt>{m.medical.dose}</dt>
                  <dd>{medication.dose}</dd>
                </div>
                <div>
                  <dt>{m.medical.frequency}</dt>
                  <dd>{medication.frequency}</dd>
                </div>
                <div>
                  <dt>{m.medical.medStatus}</dt>
                  <dd>{m.medicationStatus[medication.status]}</dd>
                </div>
                <div>
                  <dt>{m.medical.notes}</dt>
                  <dd>{medication.notes || m.medical.noNotes}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function DentalSection({ patient }: { patient: Patient }) {
  const m = useMessages()
  return (
    <section className="stack" aria-labelledby="dental-heading">
      <h2 id="dental-heading">{m.dental.heading}</h2>
      <p>{m.dental.intro}</p>
      <ul className="person-list">
        {patient.dental.map((item) => (
          <li key={item.key} className="card">
            <h3>{m.dentalKeys[item.key]}</h3>
            <p>{m.conditionStatus[item.status]}</p>
            <p>{item.detail || m.medical.noDetail}</p>
          </li>
        ))}
      </ul>
      <article className="card">
        <h3>{m.dental.notes}</h3>
        <p>{patient.dentalNotes || m.dental.noNotes}</p>
      </article>
    </section>
  )
}

export function DocumentsSection({ patient }: { patient: Patient }) {
  const { state } = useClinic()
  const m = useMessages()
  const documents = state.documents.filter((document) => document.patientId === patient.id)
  return (
    <section className="stack" aria-labelledby="documents-heading">
      <h2 id="documents-heading">{m.documents.heading}</h2>
      <p>{m.documents.intro}</p>
      {documents.length === 0 ? (
        <EmptyState>{m.documents.empty}</EmptyState>
      ) : (
        <ul className="person-list">
          {documents.map((document) => (
            <li key={document.id} className="card">
              <h3>{document.title}</h3>
              <dl className="facts">
                <div>
                  <dt>{m.documents.date}</dt>
                  <dd>{formatDate(document.date, state.settings.intlLocale)}</dd>
                </div>
                <div>
                  <dt>{m.documents.type}</dt>
                  <dd>{m.documentKinds[document.kind]}</dd>
                </div>
                <div>
                  <dt>{m.documents.source}</dt>
                  <dd>{document.source}</dd>
                </div>
                {document.visitNoteId ? (
                  <div>
                    <dt>{m.documents.fromVisit}</dt>
                    <dd>
                      <Link to={`/patients/${patient.id}/visits`}>{m.profile.section.visits}</Link>
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt>{m.documents.original}</dt>
                  <dd dir="ltr">{document.originalFileName}</dd>
                </div>
                <div>
                  <dt>{m.documents.preview}</dt>
                  <dd>
                    {document.previewLabel
                      ? fill(m.documents.previewMeta, { name: document.previewLabel })
                      : m.documents.noPreview}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
