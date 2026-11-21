import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AppointmentForm,
  CLINIC_CLOSE_MINUTES,
  CLINIC_OPEN_MINUTES,
  minutesToTime,
  timeToMinutes,
} from '../components/AppointmentForm'
import {
  addDays,
  addMonths,
  formatDate,
  formatMonthYear,
  formatPersonName,
  formatTime,
  formatWeekday,
  isoWeekNumber,
  localIsoDate,
  parseLocalDate,
  startOfMonth,
  startOfWeek,
} from '../format'
import { useMessages } from '../i18n'
import { currentAppointment } from '../record'
import { useClinic } from '../store'
import { fill } from '../text'
import type { AppointmentStatus } from '../types'

const SLOT_MINUTES = 30
const PX_PER_MINUTE = 1
const DAY_SPAN = CLINIC_CLOSE_MINUTES - CLINIC_OPEN_MINUTES
const TRACK_HEIGHT = DAY_SPAN * PX_PER_MINUTE

type CalendarMode = 'week' | 'month'
type ModalState =
  | { type: 'schedule'; date: string; time: string }
  | { type: 'details'; appointmentId: string }
  | { type: 'edit'; appointmentId: string }

function slotStarts() {
  const times: string[] = []
  for (let minutes = CLINIC_OPEN_MINUTES; minutes < CLINIC_CLOSE_MINUTES; minutes += SLOT_MINUTES) {
    times.push(minutesToTime(minutes))
  }
  return times
}

function hourLabels() {
  const times: string[] = []
  for (let minutes = CLINIC_OPEN_MINUTES; minutes <= CLINIC_CLOSE_MINUTES; minutes += 60) {
    times.push(minutesToTime(minutes))
  }
  return times
}

const SLOT_STARTS = slotStarts()
const HOUR_LABELS = hourLabels()

function sameMonth(a: string, b: string) {
  return a.slice(0, 7) === b.slice(0, 7)
}

