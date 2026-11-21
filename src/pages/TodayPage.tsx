import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { openSlotStarts } from '../appointments'
import { AppointmentForm } from '../components/AppointmentForm'
import { AppointmentsStatusChart, type ChartRange } from '../components/AppointmentsStatusChart'
import { EmptyState } from '../components/States'
import { useAnnounce } from '../components/Shell'
import {
  addDays,
  addMonths,
  formatDate,
  formatPersonName,
  formatTime,
  formatWeekday,
  localIsoDate,
  parseLocalDate,
  startOfMonth,
} from '../format'
import { useMessages } from '../i18n'
import { currentAppointment, currentTreatment, invoiceBalance } from '../record'
import { useClinic } from '../store'
import { fill } from '../text'

const OPEN_SLOT_PREVIEW = 7

type ApptRow = {
  appointment: { id: string; patientId: string; kind: 'appointment' | 'follow_up' }
  revision: ReturnType<typeof currentAppointment>
}

type PeriodStats = {
  totalPaid: number
  pendingAmount: number
  patients: number
  treatmentsDone: number
  scheduled: number
  confirmed: number
  cancelled: number
}

function waKey(appointmentId: string) {
  return `wa-sent:${appointmentId}`
}

function initials(givenName: string, familyName: string) {
  return `${givenName.charAt(0)}${familyName.charAt(0)}`.toUpperCase()
}

