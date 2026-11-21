import type { Appointment, Invoice, TreatmentItem, VisitNote } from './types'

export function current<T>(items: T[]) {
  return items[items.length - 1]
}

export function currentNote(note: VisitNote) {
  return current(note.revisions)
}

export function isActiveNote(note: VisitNote) {
  return !note.deletedAt
}

export function currentAppointment(appointment: Appointment) {
  return current(appointment.revisions)
}

export function currentTreatment(item: TreatmentItem) {
  return current(item.revisions)
}

export function invoiceTotal(invoice: Invoice) {
  return invoice.lines.reduce((sum, line) => sum + line.amount, 0)
}

export function invoicePaid(invoice: Invoice) {
  return invoice.payments.reduce((sum, payment) => sum + payment.amount, 0)
}

export function invoiceBalance(invoice: Invoice) {
  return invoiceTotal(invoice) - invoicePaid(invoice)
}
