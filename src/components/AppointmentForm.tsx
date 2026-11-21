import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { localIsoDate, formatPersonName } from '../format'
import { useMessages } from '../i18n'
import { currentAppointment } from '../record'
import { useClinic } from '../store'
import type { AppointmentKind, AppointmentStatus, Patient } from '../types'
import { PatientForm } from './PatientForm'
import { useAnnounce } from './Shell'

const STATUSES: AppointmentStatus[] = ['scheduled', 'confirmed', 'cancelled']
export const CLINIC_OPEN_MINUTES = 8 * 60
export const CLINIC_CLOSE_MINUTES = 20 * 60

export function timeToMinutes(time: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(time)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

export function minutesToTime(total: number) {
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function clinicTimeOptions(stepMinutes = 15) {
  const times: string[] = []
  for (let minutes = CLINIC_OPEN_MINUTES; minutes <= CLINIC_CLOSE_MINUTES; minutes += stepMinutes) {
    times.push(minutesToTime(minutes))
  }
  return times
}

const TIME_OPTIONS = clinicTimeOptions(15)

export function AppointmentForm({
  kind,
  lockedPatientId,
  sourceNoteId = null,
  defaultDate,
  defaultTime,
  defaultReason = '',
  editingAppointmentId,
  compact = false,
  onCreated,
  onCancel,
}: {
  kind: AppointmentKind
  lockedPatientId?: string
  sourceNoteId?: string | null
  defaultDate?: string
  defaultTime?: string
  defaultReason?: string
  editingAppointmentId?: string
  compact?: boolean
  onCreated: () => void
  onCancel?: () => void
}) {
  const { state, addAppointment, reviseAppointment } = useClinic()
  const m = useMessages()
  const announce = useAnnounce()
  const clinicians = state.staff.filter((member) => member.role === 'dentist' || member.role === 'hygienist')
  const actingIsClinician = clinicians.some((member) => member.id === state.actingStaffId)
  const editing = editingAppointmentId
    ? state.appointments.find((appointment) => appointment.id === editingAppointmentId)
    : undefined
  const editingRevision = editing ? currentAppointment(editing) : null
  const isEditing = Boolean(editingAppointmentId)

  const [patientId, setPatientId] = useState(lockedPatientId ?? editing?.patientId ?? '')
  const [patientQuery, setPatientQuery] = useState('')
  const [patientOpen, setPatientOpen] = useState(false)
  const [patientHighlight, setPatientHighlight] = useState(0)
  const [date, setDate] = useState(defaultDate ?? editingRevision?.date ?? localIsoDate())
  const [time, setTime] = useState(defaultTime ?? editingRevision?.time ?? '09:00')
  const [duration, setDuration] = useState(String(editingRevision?.durationMinutes ?? 30))
  const [providerId, setProviderId] = useState(
    editingRevision?.providerId ?? (actingIsClinician ? state.actingStaffId : clinicians[0]?.id ?? ''),
  )
  const [status, setStatus] = useState<AppointmentStatus>(editingRevision?.status ?? 'scheduled')
  const [reason, setReason] = useState(defaultReason || editingRevision?.reason || '')
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [addingPatient, setAddingPatient] = useState(false)
  const patientListId = useId()
  const patientBoxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (defaultDate) setDate(defaultDate)
  }, [defaultDate])

  useEffect(() => {
    if (defaultTime) setTime(defaultTime)
  }, [defaultTime])

  useEffect(() => {
    if (!editingAppointmentId) return
    const appointment = state.appointments.find((entry) => entry.id === editingAppointmentId)
    if (!appointment) return
    const revision = currentAppointment(appointment)
    setPatientId(appointment.patientId)
    setDate(revision.date)
    setTime(revision.time)
    setDuration(String(revision.durationMinutes))
    setProviderId(revision.providerId)
    setStatus(revision.status)
    setReason(revision.reason)
  }, [editingAppointmentId, state.appointments])

  const patients = useMemo(
    () =>
      [...state.patients].sort((a, b) =>
        a.familyName.localeCompare(b.familyName, state.settings.intlLocale),
      ),
    [state.patients, state.settings.intlLocale],
  )

  const selectedPatient = patients.find((patient) => patient.id === patientId) ?? null

  const patientMatches = useMemo(() => {
    const query = patientQuery.trim().toLowerCase()
    if (!query) return patients
    return patients.filter((patient) => {
      const name = formatPersonName(patient, state.settings.nameOrder).toLowerCase()
      const reverse = `${patient.familyName} ${patient.givenName}`.toLowerCase()
      return name.includes(query) || reverse.includes(query)
    })
  }, [patientQuery, patients, state.settings.nameOrder])

  useEffect(() => {
    if (!selectedPatient) return
    setPatientQuery(formatPersonName(selectedPatient, state.settings.nameOrder))
  }, [selectedPatient, state.settings.nameOrder])

  useEffect(() => {
    setPatientHighlight(0)
  }, [patientQuery])

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!patientBoxRef.current?.contains(event.target as Node)) setPatientOpen(false)
    }
    window.addEventListener('mousedown', onPointerDown)
    return () => window.removeEventListener('mousedown', onPointerDown)
  }, [])

  function choosePatient(patient: Patient) {
    setPatientId(patient.id)
    setPatientQuery(formatPersonName(patient, state.settings.nameOrder))
    setPatientOpen(false)
  }

  function onPatientKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!patientOpen && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      setPatientOpen(true)
      return
    }
    if (!patientOpen) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setPatientHighlight((index) => Math.min(index + 1, Math.max(patientMatches.length - 1, 0)))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setPatientHighlight((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      const match = patientMatches[patientHighlight]
      if (match) {
        event.preventDefault()
        choosePatient(match)
      }
    } else if (event.key === 'Escape') {
      setPatientOpen(false)
    }
  }

  const errorText: Record<string, string> = {
    patient: m.appointment.patientError,
    date: m.appointment.dateError,
    past: m.appointment.pastDate,
    time: m.appointment.timeError,
    timeRange: m.appointment.timeRangeError,
    duration: m.appointment.durationError,
    provider: m.appointment.providerError,
    reason: m.appointment.reasonError,
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const next: string[] = []
    const chosenPatient = lockedPatientId ?? editing?.patientId ?? patientId
    if (!state.patients.some((patient) => patient.id === chosenPatient)) next.push('patient')
    if (!date) next.push('date')
    else if (!editingAppointmentId && date < localIsoDate()) next.push('past')
    const minutesOfDay = timeToMinutes(time)
    if (minutesOfDay === null) next.push('time')
    else if (minutesOfDay < CLINIC_OPEN_MINUTES || minutesOfDay > CLINIC_CLOSE_MINUTES) next.push('timeRange')
    const minutes = Number(duration)
    if (!Number.isInteger(minutes) || minutes < 10 || minutes > 240) next.push('duration')
    if (!clinicians.some((member) => member.id === providerId)) next.push('provider')
    if (!reason.trim()) next.push('reason')
    setErrors(next)
    if (next.length > 0) return
    const roomId = editingRevision?.roomId ?? state.rooms[0]?.id ?? 'room-1'
    const nextStatus = isEditing ? status : 'scheduled'
    setSaving(true)
    window.setTimeout(() => {
      if (editingAppointmentId) {
        reviseAppointment(editingAppointmentId, {
          date,
          time,
          durationMinutes: minutes,
          providerId,
          roomId,
          status: nextStatus,
          reason,
        })
        announce(m.appointment.savedEdit)
      } else {
        addAppointment({
          patientId: chosenPatient,
          kind,
          sourceNoteId,
          date,
          time,
          durationMinutes: minutes,
          providerId,
          roomId,
          status: nextStatus,
          reason,
        })
        const message = kind === 'follow_up' ? m.appointment.savedFollowUp : m.appointment.savedAppointment
        announce(message)
      }
      setSaving(false)
      onCreated()
    }, 120)
  }

  const heading = editingAppointmentId
    ? m.appointment.editHeading
    : kind === 'follow_up'
      ? m.appointment.scheduleFollowUp
      : m.appointment.scheduleAppointment
  const saveLabel = editingAppointmentId
    ? m.appointment.saveEdit
    : kind === 'follow_up'
      ? m.appointment.saveFollowUp
      : m.appointment.saveAppointment
  const durationLabel = compact ? m.appointment.durationShort : m.appointment.duration

  return (
    <form className={`card stack${compact ? ' appointment-form-compact' : ''}`} noValidate onSubmit={submit}>
      <h3>{heading}</h3>
      {errors.length > 0 ? (
        <div className="form-errors" role="alert">
          <p>{m.common.errorSummary}</p>
          <ul>
            {errors.map((key) => (
              <li key={key}>{errorText[key]}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {lockedPatientId || editingAppointmentId ? null : (
        <div className="field" ref={patientBoxRef}>
          <label htmlFor="appt-patient">{m.appointment.patient}</label>
          <div className="patient-combobox">
            <input
              id="appt-patient"
              type="search"
              role="combobox"
              autoComplete="off"
              placeholder={m.appointment.patientSearchPlaceholder}
              value={patientQuery}
              aria-invalid={errors.includes('patient')}
              aria-expanded={patientOpen}
              aria-controls={patientListId}
              aria-autocomplete="list"
              onFocus={() => setPatientOpen(true)}
              onChange={(event) => {
                const value = event.target.value
                setPatientQuery(value)
                setPatientOpen(true)
                if (selectedPatient && formatPersonName(selectedPatient, state.settings.nameOrder) !== value) {
                  setPatientId('')
                }
              }}
              onKeyDown={onPatientKeyDown}
            />
            {patientOpen ? (
              <ul id={patientListId} className="patient-combobox-list" role="listbox" aria-label={m.appointment.patientListLabel}>
                {patientMatches.length === 0 ? (
                  <li className="patient-combobox-empty">{m.appointment.patientNoMatches}</li>
                ) : (
                  patientMatches.map((patient, index) => {
                    const name = formatPersonName(patient, state.settings.nameOrder)
                    const active = index === patientHighlight
                    return (
                      <li key={patient.id} role="presentation">
                        <button
                          type="button"
                          role="option"
                          aria-selected={patient.id === patientId}
                          className={`patient-combobox-option${active ? ' is-active' : ''}${
                            patient.id === patientId ? ' is-selected' : ''
                          }`}
                          onMouseEnter={() => setPatientHighlight(index)}
                          onClick={() => choosePatient(patient)}
                        >
                          {name}
                        </button>
                      </li>
                    )
                  })
                )}
                <li role="presentation" className="patient-combobox-add-wrap">
                  <button
                    type="button"
                    className="patient-combobox-add"
                    onClick={() => {
                      setPatientOpen(false)
                      setAddingPatient(true)
                    }}
                  >
                    {m.appointment.patientAddNew}
                  </button>
                </li>
              </ul>
            ) : null}
          </div>
        </div>
      )}

      {addingPatient ? (
        <div
          className="modal-backdrop patient-form-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setAddingPatient(false)
          }}
        >
          <div className="modal-panel" role="dialog" aria-modal="true" aria-label={m.patientForm.heading}>
            <PatientForm
              initialGivenName={patientQuery.trim().split(/\s+/)[0] ?? ''}
              initialFamilyName={patientQuery.trim().split(/\s+/).slice(1).join(' ')}
              onCreated={(id) => {
                setPatientId(id)
                setAddingPatient(false)
              }}
              onCancel={() => setAddingPatient(false)}
            />
          </div>
        </div>
      ) : null}

      {compact ? (
        <div className="appointment-form-grid">
          <div className="field">
            <label htmlFor="appt-date">{m.appointment.date}</label>
            <input
              id="appt-date"
              type="date"
              value={date}
              aria-invalid={errors.includes('date') || errors.includes('past')}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="appt-time">{m.appointment.time}</label>
            <select
              id="appt-time"
              value={time}
              aria-invalid={errors.includes('time') || errors.includes('timeRange')}
              onChange={(event) => setTime(event.target.value)}
            >
              {TIME_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="appt-provider">{m.appointment.provider}</label>
            <select
              id="appt-provider"
              value={providerId}
              aria-invalid={errors.includes('provider')}
              onChange={(event) => setProviderId(event.target.value)}
            >
              {clinicians.map((member) => (
                <option key={member.id} value={member.id}>
                  {formatPersonName(member, state.settings.nameOrder)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="appt-duration">{durationLabel}</label>
            <input
              id="appt-duration"
              type="number"
              min={10}
              max={240}
              step={5}
              value={duration}
              aria-invalid={errors.includes('duration')}
              onChange={(event) => setDuration(event.target.value)}
            />
          </div>
          {isEditing ? (
            <div className="field appointment-form-span">
              <label htmlFor="appt-status">{m.appointment.status}</label>
              <select
                id="appt-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as AppointmentStatus)}
              >
                {STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {m.appointmentStatus[value]}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="field appointment-form-span">
            <label htmlFor="appt-reason">{m.appointment.reason}</label>
            <input
              id="appt-reason"
              type="text"
              value={reason}
              aria-invalid={errors.includes('reason')}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="split">
            <div className="field">
              <label htmlFor="appt-date">{m.appointment.date}</label>
              <input
                id="appt-date"
                type="date"
                value={date}
                aria-invalid={errors.includes('date') || errors.includes('past')}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="appt-time">{m.appointment.time}</label>
              <p className="hint" id="appt-time-hint">
                {m.appointment.timeHint}
              </p>
              <select
                id="appt-time"
                value={time}
                aria-invalid={errors.includes('time') || errors.includes('timeRange')}
                aria-describedby="appt-time-hint"
                onChange={(event) => setTime(event.target.value)}
              >
                {TIME_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="appt-duration">{durationLabel}</label>
              <input
                id="appt-duration"
                type="number"
                min={10}
                max={240}
                step={5}
                value={duration}
                aria-invalid={errors.includes('duration')}
                onChange={(event) => setDuration(event.target.value)}
              />
            </div>
          </div>
          <div className="split">
            <div className="field">
              <label htmlFor="appt-provider">{m.appointment.provider}</label>
              <select
                id="appt-provider"
                value={providerId}
                aria-invalid={errors.includes('provider')}
                onChange={(event) => setProviderId(event.target.value)}
              >
                {clinicians.map((member) => (
                  <option key={member.id} value={member.id}>
                    {formatPersonName(member, state.settings.nameOrder)}
                  </option>
                ))}
              </select>
            </div>
            {isEditing ? (
              <div className="field">
                <label htmlFor="appt-status">{m.appointment.status}</label>
                <p className="hint" id="appt-status-hint">
                  {m.appointment.statusHint}
                </p>
                <select
                  id="appt-status"
                  value={status}
                  aria-describedby="appt-status-hint"
                  onChange={(event) => setStatus(event.target.value as AppointmentStatus)}
                >
                  {STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {m.appointmentStatus[value]}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor="appt-reason">{m.appointment.reason}</label>
            <textarea
              id="appt-reason"
              value={reason}
              aria-invalid={errors.includes('reason')}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
        </>
      )}

      <div className={compact ? 'appointment-form-actions' : 'row appointment-form-actions'}>
        {onCancel ? (
          <button type="button" className="button button-secondary" onClick={onCancel}>
            {m.common.cancel}
          </button>
        ) : null}
        <button type="submit" className="button appointment-form-primary" disabled={saving}>
          {saving ? m.common.saving : saveLabel}
        </button>
      </div>
      <p className="visually-hidden" aria-live="polite">
        {saving ? m.common.saving : ''}
      </p>
    </form>
  )
}
