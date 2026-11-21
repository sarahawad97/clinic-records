import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge } from '../../components/Badge'
import { EditHistory } from '../../components/EditHistory'
import { RecordMeta } from '../../components/RecordMeta'
import { useAnnounce } from '../../components/Shell'
import { EmptyState } from '../../components/States'
import { ToothChart } from '../../components/ToothChart'
import { useMessages } from '../../i18n'
import { currentNote, currentTreatment, isActiveNote } from '../../record'
import { useClinic } from '../../store'
import { fill } from '../../text'
import type { Patient, RecordStatus } from '../../types'

export function ChartSection({ patient }: { patient: Patient }) {
  const { state, reviseNote } = useClinic()
  const m = useMessages()
  const announce = useAnnounce()
  const [params, setParams] = useSearchParams()
  const linkNoteId = params.get('linkNote')
  const [selected, setSelected] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const note = state.notes.find(
    (item) => item.id === linkNoteId && item.patientId === patient.id && isActiveNote(item),
  )
  const missingNote = Boolean(linkNoteId) && !note

  const marks = useMemo(() => {
    const next: Record<string, RecordStatus[]> = {}
    const add = (tooth: string | null, status: RecordStatus) => {
      if (!tooth) return
      const list = next[tooth] ?? []
      if (!list.includes(status)) list.push(status)
      next[tooth] = list
    }
    for (const item of state.notes) {
      if (item.patientId !== patient.id || !isActiveNote(item)) continue
      const revision = currentNote(item)
      add(revision.toothFdi, revision.status)
    }
    for (const item of state.treatments) {
      if (item.patientId !== patient.id) continue
      const revision = currentTreatment(item)
      add(revision.toothFdi, revision.status)
    }
    return next
  }, [patient.id, state.notes, state.treatments])

  const toothNotes = state.notes.filter(
    (item) =>
      item.patientId === patient.id &&
      isActiveNote(item) &&
      currentNote(item).toothFdi === selected,
  )
  const toothPlans = state.treatments.filter(
    (item) => item.patientId === patient.id && currentTreatment(item).toothFdi === selected,
  )
  const current = note ? currentNote(note) : null

  function linkTooth() {
    if (!note || !current || !selected) return
    if (current.toothFdi === selected) {
      setMessage(fill(m.chart.alreadyLinked, { tooth: selected }))
      return
    }
    reviseNote(note.id, { body: current.body, toothFdi: selected, status: current.status })
    const linked = fill(m.chart.linked, { tooth: selected })
    setMessage(linked)
    announce(linked)
    setParams({})
  }

  return (
    <section className="stack" aria-labelledby="chart-heading">
      <h2 id="chart-heading">{m.chart.heading}</h2>
      <p>{m.chart.intro}</p>
      <p className="hint">{m.chart.orientation}</p>
      {missingNote ? <p role="alert">{m.chart.missingNote}</p> : null}
      {note && current ? (
        <div className="alert">
          <p>{m.chart.linkBanner}</p>
          <p>{current.body}</p>
        </div>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
      <div className="chart-layout">
        <ToothChart marks={marks} selectedId={selected} onSelect={setSelected} />
        <aside className="card stack">
          {!selected ? <p>{m.chart.emptySelection}</p> : null}
          {selected ? (
            <>
              <h3>{fill(m.chart.history, { tooth: selected })}</h3>
              {note && current ? (
                <div className="stack">
                  <p>{fill(m.chart.linkConfirm, { tooth: selected })}</p>
                  <div className="row">
                    <button type="button" className="button" data-testid="confirm-link" onClick={linkTooth}>
                      {m.chart.linkAction}
                    </button>
                    <button type="button" className="button button-secondary" onClick={() => setSelected(null)}>
                      {m.chart.linkCancel}
                    </button>
                  </div>
                </div>
              ) : null}
              {toothNotes.length === 0 && toothPlans.length === 0 ? (
                <EmptyState>{m.chart.emptyHistory}</EmptyState>
              ) : null}
              <ul className="person-list">
                {toothNotes.map((item) => {
                  const revision = currentNote(item)
                  const older = item.revisions.slice(0, -1).reverse()
                  return (
                    <li key={item.id} className="stack">
                      <p className="meta">{m.chart.visitNote}</p>
                      <Badge status={revision.status} label={m.recordStatus[revision.status]} />
                      <p>{revision.body}</p>
                      <RecordMeta at={revision.at} authorId={revision.authorId} />
                      <EditHistory
                        items={older.map((entry, index) => ({
                          id: `${item.id}-${index}`,
                          meta: <RecordMeta at={entry.at} authorId={entry.authorId} />,
                          detail: (
                            <>
                              <Badge status={entry.status} label={m.recordStatus[entry.status]} />
                              <p>{entry.body}</p>
                            </>
                          ),
                        }))}
                      />
                    </li>
                  )
                })}
                {toothPlans.map((item) => {
                  const revision = currentTreatment(item)
                  return (
                    <li key={item.id} className="stack">
                      <p className="meta">{m.chart.treatment}</p>
                      <Badge status={revision.status} label={m.treatmentStatus[revision.status]} />
                      <p>{revision.description}</p>
                      <RecordMeta at={revision.at} authorId={revision.authorId} />
                    </li>
                  )
                })}
              </ul>
            </>
          ) : null}
        </aside>
      </div>
    </section>
  )
}
