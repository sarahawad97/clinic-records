import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PatientForm } from '../components/PatientForm'
import { EmptyState } from '../components/States'
import {
  addDays,
  formatDate,
  formatPersonName,
  formatPhone,
  formatTime,
  localIsoDate,
} from '../format'
import { useMessages } from '../i18n'
import { currentAppointment, invoiceBalance } from '../record'
import { useClinic } from '../store'
import { fill } from '../text'
import type { Appointment, Invoice, Patient } from '../types'

type SortMode = 'name_asc' | 'name_desc' | 'appointment' | 'pending'

type NextVisit = { date: string; time: string }

function nextVisitFor(patientId: string, appointments: Appointment[], today: string): NextVisit | null {
  const upcoming = appointments
    .map((appointment) => ({ appointment, revision: currentAppointment(appointment) }))
    .filter(
      (row) =>
        row.appointment.patientId === patientId &&
        row.revision.status !== 'cancelled' &&
        row.revision.date >= today &&
        row.revision.date <= addDays(today, 365),
    )
    .sort((a, b) =>
      `${a.revision.date}${a.revision.time}`.localeCompare(`${b.revision.date}${b.revision.time}`),
    )[0]
  return upcoming ? { date: upcoming.revision.date, time: upcoming.revision.time } : null
}

function compareNames(
  a: Patient,
  b: Patient,
  locale: string,
  nameOrder: 'given-family' | 'family-given',
) {
  if (nameOrder === 'family-given') {
    return (
      a.familyName.localeCompare(b.familyName, locale) ||
      a.givenName.localeCompare(b.givenName, locale)
    )
  }
  return (
    a.givenName.localeCompare(b.givenName, locale) ||
    a.familyName.localeCompare(b.familyName, locale)
  )
}

function pendingFor(patientId: string, invoices: Invoice[]) {
  return invoices.reduce((sum, invoice) => {
    if (invoice.patientId !== patientId) return sum
    return sum + Math.max(0, invoiceBalance(invoice))
  }, 0)
}

function formatPending(amount: number, currency: string, locale: string) {
  if (amount <= 0) return null
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function DirectoryPage() {
  const { state } = useClinic()
  const m = useMessages()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortMode>('name_asc')
  const [adding, setAdding] = useState(false)
  const today = localIsoDate()
  const patients = useMemo(() => {
    const q = query.trim().toLowerCase()
    const digits = q.replace(/\D/g, '')
    const locale = state.settings.intlLocale
    const nameOrder = state.settings.nameOrder
    const rows = state.patients
      .filter((patient) => {
        if (!q) return true
        const name = `${patient.givenName} ${patient.familyName}`.toLowerCase()
        const reversed = `${patient.familyName} ${patient.givenName}`.toLowerCase()
        return (
          name.includes(q) ||
          reversed.includes(q) ||
          patient.email.toLowerCase().includes(q) ||
          (digits.length > 0 && patient.phoneDigits.includes(digits))
        )
      })
      .map((patient) => ({
        patient,
        next: nextVisitFor(patient.id, state.appointments, today),
        pending: pendingFor(patient.id, state.invoices),
      }))
    return [...rows].sort((a, b) => {
      if (sort === 'name_asc') return compareNames(a.patient, b.patient, locale, nameOrder)
      if (sort === 'name_desc') return compareNames(b.patient, a.patient, locale, nameOrder)
      if (sort === 'pending') {
        return b.pending - a.pending || compareNames(a.patient, b.patient, locale, nameOrder)
      }
      if (!a.next && !b.next) return compareNames(a.patient, b.patient, locale, nameOrder)
      if (!a.next) return 1
      if (!b.next) return -1
      return (
        `${a.next.date}${a.next.time}`.localeCompare(`${b.next.date}${b.next.time}`) ||
        compareNames(a.patient, b.patient, locale, nameOrder)
      )
    })
  }, [
    query,
    sort,
    state.appointments,
    state.invoices,
    state.patients,
    state.settings.intlLocale,
    state.settings.nameOrder,
    today,
  ])

  const currency = state.invoices[0]?.currency ?? state.settings.currency

  useEffect(() => {
    if (!adding) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setAdding(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [adding])

  const countLabel = query.trim()
    ? fill(m.directory.filteredCount, { count: patients.length })
    : fill(m.directory.count, { count: patients.length })

  return (
    <div className="page stack directory-page">
      <div className="directory-top stack">
        <header className="page-head directory-head">
          <div>
            <h1>{m.directory.heading}</h1>
            <p>{m.directory.intro}</p>
          </div>
          <button type="button" className="button" onClick={() => setAdding(true)}>
            {m.directory.addPatient}
          </button>
        </header>
        <div className="split directory-tools">
          <div className="field">
            <label htmlFor="patient-search">{m.directory.searchLabel}</label>
            <input
              id="patient-search"
              type="search"
              data-testid="search-patients"
              value={query}
              placeholder={m.directory.searchPlaceholder}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="patient-sort">{m.directory.sortLabel}</label>
            <select
              id="patient-sort"
              data-testid="sort-patients"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortMode)}
            >
              <option value="name_asc">{m.directory.sortNameAsc}</option>
              <option value="name_desc">{m.directory.sortNameDesc}</option>
              <option value="appointment">{m.directory.sortAppointment}</option>
              <option value="pending">{m.directory.sortPending}</option>
            </select>
          </div>
        </div>
        <p className="meta directory-count" role="status">
          {countLabel}
        </p>
      </div>

      <div className="directory-scroll">
        {state.patients.length === 0 ? (
          <EmptyState>{m.directory.noPatients}</EmptyState>
        ) : patients.length === 0 ? (
          <EmptyState>{m.directory.empty}</EmptyState>
        ) : (
          <div className="directory-table" role="table" aria-label={m.directory.listLabel}>
            <div className="directory-row directory-row-head" role="row">
              <span role="columnheader">{m.directory.name}</span>
              <span role="columnheader">{m.directory.phone}</span>
              <span role="columnheader">{m.directory.next}</span>
              <span role="columnheader">{m.directory.pending}</span>
            </div>
            <ul className="directory-list" role="rowgroup">
              {patients.map(({ patient, next, pending }) => {
                const pendingLabel = formatPending(pending, currency, state.settings.intlLocale)
                return (
                  <li key={patient.id} role="row">
                    <Link className="directory-row" to={`/patients/${patient.id}/details`}>
                      <span className="directory-cell-name" role="cell">
                        {formatPersonName(patient, state.settings.nameOrder)}
                      </span>
                      <span className="directory-cell-phone" role="cell" dir="ltr">
                        {formatPhone(patient.phoneDigits, state.settings.phonePreset)}
                      </span>
                      <span className="directory-cell-next" role="cell">
                        {next
                          ? `${formatDate(next.date, state.settings.intlLocale)} ${formatTime(next.time, state.settings.intlLocale)}`
                          : m.directory.noNext}
                      </span>
                      <span
                        className={`directory-cell-pending${pendingLabel ? ' has-pending' : ''}`}
                        role="cell"
                      >
                        {pendingLabel ?? m.directory.noPending}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

      {adding ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setAdding(false)
          }}
        >
          <div className="modal-panel" role="dialog" aria-modal="true" aria-label={m.directory.addDialog}>
            <PatientForm onCreated={() => setAdding(false)} onCancel={() => setAdding(false)} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