function addMinutesToTime(time: string, minutes: number) {
  const [hours, mins] = time.split(':').map(Number)
  const total = hours * 60 + mins + minutes
  const endHours = Math.floor(total / 60) % 24
  const endMins = total % 60
  return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`
}

function formatShortMonthYear(isoDate: string, intlLocale: string) {
  return new Intl.DateTimeFormat(intlLocale, { month: 'short', year: 'numeric' }).format(
    parseLocalDate(isoDate),
  )
}

function longestLabel(candidates: string[]) {
  return candidates.reduce((best, value) => (value.length > best.length ? value : best), '')
}

/** One shared width sample so Day / Month / Year controls stay aligned. */
function periodWidthSample(today: string, intlLocale: string, labels: { day: string; month: string; year: string }) {
  const year = Number(today.slice(0, 4))
  return longestLabel([
    labels.day,
    labels.month,
    labels.year,
    formatDate(`${year}-01-31`, intlLocale),
    formatDate(`${year}-09-30`, intlLocale),
    formatDate(`${year}-11-30`, intlLocale),
    formatDate(`${year}-12-31`, intlLocale),
    ...Array.from({ length: 12 }, (_, month) =>
      formatShortMonthYear(`${year}-${String(month + 1).padStart(2, '0')}-01`, intlLocale),
    ),
    String(year),
    String(year + 1),
    '9999',
  ])
}

function MoneyValue({ amount, currency, locale }: { amount: number; currency: string; locale: string }) {
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(amount)
  const symbol = currency === 'ILS' ? '₪' : currency
  return (
    <p className="overview-stat-value">
      <span className="overview-currency" aria-hidden="true">
        {symbol}
      </span>
      <span className="overview-amount">{formatted}</span>
      <span className="visually-hidden">
        {new Intl.NumberFormat(locale, {
          style: 'currency',
          currency,
          maximumFractionDigits: 0,
        }).format(amount)}
      </span>
    </p>
  )
}

function inPeriod(isoDate: string, range: ChartRange, anchor: string) {
  if (range === 'day') return isoDate === anchor
  if (range === 'month') return isoDate.slice(0, 7) === anchor.slice(0, 7)
  return isoDate.slice(0, 4) === anchor.slice(0, 4)
}

function dateFromIso(value: string) {
  return value.slice(0, 10)
}

function computePeriodStats(
  state: ReturnType<typeof useClinic>['state'],
  range: ChartRange,
  anchor: string,
): PeriodStats {
  const totalPaid = state.invoices.reduce((sum, invoice) => {
    return (
      sum +
      invoice.payments.reduce((paid, payment) => {
        return paid + (inPeriod(payment.date, range, anchor) ? payment.amount : 0)
      }, 0)
    )
  }, 0)

  const pendingAmount = state.invoices.reduce((sum, invoice) => {
    if (!inPeriod(invoice.issuedOn, range, anchor)) return sum
    return sum + Math.max(0, invoiceBalance(invoice))
  }, 0)

  const patientIds = new Set<string>()
  for (const appointment of state.appointments) {
    const revision = currentAppointment(appointment)
    if (inPeriod(revision.date, range, anchor)) patientIds.add(appointment.patientId)
  }
  for (const invoice of state.invoices) {
    if (inPeriod(invoice.issuedOn, range, anchor)) patientIds.add(invoice.patientId)
    for (const payment of invoice.payments) {
      if (inPeriod(payment.date, range, anchor)) patientIds.add(invoice.patientId)
    }
  }

  const treatmentsDone = state.treatments.filter((item) => {
    const revision = currentTreatment(item)
    return revision.status === 'completed' && inPeriod(dateFromIso(revision.at), range, anchor)
  }).length

  let scheduled = 0
  let confirmed = 0
  let cancelled = 0
  for (const appointment of state.appointments) {
    const revision = currentAppointment(appointment)
    if (!inPeriod(revision.date, range, anchor)) continue
    if (revision.status === 'scheduled') scheduled += 1
    else if (revision.status === 'confirmed') confirmed += 1
    else if (revision.status === 'cancelled') cancelled += 1
  }

  return {
    totalPaid,
    pendingAmount,
    patients: patientIds.size,
    treatmentsDone,
    scheduled,
    confirmed,
    cancelled,
  }
}

export function TodayPage() {
  const { state } = useClinic()
  const m = useMessages()
  const announce = useAnnounce()
  const today = localIsoDate()
  const tomorrow = addDays(today, 1)
  const acting = state.staff.find((member) => member.id === state.actingStaffId)
  const welcomeName = acting?.givenName ?? m.common.unknownStaff
  const currency = state.invoices[0]?.currency ?? state.settings.currency

  const [selectedDay, setSelectedDay] = useState(today)
  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(today))
  const [selectedYear, setSelectedYear] = useState(() => Number(today.slice(0, 4)))
  const [scheduleSlot, setScheduleSlot] = useState<{ date: string; time: string } | null>(null)
  const [scheduleSaved, setScheduleSaved] = useState<string | null>(null)

  useEffect(() => {
    if (!scheduleSlot) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setScheduleSlot(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [scheduleSlot])

  const dayStats = useMemo(() => computePeriodStats(state, 'day', selectedDay), [state, selectedDay])
  const monthStats = useMemo(() => computePeriodStats(state, 'month', selectedMonth), [state, selectedMonth])
  const yearStats = useMemo(
    () => computePeriodStats(state, 'year', `${selectedYear}-01-01`),
    [state, selectedYear],
  )

  const widthSample = useMemo(
    () =>
      periodWidthSample(today, state.settings.intlLocale, {
        day: m.today.periodJumpToday,
        month: m.today.periodJumpMonth,
        year: m.today.periodJumpYear,
      }),
    [today, state.settings.intlLocale, m.today.periodJumpToday, m.today.periodJumpMonth, m.today.periodJumpYear],
  )

  const rows = useMemo(
    () =>
      state.appointments
        .map((appointment) => ({
          appointment,
          revision: currentAppointment(appointment),
        }))
        .filter((row) => row.revision.date === today || row.revision.date === tomorrow)
        .sort((a, b) => `${a.revision.date}${a.revision.time}`.localeCompare(`${b.revision.date}${b.revision.time}`)),
    [state.appointments, today, tomorrow],
  )

  const todays = rows.filter((row) => row.revision.date === today)
  const tomorrows = rows.filter((row) => row.revision.date === tomorrow)

  const [sentIds, setSentIds] = useState(() => {
    const initial = new Set<string>()
    for (const row of rows) {
      if (sessionStorage.getItem(waKey(row.appointment.id)) === '1') initial.add(row.appointment.id)
    }
    return initial
  })

  function markSent(appointmentId: string) {
    sessionStorage.setItem(waKey(appointmentId), '1')
    setSentIds((prev) => new Set(prev).add(appointmentId))
  }

  function openWhatsApp(row: ApptRow) {
    const patient = state.patients.find((item) => item.id === row.appointment.patientId)
    if (!patient?.phoneDigits || row.revision.status === 'cancelled') return false
    const text = fill(m.today.whatsappMessage, {
      patient: patient.givenName,
      clinic: state.clinicName,
      date: formatDate(row.revision.date, state.settings.intlLocale),
      time: formatTime(row.revision.time, state.settings.intlLocale),
    })
    window.open(`https://wa.me/${patient.phoneDigits}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
    markSent(row.appointment.id)
    return true
  }

  function contactAll() {
    const targets = rows.filter(
      (row) =>
        row.revision.status !== 'cancelled' &&
        !sentIds.has(row.appointment.id) &&
        state.patients.some((patient) => patient.id === row.appointment.patientId && patient.phoneDigits),
    )
    if (targets.length === 0) {
      announce(m.today.contactAllEmpty)
      return
    }
    let opened = 0
    for (const row of targets) {
      if (openWhatsApp(row)) opened += 1
    }
    if (opened > 0) announce(fill(m.today.contactAllSent, { count: opened }))
  }

  return (
    <div className="page overview-page">
      <div className="overview-layout">
        <div className="overview-main stack">
          <header className="overview-head">
            <div className="overview-head-copy">
              <h1>{fill(m.today.welcome, { name: welcomeName })}</h1>
              <p className="overview-sub">{m.today.updates}</p>
            </div>
          </header>

          <section className="overview-figures" aria-label={m.today.periodsLabel}>
            <PeriodPanel
              title={m.today.periodDay}
              periodLabel={formatDate(selectedDay, state.settings.intlLocale)}
              widthSample={widthSample}
              isCurrent={selectedDay === today}
              onPrev={() => setSelectedDay((day) => addDays(day, -1))}
              onNext={() => setSelectedDay((day) => addDays(day, 1))}
              onCurrent={() => setSelectedDay(today)}
              currentLabel={m.today.periodJumpToday}
              stats={dayStats}
              currency={currency}
              locale={state.settings.intlLocale}
              tone="day"
            />
            <PeriodPanel
              title={m.today.periodMonth}
              periodLabel={formatShortMonthYear(selectedMonth, state.settings.intlLocale)}
              widthSample={widthSample}
              isCurrent={selectedMonth === startOfMonth(today)}
              onPrev={() => setSelectedMonth((month) => startOfMonth(addMonths(month, -1)))}
              onNext={() => setSelectedMonth((month) => startOfMonth(addMonths(month, 1)))}
              onCurrent={() => setSelectedMonth(startOfMonth(today))}
              currentLabel={m.today.periodJumpMonth}
              stats={monthStats}
              currency={currency}
              locale={state.settings.intlLocale}
              tone="month"
            />
            <PeriodPanel
              title={m.today.periodYear}
              periodLabel={String(selectedYear)}
              widthSample={widthSample}
              isCurrent={selectedYear === Number(today.slice(0, 4))}
              onPrev={() => setSelectedYear((year) => year - 1)}
              onNext={() => setSelectedYear((year) => year + 1)}
              onCurrent={() => setSelectedYear(Number(today.slice(0, 4)))}
              currentLabel={m.today.periodJumpYear}
              stats={yearStats}
              currency={currency}
              locale={state.settings.intlLocale}
              tone="year"
            />
          </section>

          <AppointmentsStatusChart />
        </div>

        <aside className="overview-side stack" aria-labelledby="overview-upcoming">
          <div className="overview-side-actions">
            <Link className="button overview-schedule" to="/calendar">
              {m.today.schedulePatient}
            </Link>
            <button type="button" className="button button-secondary overview-contact-all" onClick={contactAll}>
              {m.today.contactAll}
            </button>
          </div>

          <div className="overview-side-panel stack">
            <h2 id="overview-upcoming">{m.today.upcoming}</h2>
            {scheduleSaved ? (
              <p className="meta" role="status">
                {scheduleSaved}
              </p>
            ) : null}
            <DayGroup
              title={fill(m.today.todayLabel, {
                date: formatDate(today, state.settings.intlLocale),
              })}
              empty={m.today.emptyAppointments}
              rows={todays}
              sentIds={sentIds}
              onContact={(row) => {
                if (openWhatsApp(row)) announce(m.today.whatsappSent)
              }}
            />
            <DayGroup
              title={fill(m.today.tomorrowLabel, {
                weekday: formatWeekday(tomorrow, state.settings.intlLocale),
                date: formatDate(tomorrow, state.settings.intlLocale),
              })}
              empty={m.today.emptyTomorrow}
              rows={tomorrows}
              sentIds={sentIds}
              onContact={(row) => {
                if (openWhatsApp(row)) announce(m.today.whatsappSent)
              }}
            />
          </div>

          <OpenSlotsPanel
            date={today}
            onOpenSlot={(time) => {
              setScheduleSaved(null)
              setScheduleSlot({ date: today, time })
            }}
          />
        </aside>
      </div>

      {scheduleSlot ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setScheduleSlot(null)
          }}
        >
          <div className="modal-panel" role="dialog" aria-modal="true" aria-label={m.appointment.scheduleAppointment}>
            <AppointmentForm
              kind="appointment"
              compact
              defaultDate={scheduleSlot.date}
              defaultTime={scheduleSlot.time}
              onCreated={() => {
                setScheduleSaved(m.appointment.savedAppointment)
                announce(m.appointment.savedAppointment)
                setScheduleSlot(null)
              }}
              onCancel={() => setScheduleSlot(null)}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

