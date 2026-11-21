import { useEffect, useState, type FormEvent } from 'react'
import { Badge } from '../../components/Badge'
import { EditHistory } from '../../components/EditHistory'
import { RecordMeta } from '../../components/RecordMeta'
import { useAnnounce } from '../../components/Shell'
import { EmptyState } from '../../components/States'
import { formatMoney, formatTooth } from '../../format'
import { useMessages } from '../../i18n'
import { currentTreatment } from '../../record'
import { useClinic } from '../../store'
import { fill } from '../../text'
import type { Patient, TreatmentItem, TreatmentStatus } from '../../types'

const STATUSES: TreatmentStatus[] = ['planned', 'in_progress', 'completed']

export function PlanSection({ patient }: { patient: Patient }) {
  const { state } = useClinic()
  const m = useMessages()
  const items = state.treatments.filter((item) => item.patientId === patient.id)
  return (
    <section className="stack" aria-labelledby="plan-heading">
      <h2 id="plan-heading">{m.plan.heading}</h2>
      <p>{m.plan.intro}</p>
      {items.length === 0 ? (
        <EmptyState>{m.plan.empty}</EmptyState>
      ) : (
        <ul className="person-list">
          {items.map((item) => (
            <PlanCard key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  )
}

function PlanCard({ item }: { item: TreatmentItem }) {
  const { state, setTreatmentStatus } = useClinic()
  const m = useMessages()
  const announce = useAnnounce()
  const latest = currentTreatment(item)
  const [status, setStatus] = useState<TreatmentStatus>(latest.status)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setStatus(latest.status)
  }, [latest.status])

  function save(event: FormEvent) {
    event.preventDefault()
    if (status === latest.status) {
      setMessage(m.plan.unchanged)
      return
    }
    setTreatmentStatus(item.id, status)
    setMessage(m.plan.saved)
    announce(m.plan.saved)
  }

  const older = item.revisions.slice(0, -1).reverse()

  return (
    <li className="card stack">
      <div className="row spread">
        <h3>{latest.description}</h3>
        <Badge status={latest.status} label={m.treatmentStatus[latest.status]} />
      </div>
      <dl className="facts">
        <div>
          <dt>{m.plan.tooth}</dt>
          <dd>
            {latest.toothFdi
              ? fill(m.common.tooth, { tooth: formatTooth(latest.toothFdi, state.settings.toothNotation) })
              : m.plan.notTooth}
          </dd>
        </div>
        <div>
          <dt>{m.plan.price}</dt>
          <dd>{formatMoney(latest.price, item.currency, state.settings.intlLocale)}</dd>
        </div>
      </dl>
      <RecordMeta at={latest.at} authorId={latest.authorId} />
      <form className="stack" noValidate onSubmit={save}>
        <div className="field">
          <label htmlFor={`plan-${item.id}`}>{m.plan.update}</label>
          <p className="hint" id={`plan-${item.id}-hint`}>
            {m.plan.statusHint}
          </p>
          <select
            id={`plan-${item.id}`}
            aria-describedby={`plan-${item.id}-hint`}
            value={status}
            onChange={(event) => setStatus(event.target.value as TreatmentStatus)}
          >
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {m.treatmentStatus[value]}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="button button-secondary">
          {m.plan.saveStatus}
        </button>
        {message ? <p role="status">{message}</p> : null}
      </form>
      <EditHistory
        items={older.map((revision, index) => ({
          id: `${item.id}-${index}`,
          meta: <RecordMeta at={revision.at} authorId={revision.authorId} />,
          detail: (
            <>
              <Badge status={revision.status} label={m.treatmentStatus[revision.status]} />
              <p>
                {revision.description} · {formatMoney(revision.price, item.currency, state.settings.intlLocale)}
              </p>
            </>
          ),
        }))}
      />
    </li>
  )
}
