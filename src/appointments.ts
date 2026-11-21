import {
  CLINIC_CLOSE_MINUTES,
  CLINIC_OPEN_MINUTES,
  minutesToTime,
  timeToMinutes,
} from './components/AppointmentForm'
import { currentAppointment } from './record'
import type { Appointment } from './types'

export function appointmentRange(time: string, durationMinutes: number) {
  const start = timeToMinutes(time)
  if (start === null) return null
  return { start, end: start + durationMinutes }
}

export function rangesOverlap(
  a: { start: number; end: number },
  b: { start: number; end: number },
) {
  return a.start < b.end && b.start < a.end
}

export function appointmentsOverlap(
  appointments: Appointment[],
  input: {
    date: string
    time: string
    durationMinutes: number
    providerId: string
    roomId: string
    patientId: string
    excludeId?: string | null
  },
) {
  const range = appointmentRange(input.time, input.durationMinutes)
  if (!range) return false

  return appointments.some((appointment) => {
    if (input.excludeId && appointment.id === input.excludeId) return false
    const revision = currentAppointment(appointment)
    if (revision.status === 'cancelled') return false
    if (revision.date !== input.date) return false
    if (
      revision.providerId !== input.providerId &&
      revision.roomId !== input.roomId &&
      appointment.patientId !== input.patientId
    ) {
      return false
    }
    const other = appointmentRange(revision.time, revision.durationMinutes)
    return Boolean(other && rangesOverlap(range, other))
  })
}

/** Clinic-wide open starts for a day (skips times blocked by any non-cancelled visit). */
export function openSlotStarts(
  appointments: Appointment[],
  date: string,
  options?: { stepMinutes?: number; slotMinutes?: number },
) {
  const stepMinutes = options?.stepMinutes ?? 30
  const slotMinutes = options?.slotMinutes ?? 30
  const busy = appointments
    .map((appointment) => {
      const revision = currentAppointment(appointment)
      if (revision.status === 'cancelled' || revision.date !== date) return null
      return appointmentRange(revision.time, revision.durationMinutes)
    })
    .filter((range): range is { start: number; end: number } => range !== null)

  const slots: string[] = []
  for (let start = CLINIC_OPEN_MINUTES; start + slotMinutes <= CLINIC_CLOSE_MINUTES; start += stepMinutes) {
    const range = { start, end: start + slotMinutes }
    if (busy.some((block) => rangesOverlap(range, block))) continue
    slots.push(minutesToTime(start))
  }
  return slots
}

export function layoutDayColumns<T extends { id: string; start: number; end: number }>(events: T[]) {
  const sorted = [...events].sort((a, b) => a.start - b.start || a.end - b.end || a.id.localeCompare(b.id))
  const columns: { id: string; end: number }[][] = []
  const colById = new Map<string, number>()

  for (const event of sorted) {
    let col = columns.findIndex((column) => {
      const last = column[column.length - 1]
      return last.end <= event.start
    })
    if (col === -1) {
      col = columns.length
      columns.push([])
    }
    columns[col].push({ id: event.id, end: event.end })
    colById.set(event.id, col)
  }

  const colsById = new Map<string, number>()
  for (const event of sorted) {
    let maxCol = colById.get(event.id) ?? 0
    for (const other of sorted) {
      if (other.id === event.id) continue
      if (!rangesOverlap(event, other)) continue
      maxCol = Math.max(maxCol, colById.get(other.id) ?? 0)
    }
    colsById.set(event.id, maxCol + 1)
  }

  return sorted.map((event) => {
    const col = colById.get(event.id) ?? 0
    const cols = colsById.get(event.id) ?? 1
    return {
      ...event,
      col,
      cols,
      leftPct: (col / cols) * 100,
      widthPct: (1 / cols) * 100,
    }
  })
}