function PeriodPanel({
  title,
  periodLabel,
  widthSample,
  isCurrent,
  onPrev,
  onNext,
  onCurrent,
  currentLabel,
  stats,
  currency,
  locale,
  tone,
}: {
  title: string
  periodLabel: string
  widthSample: string
  isCurrent: boolean
  onPrev: () => void
  onNext: () => void
  onCurrent: () => void
  currentLabel: string
  stats: PeriodStats
  currency: string
  locale: string
  tone: 'day' | 'month' | 'year'
}) {
  const m = useMessages()
  const centerLabel = isCurrent ? currentLabel : periodLabel
  return (
    <section className={`overview-period tone-${tone}`}>
      <div className="overview-period-top">
        <p className="overview-period-kicker">{title}</p>
        <div className="overview-period-nav">
          <button type="button" className="overview-period-step" onClick={onPrev} aria-label={m.today.periodPrev}>
            ‹
          </button>
          <span className="overview-period-now-wrap">
            <span className="overview-period-now-sizer" aria-hidden="true">
              <span>{widthSample}</span>
              <span>{currentLabel}</span>
              <span>{periodLabel}</span>
            </span>
            <button
              type="button"
              className="overview-period-now"
              onClick={onCurrent}
              disabled={isCurrent}
              aria-label={isCurrent ? currentLabel : fill(m.today.periodJumpTo, { period: currentLabel })}
              title={periodLabel}
            >
              {centerLabel}
            </button>
          </span>
          <button type="button" className="overview-period-step" onClick={onNext} aria-label={m.today.periodNext}>
            ›
          </button>
        </div>
      </div>

      <div className="overview-period-stats">
        <div className="overview-metric">
          <MoneyValue amount={stats.totalPaid} currency={currency} locale={locale} />
          <p className="overview-stat-label">{m.today.statCollected}</p>
        </div>
        <div className="overview-metric">
          <MoneyValue amount={stats.pendingAmount} currency={currency} locale={locale} />
          <p className="overview-stat-label">{m.today.statToday}</p>
        </div>
        <div className="overview-metric">
          <p className="overview-stat-value">{stats.patients}</p>
          <p className="overview-stat-label">{m.today.statPatients}</p>
        </div>
        <div className="overview-metric">
          <p className="overview-stat-value">{stats.treatmentsDone}</p>
          <p className="overview-stat-label">{m.today.statTreatments}</p>
        </div>
      </div>

      <ul className="overview-period-status" aria-label={m.today.periodStatusLabel}>
        <li>
          <span className="overview-status-dot tone-scheduled" aria-hidden="true" />
          <span>{m.appointmentStatus.scheduled}</span>
          <strong>{stats.confirmed + stats.cancelled}</strong>
        </li>
        <li>
          <span className="overview-status-dot tone-confirmed" aria-hidden="true" />
          <span>{m.appointmentStatus.confirmed}</span>
          <strong>{stats.confirmed}</strong>
        </li>
        <li>
          <span className="overview-status-dot tone-cancelled" aria-hidden="true" />
          <span>{m.appointmentStatus.cancelled}</span>
          <strong>{stats.cancelled}</strong>
        </li>
      </ul>
    </section>
  )
}

