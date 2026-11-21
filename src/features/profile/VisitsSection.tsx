import { useEffect, useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AppointmentForm } from '../../components/AppointmentForm'
import { Badge } from '../../components/Badge'
import { EditHistory } from '../../components/EditHistory'
import { RecordMeta } from '../../components/RecordMeta'
import { useAnnounce } from '../../components/Shell'
import { EmptyState } from '../../components/States'
import { formatDate, formatDateTime, formatTime, localIsoDate } from '../../format'
import { useMessages } from '../../i18n'
import { currentAppointment, currentNote, isActiveNote } from '../../record'
import { useClinic } from '../../store'
import { fill } from '../../text'
import { LOWER_TEETH, UPPER_TEETH, isToothId } from '../../teeth'
import type { Appointment, DocumentKind, Patient, RecordStatus, VisitNote } from '../../types'

const STATUSES: RecordStatus[] = ['finding', 'planned', 'in_progress', 'completed']
const DOCUMENT_KINDS: DocumentKind[] = ['photo', 'radiograph', 'intraoral_scan', 'referral', 'other']

type AppointmentRow = { appointment: Appointment; revision: ReturnType<typeof currentAppointment> }

export function VisitsSection({ patient }: { patient: Patient }) {
  const { state } = useClinic()
  const m = useMessages()
  const notes = state.notes.filter((note) => note.patientId === patient.id && isActiveNote(note))
  const appointments = state.appointments
    .filter((appointment) => appointment.patientId === patient.id)
    .map((appointment) => ({ appointment, revision: currentAppointment(appointment) }))
    .sort((a, b) => `${b.revision.date}${b.revision.time}`.localeCompare(`${a.revision.date}${a.revision.time}`))
  const notesByAppointment = new Map<string, VisitNote>()
  for (const note of notes) {
    if (note.appointmentId) notesByAppointment.set(note.appointmentId, note)
  }
  const [schedulingId, setSchedulingId] = useState<string | null>(null)
  const [openNoteId, setOpenNoteId] = useState<string | null>(null)
  const openNote = openNoteId ? notes.find((note) => note.id === openNoteId) ?? null : null

  useEffect(() => {
    if (!openNoteId) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenNoteId(null)
        setSchedulingId(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openNoteId])

  return (
    <section className="stack visits-section" aria-labelledby="visits-heading">
      <div className="visits-head">
        <div>
          <h2 id="visits-heading">{m.visits.heading}</h2>
          <p className="meta">{m.visits.introShort}</p>
        </div>
      </div>

      <NoteForm patientId={patient.id} appointments={appointments} />

      <div className="visits-block">
        <div className="visits-block-head">
          <h3>{m.visits.appointments}</h3>
        </div>
        {appointments.length === 0 ? (
          <EmptyState>{m.visits.emptyAppointments}</EmptyState>
        ) : (
          <div className="visits-table" role="table" aria-label={m.visits.appointments}>
            <div className="visits-row visits-row-head visits-appt-cols" role="row">
              <span role="columnheader">{m.visits.colDate}</span>
              <span role="columnheader">{m.visits.colTreatment}</span>
              <span role="columnheader">{m.visits.colStatus}</span>
              <span role="columnheader" className="visits-cell-note-flag">
                {m.visits.colNoteAttached}
              </span>
            </div>
            <ul className="visits-list" role="rowgroup">
              {appointments.map(({ appointment, revision }) => {
                const linkedNote =
                  notesByAppointment.get(appointment.id) ??
                  notes.find((note) => appointment.sourceNoteId === note.id) ??
                  null
                return (
                  <li key={appointment.id} role="row" className="visits-row visits-appt-row visits-appt-cols">
                    <span role="cell" className="visits-cell-when">
                      {formatDate(revision.date, state.settings.intlLocale)} ·{' '}
                      {formatTime(revision.time, state.settings.intlLocale)}
                    </span>
                    <span role="cell" className="visits-cell-treatment">
                      {revision.reason}
                      {appointment.kind === 'follow_up' ? (
                        <span className="visits-inline-tag">{m.appointmentKind.follow_up}</span>
                      ) : null}
                    </span>
                    <span role="cell" className="visits-cell-status">
                      <Badge status={revision.status} label={m.appointmentStatus[revision.status]} />
                    </span>
                    <span role="cell" className="visits-cell-note-flag">
                      {linkedNote ? (
                        <button
                          type="button"
                          className="visits-note-flag-button"
                          title={m.visits.noteAttached}
                          aria-label={m.visits.noteAttached}
                          onClick={() => setOpenNoteId(linkedNote.id)}
                        >
                          <NoteAttachedIcon />
                        </button>
                      ) : (
                        <span className="visits-note-flag-empty" aria-label={m.visits.noteNotAttached} />
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="visits-block">
        <div className="visits-block-head">
          <h3>{m.visits.notesHeading}</h3>
        </div>
        {notes.length === 0 ? (
          <EmptyState>{m.visits.empty}</EmptyState>
        ) : (
          <div className="visits-table" role="table" aria-label={m.visits.notesHeading}>
            <div className="visits-row visits-row-head visits-note-cols" role="row">
              <span role="columnheader">{m.visits.colStatus}</span>
              <span role="columnheader">{m.visits.colTooth}</span>
              <span role="columnheader">{m.visits.colNote}</span>
              <span role="columnheader">{m.visits.colDate}</span>
            </div>
            <ul className="visits-list" role="rowgroup">
              {notes.map((note) => (
                <NoteRow
                  key={note.id}
                  note={note}
                  appointments={appointments}
                  onOpen={() => setOpenNoteId(note.id)}
                />
              ))}
            </ul>
          </div>
        )}
      </div>

      {openNote ? (
        <NoteDialog
          note={openNote}
          appointments={appointments}
          scheduling={schedulingId === openNote.id}
          onClose={() => {
            setOpenNoteId(null)
            setSchedulingId(null)
          }}
          onSchedule={() => setSchedulingId(openNote.id)}
          onCloseSchedule={() => setSchedulingId(null)}
        />
      ) : null}
    </section>
  )
}

function NoteAttachedIcon() {
  return (
    <svg className="visits-note-flag-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3.5 1.5A1.5 1.5 0 0 0 2 3v10a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 14 13V5.207a1.5 1.5 0 0 0-.44-1.06L10.853 1.44A1.5 1.5 0 0 0 9.793 1H3.5Zm6.293.5L13 4.707V13a.5.5 0 0 1-.5.5h-9A.5.5 0 0 1 3 13V3a.5.5 0 0 1 .5-.5h6.293ZM5 7.25h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1Zm0 2.5h4a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1Z"
      />
    </svg>
  )
}

function appointmentOptionLabel(
  revision: ReturnType<typeof currentAppointment>,
  locale: string,
) {
  return `${formatDate(revision.date, locale)} · ${formatTime(revision.time, locale)} · ${revision.reason}`
}

function NoteForm({
  patientId,
  appointments,
}: {
  patientId: string
  appointments: AppointmentRow[]
}) {
  const { state, addNote, addDocument } = useClinic()
  const m = useMessages()
  const announce = useAnnounce()
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState('')
  const [toothFdi, setToothFdi] = useState('')
  const [status, setStatus] = useState<RecordStatus>('finding')
  const [appointmentId, setAppointmentId] = useState('')
  const [documentKind, setDocumentKind] = useState<DocumentKind>('photo')
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)

  function resetFields() {
    setBody('')
    setToothFdi('')
    setStatus('finding')
    setAppointmentId('')
    setDocumentKind('photo')
    setFileName(null)
    setError(false)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!body.trim()) {
      setError(true)
      setSaved(null)
      return
    }
    const linkedTooth = toothFdi && isToothId(toothFdi) ? toothFdi : null
    const linkedAppointmentId = appointmentId || null
    setSaving(true)
    window.setTimeout(() => {
      const noteId = addNote({
        patientId,
        body,
        toothFdi: linkedTooth,
        status,
        appointmentId: linkedAppointmentId,
      })
      if (fileName) {
        const title = fileName.replace(/\.[^.]+$/, '') || fileName
        addDocument({
          patientId,
          kind: documentKind,
          title,
          date: localIsoDate(),
          source: m.visits.documentSource,
          originalFileName: fileName,
          previewLabel: null,
          visitNoteId: noteId,
        })
      }
      resetFields()
      setSaving(false)
      const message = fileName
        ? m.visits.savedWithDocument
        : linkedTooth
          ? fill(m.visits.savedLinked, { tooth: linkedTooth })
          : m.visits.saved
      setSaved(message)
      announce(message)
      setOpen(false)
    }, 120)
  }

  return (
    <div className="note-composer">
      <button
        type="button"
        className="button button-secondary note-composer-toggle"
        data-testid="toggle-note-form"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? m.visits.addHide : m.visits.add}
      </button>
      {saved && !open ? (
        <p className="meta" role="status" tabIndex={-1}>
          {saved}
        </p>
      ) : null}
      {open ? (
        <form id={panelId} className="stack note-form card" noValidate onSubmit={submit}>
          {error ? (
            <p className="form-errors" role="alert">
              {m.visits.bodyError}
            </p>
          ) : null}
          <div className="field">
            <label htmlFor="visit-appointment">{m.visits.appointmentLabel}</label>
            <select
              id="visit-appointment"
              data-testid="visit-appointment"
              value={appointmentId}
              onChange={(event) => setAppointmentId(event.target.value)}
            >
              <option value="">{m.visits.appointmentNone}</option>
              {appointments.map(({ appointment, revision }) => (
                <option key={appointment.id} value={appointment.id}>
                  {appointmentOptionLabel(revision, state.settings.intlLocale)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="visit-note">{m.visits.noteLabel}</label>
            <textarea
              id="visit-note"
              value={body}
              aria-invalid={error}
              onChange={(event) => setBody(event.target.value)}
            />
          </div>
          <div className="note-form-columns">
            <div className="field">
              <label htmlFor="visit-tooth">{m.visits.toothLabel}</label>
              <select
                id="visit-tooth"
                data-testid="visit-tooth"
                value={toothFdi}
                onChange={(event) => setToothFdi(event.target.value)}
              >
                <option value="">{m.visits.toothNone}</option>
                <optgroup label={m.visits.toothUpper}>
                  {UPPER_TEETH.map((tooth) => (
                    <option key={tooth} value={tooth}>
                      {fill(m.common.tooth, { tooth })}
                    </option>
                  ))}
                </optgroup>
                <optgroup label={m.visits.toothLower}>
                  {LOWER_TEETH.map((tooth) => (
                    <option key={tooth} value={tooth}>
                      {fill(m.common.tooth, { tooth })}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
            <fieldset className="note-status-fieldset">
              <legend>{m.visits.statusLabel}</legend>
              <div className="note-status-choices note-status-choices-inline">
                {STATUSES.map((value) => (
                  <label key={value} className="choice">
                    <input
                      type="radio"
                      name="visit-status"
                      value={value}
                      checked={status === value}
                      onChange={() => setStatus(value)}
                    />
                    <Badge status={value} label={m.recordStatus[value]} />
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <div className="note-form-columns">
            <div className="field">
              <label htmlFor="visit-document">{m.visits.documentLabel}</label>
              <input
                id="visit-document"
                type="file"
                data-testid="visit-document"
                onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)}
              />
            </div>
            <div className="field">
              <label htmlFor="visit-document-kind">{m.visits.documentKindLabel}</label>
              <select
                id="visit-document-kind"
                value={documentKind}
                disabled={!fileName}
                onChange={(event) => setDocumentKind(event.target.value as DocumentKind)}
              >
                {DOCUMENT_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {m.documentKinds[kind]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="appointment-form-actions">
            <button type="button" className="button button-secondary" onClick={() => setOpen(false)}>
              {m.common.cancel}
            </button>
            <button type="submit" className="button appointment-form-primary" data-testid="save-note" disabled={saving}>
              {saving ? m.common.saving : m.visits.save}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  )
}

function NoteRow({
  note,
  appointments,
  onOpen,
}: {
  note: VisitNote
  appointments: AppointmentRow[]
  onOpen: () => void
}) {
  const { state } = useClinic()
  const m = useMessages()
  const current = currentNote(note)
  const linkedAppointment = note.appointmentId
    ? appointments.find((row) => row.appointment.id === note.appointmentId) ?? null
    : null
  const dateLabel = linkedAppointment
    ? `${formatDate(linkedAppointment.revision.date, state.settings.intlLocale)} · ${formatTime(linkedAppointment.revision.time, state.settings.intlLocale)}`
    : formatDateTime(current.at, state.settings.intlLocale)

  return (
    <li className="visits-note-item">
      <button type="button" className="visits-row visits-note-cols visits-note-summary" role="row" onClick={onOpen}>
        <span role="cell" className="visits-cell-status">
          <Badge status={current.status} label={m.recordStatus[current.status]} />
        </span>
        <span role="cell" className="visits-cell-tooth">
          {current.toothFdi ? fill(m.common.tooth, { tooth: current.toothFdi }) : m.common.notLinked}
        </span>
        <span role="cell" className="visits-cell-note">
          {current.body}
        </span>
        <span role="cell" className="visits-cell-when">
          {dateLabel}
        </span>
      </button>
    </li>
  )
}

function NoteDialog({
  note,
  appointments,
  scheduling,
  onClose,
  onSchedule,
  onCloseSchedule,
}: {
  note: VisitNote
  appointments: AppointmentRow[]
  scheduling: boolean
  onClose: () => void
  onSchedule: () => void
  onCloseSchedule: () => void
}) {
  const { state, reviseNote, deleteNote } = useClinic()
  const m = useMessages()
  const announce = useAnnounce()
  const current = currentNote(note)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [body, setBody] = useState(current.body)
  const [status, setStatus] = useState<RecordStatus>(current.status)
  const [error, setError] = useState('')

  const linkedAppointment = note.appointmentId
    ? appointments.find((row) => row.appointment.id === note.appointmentId) ?? null
    : null

  function saveEdit(event: FormEvent) {
    event.preventDefault()
    if (!body.trim()) {
      setError(m.visits.bodyError)
      return
    }
    if (body.trim() === current.body && status === current.status) {
      setError(m.common.unchanged)
      return
    }
    reviseNote(note.id, { body, toothFdi: current.toothFdi, status })
    setEditing(false)
    setError('')
    announce(m.common.save)
  }

  function confirmNoteDelete() {
    deleteNote(note.id)
    setConfirmDelete(false)
    announce(m.visits.deleted)
    onClose()
  }

  const older = note.revisions.slice(0, -1).reverse()
  const toothLink = `/patients/${note.patientId}/chart?linkNote=${note.id}`

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="modal-panel visits-note-panel" role="dialog" aria-modal="true" aria-label={m.visits.noteDialogLabel}>
        <div className="card stack visits-note-dialog">
          <div className="visits-note-dialog-head">
            <h3>{m.visits.noteDialogLabel}</h3>
            <Badge status={current.status} label={m.recordStatus[current.status]} />
          </div>

          <p className="note-body">{current.body}</p>
          {linkedAppointment ? (
            <p className="meta">
              {m.visits.appointmentLinked}:{' '}
              {appointmentOptionLabel(linkedAppointment.revision, state.settings.intlLocale)}
            </p>
          ) : null}
          <p className="meta">
            {current.toothFdi ? fill(m.common.tooth, { tooth: current.toothFdi }) : m.common.notLinked}
          </p>
          <RecordMeta at={current.at} authorId={current.authorId} />

          <div className="visits-note-actions">
            <Link className="button button-secondary" to={toothLink} data-testid={`link-${note.id}`}>
              {current.toothFdi ? m.visits.relink : m.visits.link}
            </Link>
            <button type="button" className="button button-secondary" data-testid={`follow-${note.id}`} onClick={onSchedule}>
              {m.visits.schedule}
            </button>
            <button
              type="button"
              className="button button-secondary"
              data-testid={`edit-${note.id}`}
              onClick={() => {
                setEditing((open) => !open)
                setConfirmDelete(false)
                setBody(current.body)
                setStatus(current.status)
                setError('')
              }}
            >
              {editing ? m.common.close : m.visits.edit}
            </button>
            <button
              type="button"
              className="button button-secondary"
              data-testid={`delete-${note.id}`}
              onClick={() => {
                setConfirmDelete((open) => !open)
                setEditing(false)
              }}
            >
              {confirmDelete ? m.common.cancel : m.visits.delete}
            </button>
          </div>

          {confirmDelete ? (
            <div className="note-delete" role="group" aria-label={m.visits.delete}>
              <p className="hint">{m.visits.deleteConfirm}</p>
              <button type="button" className="button" data-testid={`confirm-delete-${note.id}`} onClick={confirmNoteDelete}>
                {m.visits.deleteConfirmAction}
              </button>
            </div>
          ) : null}

          {scheduling ? (
            <AppointmentForm
              kind="follow_up"
              lockedPatientId={note.patientId}
              sourceNoteId={note.id}
              defaultReason={current.body.slice(0, 120)}
              compact
              onCancel={onCloseSchedule}
              onCreated={onCloseSchedule}
            />
          ) : null}

          {editing ? (
            <form className="stack note-edit" noValidate onSubmit={saveEdit}>
              {error ? <p className="field-error" role="alert">{error}</p> : null}
              <div className="field">
                <label htmlFor={`edit-${note.id}`}>{m.visits.noteLabel}</label>
                <textarea id={`edit-${note.id}`} value={body} onChange={(event) => setBody(event.target.value)} />
              </div>
              <fieldset>
                <legend>{m.visits.statusLabel}</legend>
                <div className="note-status-choices note-status-choices-inline">
                  {STATUSES.map((value) => (
                    <label key={value} className="choice">
                      <input
                        type="radio"
                        name={`edit-status-${note.id}`}
                        checked={status === value}
                        onChange={() => setStatus(value)}
                      />
                      <Badge status={value} label={m.recordStatus[value]} />
                    </label>
                  ))}
                </div>
              </fieldset>
              <button type="submit" className="button">
                {m.common.save}
              </button>
            </form>
          ) : null}

          <EditHistory
            items={older.map((revision, index) => ({
              id: `${note.id}-${index}`,
              meta: <RecordMeta at={revision.at} authorId={revision.authorId} />,
              detail: (
                <>
                  <Badge status={revision.status} label={m.recordStatus[revision.status]} />
                  <p>{revision.body}</p>
                  <p className="meta">
                    {revision.toothFdi ? fill(m.common.tooth, { tooth: revision.toothFdi }) : m.common.notLinked}
                  </p>
                </>
              ),
            }))}
          />

          <div className="visits-note-dialog-footer">
            <button type="button" className="button button-secondary" onClick={onClose}>
              {m.common.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