export function CalendarPage() {
  const { state, reviseAppointment } = useClinic()
  const m = useMessages()
  const today = localIsoDate()
  const [mode, setMode] = useState<CalendarMode>('week')
  const [anchor, setAnchor] = useState(today)
  const [modal, setModal] = useState<ModalState | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const weekStart = startOfWeek(anchor, state.settings.weekStartsOn)
  const todayWeekStart = startOfWeek(today, state.settings.weekStartsOn)
  const monthStart = startOfMonth(anchor)
  const todayMonthStart = startOfMonth(today)
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart])
  const monthCells = useMemo(() => {
    const gridStart = startOfWeek(monthStart, state.settings.weekStartsOn)
    return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index))
  }, [monthStart, state.settings.weekStartsOn])

  const byDay = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string
        patientId: string
        kind: 'appointment' | 'follow_up'
        revision: ReturnType<typeof currentAppointment>
      }[]
    >()
    for (const appointment of state.appointments) {
      const revision = currentAppointment(appointment)
      const list = map.get(revision.date) ?? []
      list.push({
        id: appointment.id,
        patientId: appointment.patientId,
        kind: appointment.kind,
        revision,
      })
      map.set(revision.date, list)
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.revision.time.localeCompare(b.revision.time))
    }
    return map
  }, [state.appointments])

  useEffect(() => {
    if (!modal) return
    const current = modal
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      if (current.type === 'edit') {
        setModal({ type: 'details', appointmentId: current.appointmentId })
        return
      }
      setModal(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modal])

  function openSlot(date: string, time: string) {
    setModal({ type: 'schedule', date, time })
    setSavedMessage(null)
  }

  function goCurrentPeriod() {
    setAnchor(today)
    setModal(null)
  }

  function goPrevious() {
    setAnchor(mode === 'week' ? addDays(weekStart, -7) : addMonths(monthStart, -1))
    setModal(null)
  }

  function goNext() {
    setAnchor(mode === 'week' ? addDays(weekStart, 7) : addMonths(monthStart, 1))
    setModal(null)
  }

  const weekOffset =
    (parseLocalDate(weekStart).getTime() - parseLocalDate(todayWeekStart).getTime()) / (7 * 24 * 60 * 60 * 1000)
  const monthOffset =
    (Number(monthStart.slice(0, 4)) - Number(todayMonthStart.slice(0, 4))) * 12 +
    (Number(monthStart.slice(5, 7)) - Number(todayMonthStart.slice(5, 7)))
  const periodLabel =
    mode === 'week'
      ? weekOffset === 0
        ? m.calendar.periodThisWeek
        : weekOffset === 1
          ? m.calendar.periodNextWeek
          : weekOffset === -1
            ? m.calendar.periodLastWeek
            : fill(m.calendar.periodWeekNumber, { week: isoWeekNumber(weekStart) })
      : monthOffset === 0
        ? m.calendar.periodThisMonth
        : monthOffset === 1
          ? m.calendar.periodNextMonth
          : monthOffset === -1
            ? m.calendar.periodLastMonth
            : fill(m.calendar.monthLabel, { month: formatMonthYear(monthStart, state.settings.intlLocale) })

  const detailAppointment =
    modal?.type === 'details' || modal?.type === 'edit'
      ? state.appointments.find((appointment) => appointment.id === modal.appointmentId)
      : undefined
  const detailRevision = detailAppointment ? currentAppointment(detailAppointment) : null
  const detailPatient = detailAppointment
    ? state.patients.find((patient) => patient.id === detailAppointment.patientId)
    : undefined
  const detailProvider = detailRevision
    ? state.staff.find((member) => member.id === detailRevision.providerId)
    : undefined

  return (
    <div className="page stack calendar-page">
      <header className="page-head calendar-head">
        <h1>{m.calendar.heading}</h1>
        <p className="hint">{m.calendar.hours}</p>
      </header>
      <div className="calendar-toolbar">
        <div className="row calendar-view-toggle" role="group" aria-label={m.calendar.heading}>
          <button
            type="button"
            className={`button button-secondary${mode === 'week' ? ' is-active' : ''}`}
            aria-pressed={mode === 'week'}
            onClick={() => setMode('week')}
          >
            {m.calendar.viewWeek}
          </button>
          <button
            type="button"
            className={`button button-secondary${mode === 'month' ? ' is-active' : ''}`}
            aria-pressed={mode === 'month'}
            onClick={() => setMode('month')}
          >
            {m.calendar.viewMonth}
          </button>
        </div>
        <div className="row calendar-nav">
          <button
            type="button"
            className="button button-secondary calendar-nav-arrow"
            aria-label={m.calendar.previous}
            onClick={goPrevious}
          >
            ‹
          </button>
          <p className="calendar-period" aria-live="polite">
            {periodLabel}
          </p>
          <button
            type="button"
            className="button button-secondary calendar-nav-arrow"
            aria-label={m.calendar.next}
            onClick={goNext}
          >
            ›
          </button>
          <button type="button" className="button button-secondary" onClick={goCurrentPeriod}>
            {m.calendar.today}
          </button>
        </div>
      </div>

      {mode === 'week' ? (
        <>
          <div className="week-board-wrap">
            <div
              className="week-board"
              role="grid"
              aria-label={fill(m.calendar.weekLabel, {
                start: formatDate(days[0], state.settings.intlLocale),
                end: formatDate(days[6], state.settings.intlLocale),
              })}
            >
              <div className="week-corner" aria-hidden="true" />
              {days.map((day) => (
                <div key={`head-${day}`} className={`week-day-head${day === today ? ' is-today' : ''}`} role="columnheader">
                  <span className="meta">{formatWeekday(day, state.settings.intlLocale)}</span>
                  <strong>{formatDate(day, state.settings.intlLocale)}</strong>
                </div>
              ))}
              <div className="week-time-rail" aria-hidden="true" style={{ height: TRACK_HEIGHT }}>
                {HOUR_LABELS.map((time) => {
                  const minutes = timeToMinutes(time) ?? CLINIC_OPEN_MINUTES
                  const top = (minutes - CLINIC_OPEN_MINUTES) * PX_PER_MINUTE
                  const isStart = minutes === CLINIC_OPEN_MINUTES
                  const isEnd = minutes === CLINIC_CLOSE_MINUTES
                  return (
                    <span
                      key={time}
                      className={`week-time-label${isStart ? ' is-start' : ''}${isEnd ? ' is-end' : ''}`}
                      style={{ top }}
                    >
                      {formatTime(time, state.settings.intlLocale)}
                    </span>
                  )
                })}
              </div>
              {days.map((day) => {
                const items = byDay.get(day) ?? []
                return (
                  <div key={day} className={`week-day-track${day === today ? ' is-today' : ''}`} style={{ height: TRACK_HEIGHT }}>
                    {SLOT_STARTS.map((time) => {
                      const minutes = timeToMinutes(time) ?? CLINIC_OPEN_MINUTES
                      const top = (minutes - CLINIC_OPEN_MINUTES) * PX_PER_MINUTE
                      return (
                        <button
                          key={`${day}-${time}`}
                          type="button"
                          className="week-slot"
                          style={{ top, height: SLOT_MINUTES * PX_PER_MINUTE }}
                          aria-label={fill(m.calendar.slotLabel, {
                            day: formatDate(day, state.settings.intlLocale),
                            time: formatTime(time, state.settings.intlLocale),
                          })}
                          onClick={() => openSlot(day, time)}
                        />
                      )
                    })}
                    {items.map((item) => {
                      const start = timeToMinutes(item.revision.time) ?? CLINIC_OPEN_MINUTES
                      const clampedStart = Math.max(CLINIC_OPEN_MINUTES, Math.min(start, CLINIC_CLOSE_MINUTES - 15))
                      const end = Math.min(CLINIC_CLOSE_MINUTES, clampedStart + item.revision.durationMinutes)
                      const top = (clampedStart - CLINIC_OPEN_MINUTES) * PX_PER_MINUTE
                      const height = Math.max(28, (end - clampedStart) * PX_PER_MINUTE)
                      const patient = state.patients.find((entry) => entry.id === item.patientId)
                      if (!patient) return null
                      const name = formatPersonName(patient, state.settings.nameOrder)
                      const status = item.revision.status as AppointmentStatus
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`week-event status-${status}`}
                          style={{ top, height }}
                          title={`${name} · ${formatTime(item.revision.time, state.settings.intlLocale)} · ${item.revision.reason}`}
                          onClick={() => {
                            setSavedMessage(null)
                            setModal({ type: 'details', appointmentId: item.id })
                          }}
                        >
                          <span className="week-event-name">{name}</span>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
          <p className="hint">{m.calendar.clickSlot}</p>
        </>
      ) : (
        <div
          className="month-board"
          role="grid"
          aria-label={fill(m.calendar.monthLabel, { month: formatMonthYear(monthStart, state.settings.intlLocale) })}
        >
          {days.map((day) => (
            <div key={`mhead-${day}`} className="month-day-head" role="columnheader">
              {formatWeekday(day, state.settings.intlLocale)}
            </div>
          ))}
          {monthCells.map((day) => {
            const inMonth = sameMonth(day, monthStart)
            const count = (byDay.get(day) ?? []).length
            return (
              <button
                key={day}
                type="button"
                className={`month-day${!inMonth ? ' is-outside' : ''}${day === today ? ' is-today' : ''}`}
                aria-label={fill(m.calendar.openDay, { day: formatDate(day, state.settings.intlLocale) })}
                onClick={() => {
                  setAnchor(day)
                  setMode('week')
                }}
              >
                <span className="month-day-number">{Number(day.slice(8, 10))}</span>
                {count > 0 ? (
                  <span className="month-day-count">{fill(m.calendar.dayCount, { count })}</span>
                ) : null}
              </button>
            )
          })}
        </div>
      )}

      {savedMessage ? <p role="status">{savedMessage}</p> : null}

      {modal?.type === 'schedule' ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModal(null)
          }}
        >
          <div className="modal-panel" role="dialog" aria-modal="true" aria-label={m.calendar.dialogLabel}>
            <AppointmentForm
              kind="appointment"
              compact
              defaultDate={modal.date}
              defaultTime={modal.time}
              onCreated={() => {
                setSavedMessage(m.appointment.savedAppointment)
                setModal(null)
              }}
              onCancel={() => setModal(null)}
            />
          </div>
        </div>
      ) : null}

      {modal?.type === 'details' && detailAppointment && detailRevision && detailPatient ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModal(null)
          }}
        >
          <div className="modal-panel" role="dialog" aria-modal="true" aria-label={m.calendar.detailsLabel}>
            <div className="card stack appointment-detail">
              <div className="appointment-detail-head">
                <h3>{formatPersonName(detailPatient, state.settings.nameOrder)}</h3>
                <Link className="button button-secondary appointment-detail-record" to={`/patients/${detailPatient.id}/visits`}>
                  {m.calendar.openRecord}
                </Link>
              </div>

              <dl className="appointment-detail-grid">
                <div>
                  <dt>{m.appointment.date}</dt>
                  <dd>{formatDate(detailRevision.date, state.settings.intlLocale)}</dd>
                </div>
                <div>
                  <dt>{m.calendar.time}</dt>
                  <dd>{formatTime(detailRevision.time, state.settings.intlLocale)}</dd>
                </div>
                <div>
                  <dt>{m.calendar.provider}</dt>
                  <dd>
                    {detailProvider
                      ? formatPersonName(detailProvider, state.settings.nameOrder)
                      : m.common.unknownStaff}
                  </dd>
                </div>
                <div>
                  <dt>{m.calendar.duration}</dt>
                  <dd>{detailRevision.durationMinutes} min</dd>
                </div>
                <div className="appointment-detail-treatment">
                  <dt>{m.calendar.treatment}</dt>
                  <dd>{detailRevision.reason}</dd>
                </div>
              </dl>

              <div className="appointment-status-field">
                <p className="appointment-status-label" id="appointment-status-label">
                  {m.calendar.status}
                </p>
                <div
                  className="appointment-status-toggle"
                  role="group"
                  aria-labelledby="appointment-status-label"
                >
                  {(['scheduled', 'confirmed', 'cancelled'] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={`appointment-status-option status-${status}${
                        detailRevision.status === status ? ' is-active' : ''
                      }`}
                      aria-pressed={detailRevision.status === status}
                      onClick={() => {
                        if (detailRevision.status === status) return
                        reviseAppointment(detailAppointment.id, {
                          date: detailRevision.date,
                          time: detailRevision.time,
                          durationMinutes: detailRevision.durationMinutes,
                          providerId: detailRevision.providerId,
                          roomId: detailRevision.roomId,
                          status,
                          reason: detailRevision.reason,
                        })
                        setSavedMessage(m.calendar.statusUpdated)
                      }}
                    >
                      {m.appointmentStatus[status]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="appointment-detail-actions">
                <button
                  type="button"
                  className="button"
                  onClick={() => setModal({ type: 'edit', appointmentId: detailAppointment.id })}
                >
                  {m.calendar.editAppointment}
                </button>
                <button type="button" className="button button-secondary appointment-detail-close" onClick={() => setModal(null)}>
                  {m.common.close}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {modal?.type === 'edit' && detailAppointment ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setModal({ type: 'details', appointmentId: detailAppointment.id })
            }
          }}
        >
          <div className="modal-panel" role="dialog" aria-modal="true" aria-label={m.calendar.editAppointment}>
            <AppointmentForm
              kind={detailAppointment.kind}
              lockedPatientId={detailAppointment.patientId}
              editingAppointmentId={detailAppointment.id}
              compact
              onCreated={() => {
                setSavedMessage(m.appointment.savedEdit)
                setModal({ type: 'details', appointmentId: detailAppointment.id })
              }}
              onCancel={() => setModal({ type: 'details', appointmentId: detailAppointment.id })}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