function DayGroup({
  title,
  empty,
  rows,
  sentIds,
  onContact,
}: {
  title: string
  empty: string
  rows: ApptRow[]
  sentIds: Set<string>
  onContact: (row: ApptRow) => void
}) {
  return (
    <section className="overview-day stack">
      <h3 className="overview-day-title">{title}</h3>
      {rows.length === 0 ? (
        <EmptyState>{empty}</EmptyState>
      ) : (
        <ul className="overview-appt-list">
          {rows.map((row) => (
            <AppointmentRow
              key={row.appointment.id}
              row={row}
              sent={sentIds.has(row.appointment.id)}
              onContact={() => onContact(row)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function OpenSlotsPanel({ date, onOpenSlot }: { date: string; onOpenSlot: (time: string) => void }) {
  const { state } = useClinic()
  const m = useMessages()
  const [expanded, setExpanded] = useState(false)
  const openSlots = useMemo(() => openSlotStarts(state.appointments, date), [state.appointments, date])
  const visibleSlots = expanded ? openSlots : openSlots.slice(0, OPEN_SLOT_PREVIEW)
  const hiddenCount = Math.max(0, openSlots.length - OPEN_SLOT_PREVIEW)

  return (
    <section className="overview-side-panel overview-open-panel stack" aria-labelledby="overview-open-slots">
      <h2 id="overview-open-slots">{m.today.openSlots}</h2>
      {openSlots.length === 0 ? (
        <p className="meta">{m.today.openSlotsEmpty}</p>
      ) : (
        <div className="overview-slot-chips">
          {visibleSlots.map((time) => (
            <button
              key={time}
              type="button"
              className="overview-slot-chip"
              aria-label={fill(m.today.openSlotLabel, {
                time: formatTime(time, state.settings.intlLocale),
              })}
              onClick={() => onOpenSlot(time)}
            >
              {formatTime(time, state.settings.intlLocale)}
            </button>
          ))}
          {hiddenCount > 0 ? (
            <button
              type="button"
              className="overview-slot-chip overview-slot-more"
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? m.today.openSlotsShowLess : fill(m.today.openSlotsMore, { count: hiddenCount })}
            </button>
          ) : null}
        </div>
      )}
    </section>
  )
}

function AppointmentRow({
  row,
  sent,
  onContact,
}: {
  row: ApptRow
  sent: boolean
  onContact: () => void
}) {
  const { state, reviseAppointment } = useClinic()
  const m = useMessages()
  const announce = useAnnounce()
  const patient = state.patients.find((item) => item.id === row.appointment.patientId)
  if (!patient) return null

  const status = row.revision.status
  const canContact = status !== 'cancelled' && Boolean(patient.phoneDigits)
  const name = formatPersonName(patient, state.settings.nameOrder)
  const start = formatTime(row.revision.time, state.settings.intlLocale)
  const end = formatTime(addMinutesToTime(row.revision.time, row.revision.durationMinutes), state.settings.intlLocale)
  const when = `${start} – ${end}`

  function setStatus(next: 'confirmed' | 'cancelled') {
    const target = status === next ? 'scheduled' : next
    if (target === status) return
    reviseAppointment(row.appointment.id, {
      date: row.revision.date,
      time: row.revision.time,
      durationMinutes: row.revision.durationMinutes,
      providerId: row.revision.providerId,
      roomId: row.revision.roomId,
      status: target,
      reason: row.revision.reason,
    })
    announce(m.today.statusUpdated)
  }

  return (
    <li className={`overview-appt${status === 'cancelled' ? ' is-cancelled' : ''}${status === 'confirmed' ? ' is-confirmed' : ''}`}>
      <div className="overview-avatar" aria-hidden="true">
        {initials(patient.givenName, patient.familyName)}
      </div>
      <div className="overview-appt-main">
        <Link className="overview-appt-name" to={`/patients/${patient.id}/visits`}>
          {name}
        </Link>
        <p className="meta">{when}</p>
        <p className="overview-appt-reason">{row.revision.reason}</p>
      </div>
      <div className="overview-appt-actions">
        {canContact ? (
          <button
            type="button"
            className={`button overview-contact${sent ? ' is-sent' : ' button-secondary'}`}
            onClick={onContact}
            disabled={sent}
          >
            {sent ? m.today.contactSent : m.today.contact}
          </button>
        ) : (
          <span className="overview-contact-spacer" aria-hidden="true" />
        )}
        <div className="overview-status-toggle" role="group" aria-label={m.today.statusActions}>
          <button
            type="button"
            className={`overview-status-btn status-confirmed${status === 'confirmed' ? ' is-active' : ''}`}
            aria-pressed={status === 'confirmed'}
            onClick={() => setStatus('confirmed')}
          >
            {m.today.markConfirmed}
          </button>
          <button
            type="button"
            className={`overview-status-btn status-cancelled${status === 'cancelled' ? ' is-active' : ''}`}
            aria-pressed={status === 'cancelled'}
            onClick={() => setStatus('cancelled')}
          >
            {m.today.markCancelled}
          </button>
        </div>
      </div>
    </li>
  )
}
