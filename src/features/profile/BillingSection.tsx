import { useState, type FormEvent } from 'react'
import { Badge } from '../../components/Badge'
import { EditHistory } from '../../components/EditHistory'
import { RecordMeta } from '../../components/RecordMeta'
import { useAnnounce } from '../../components/Shell'
import { EmptyState } from '../../components/States'
import { formatDate, formatMoney } from '../../format'
import { useMessages } from '../../i18n'
import { invoiceBalance, invoicePaid, invoiceTotal } from '../../record'
import { useClinic } from '../../store'
import { fill } from '../../text'
import type { Invoice, Patient, PaymentMethod } from '../../types'

const METHODS: PaymentMethod[] = ['cash', 'card', 'transfer', 'other']

function revisionLabel(summary: string, labels: { created: string; payment: string }) {
  if (summary === 'created') return labels.created
  if (summary === 'payment') return labels.payment
  return summary
}

export function BillingSection({ patient }: { patient: Patient }) {
  const { state } = useClinic()
  const m = useMessages()
  const invoices = state.invoices.filter((invoice) => invoice.patientId === patient.id)
  return (
    <section className="stack" aria-labelledby="billing-heading">
      <h2 id="billing-heading">{m.billing.heading}</h2>
      <p>{m.billing.intro}</p>
      {invoices.length === 0 ? (
        <EmptyState>{m.billing.empty}</EmptyState>
      ) : (
        <ul className="person-list">
          {invoices.map((invoice) => (
            <InvoiceCard key={invoice.id} invoice={invoice} />
          ))}
        </ul>
      )}
    </section>
  )
}

function InvoiceCard({ invoice }: { invoice: Invoice }) {
  const { state, addPayment } = useClinic()
  const m = useMessages()
  const announce = useAnnounce()
  const [date, setDate] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod | ''>('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [saved, setSaved] = useState(false)
  const total = invoiceTotal(invoice)
  const paid = invoicePaid(invoice)
  const balance = invoiceBalance(invoice)
  const balanceLabel = balance === 0 ? m.billing.settled : balance > 0 ? m.billing.due : m.billing.credit
  const locale = state.settings.intlLocale

  function submit(event: FormEvent) {
    event.preventDefault()
    const next: string[] = []
    if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) next.push('amount')
    if (!date) next.push('date')
    if (!method) next.push('method')
    setErrors(next)
    setSaved(false)
    if (next.length > 0 || !method) return
    addPayment({
      invoiceId: invoice.id,
      date,
      amount: Number(amount),
      method,
      note,
    })
    setAmount('')
    setNote('')
    setMethod('')
    setSaved(true)
    announce(m.billing.saved)
  }

  return (
    <li className="card stack">
      <div className="row spread">
        <h3>
          {m.billing.issued} {formatDate(invoice.issuedOn, locale)}
        </h3>
        <Badge status={balance === 0 ? 'completed' : balance > 0 ? 'planned' : 'in_progress'} label={balanceLabel} />
      </div>
      <p className="hint">{fill(m.billing.currencyNote, { currency: invoice.currency })}</p>
      <h4>{m.billing.items}</h4>
      <ul>
        {invoice.lines.map((line) => (
          <li key={line.id} className="row spread">
            <span>
              {line.description}
              {line.toothFdi ? ` · ${fill(m.common.tooth, { tooth: line.toothFdi })}` : ''}
            </span>
            <span>{formatMoney(line.amount, invoice.currency, locale)}</span>
          </li>
        ))}
      </ul>
      <dl className="facts">
        <div>
          <dt>{m.billing.total}</dt>
          <dd>{formatMoney(total, invoice.currency, locale)}</dd>
        </div>
        <div>
          <dt>{m.billing.paid}</dt>
          <dd>{formatMoney(paid, invoice.currency, locale)}</dd>
        </div>
        <div>
          <dt>{m.billing.balance}</dt>
          <dd>{formatMoney(balance, invoice.currency, locale)}</dd>
        </div>
      </dl>
      <h4>{m.billing.payments}</h4>
      {invoice.payments.length === 0 ? (
        <EmptyState>{m.billing.emptyPayments}</EmptyState>
      ) : (
        <ul className="person-list">
          {invoice.payments.map((payment) => (
            <li key={payment.id}>
              <p>
                {formatDate(payment.date, locale)} · {formatMoney(payment.amount, invoice.currency, locale)} ·{' '}
                {m.paymentMethods[payment.method]}
              </p>
              {payment.note ? <p>{payment.note}</p> : null}
              <RecordMeta at={payment.recordedAt} authorId={payment.authorId} />
            </li>
          ))}
        </ul>
      )}
      <form className="stack" noValidate onSubmit={submit}>
        <h4>{m.billing.recordPayment}</h4>
        {errors.length > 0 ? (
          <div className="form-errors" role="alert">
            <p>{m.common.errorSummary}</p>
            <ul>
              {errors.includes('amount') ? <li>{m.billing.amountError}</li> : null}
              {errors.includes('date') ? <li>{m.billing.dateError}</li> : null}
              {errors.includes('method') ? <li>{m.billing.methodError}</li> : null}
            </ul>
          </div>
        ) : null}
        {saved ? <p role="status">{m.billing.saved}</p> : null}
        <div className="split">
          <div className="field">
            <label htmlFor={`pay-amount-${invoice.id}`}>{m.billing.amount}</label>
            <input
              id={`pay-amount-${invoice.id}`}
              inputMode="decimal"
              value={amount}
              aria-invalid={errors.includes('amount')}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor={`pay-date-${invoice.id}`}>{m.billing.paymentDate}</label>
            <input
              id={`pay-date-${invoice.id}`}
              type="date"
              value={date}
              aria-invalid={errors.includes('date')}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor={`pay-method-${invoice.id}`}>{m.billing.method}</label>
            <select
              id={`pay-method-${invoice.id}`}
              value={method}
              aria-invalid={errors.includes('method')}
              onChange={(event) => setMethod(event.target.value as PaymentMethod | '')}
            >
              <option value="">{m.billing.chooseMethod}</option>
              {METHODS.map((value) => (
                <option key={value} value={value}>
                  {m.paymentMethods[value]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor={`pay-note-${invoice.id}`}>{m.billing.paymentNote}</label>
          <p className="hint" id={`pay-note-${invoice.id}-hint`}>
            {m.billing.paymentNoteHint}
          </p>
          <textarea
            id={`pay-note-${invoice.id}`}
            aria-describedby={`pay-note-${invoice.id}-hint`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        <button type="submit" className="button">
          {m.billing.savePayment}
        </button>
      </form>
      <EditHistory
        items={[...invoice.revisions].reverse().map((revision, index) => ({
          id: `${invoice.id}-rev-${index}`,
          meta: <RecordMeta at={revision.at} authorId={revision.authorId} />,
          detail: (
            <p>
              {revisionLabel(revision.summary, {
                created: m.billing.revisionCreated,
                payment: m.billing.revisionPayment,
              })}
            </p>
          ),
        }))}
      />
    </li>
  )
}
