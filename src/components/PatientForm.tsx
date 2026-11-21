import { useState, type FormEvent } from 'react'
import { useMessages } from '../i18n'
import { useClinic } from '../store'
import { useAnnounce } from './Shell'

function normalizePhoneDigits(value: string) {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('972') && digits.length >= 12) return digits.slice(0, 12)
  if (digits.startsWith('0') && digits.length >= 10) return `972${digits.slice(1, 10)}`
  if (digits.length === 9) return `972${digits}`
  return digits
}

export function PatientForm({
  initialGivenName = '',
  initialFamilyName = '',
  onCreated,
  onCancel,
}: {
  initialGivenName?: string
  initialFamilyName?: string
  onCreated: (patientId: string) => void
  onCancel: () => void
}) {
  const { addPatient } = useClinic()
  const m = useMessages()
  const announce = useAnnounce()
  const [givenName, setGivenName] = useState(initialGivenName)
  const [familyName, setFamilyName] = useState(initialFamilyName)
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  function submit(event: FormEvent) {
    event.preventDefault()
    const next: string[] = []
    if (!givenName.trim()) next.push('givenName')
    if (!familyName.trim()) next.push('familyName')
    if (!dateOfBirth) next.push('dateOfBirth')
    const phoneDigits = normalizePhoneDigits(phone)
    if (phoneDigits.length < 11) next.push('phone')
    if (!city.trim()) next.push('city')
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.push('email')
    setErrors(next)
    if (next.length > 0) return

    setSaving(true)
    window.setTimeout(() => {
      const id = addPatient({
        givenName,
        familyName,
        dateOfBirth,
        phoneDigits,
        email,
        street,
        city,
        postalCode,
        country: 'Israel',
      })
      announce(m.patientForm.saved)
      setSaving(false)
      onCreated(id)
    }, 120)
  }

  const errorText: Record<string, string> = {
    givenName: m.patientForm.givenNameError,
    familyName: m.patientForm.familyNameError,
    dateOfBirth: m.patientForm.dateOfBirthError,
    phone: m.patientForm.phoneError,
    city: m.patientForm.cityError,
    email: m.patientForm.emailError,
  }

  return (
    <form className="card stack patient-form" noValidate onSubmit={submit}>
      <h3>{m.patientForm.heading}</h3>
      {errors.length > 0 ? (
        <div className="form-errors patient-form-errors" role="alert">
          <p>{m.patientForm.mandatorySummary}</p>
          <ul>
            {errors.map((key) => (
              <li key={key}>{errorText[key]}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="patient-form-grid">
        <div className="field">
          <label htmlFor="patient-given">
            {m.patientForm.givenName}
            <span className="patient-required" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="patient-given"
            value={givenName}
            aria-invalid={errors.includes('givenName')}
            aria-required="true"
            onChange={(event) => setGivenName(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="patient-family">
            {m.patientForm.familyName}
            <span className="patient-required" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="patient-family"
            value={familyName}
            aria-invalid={errors.includes('familyName')}
            aria-required="true"
            onChange={(event) => setFamilyName(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="patient-dob">
            {m.patientForm.dateOfBirth}
            <span className="patient-required" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="patient-dob"
            type="date"
            value={dateOfBirth}
            aria-invalid={errors.includes('dateOfBirth')}
            aria-required="true"
            onChange={(event) => setDateOfBirth(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="patient-phone">
            {m.patientForm.phone}
            <span className="patient-required" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="patient-phone"
            type="tel"
            inputMode="tel"
            dir="ltr"
            placeholder={m.patientForm.phonePlaceholder}
            value={phone}
            aria-invalid={errors.includes('phone')}
            aria-required="true"
            onChange={(event) => setPhone(event.target.value)}
          />
        </div>

        <div className="field patient-form-span">
          <label htmlFor="patient-email">{m.patientForm.email}</label>
          <input
            id="patient-email"
            type="email"
            value={email}
            aria-invalid={errors.includes('email')}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="field patient-form-span">
          <label htmlFor="patient-street">{m.patientForm.street}</label>
          <input id="patient-street" value={street} onChange={(event) => setStreet(event.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="patient-city">
            {m.patientForm.city}
            <span className="patient-required" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="patient-city"
            value={city}
            aria-invalid={errors.includes('city')}
            aria-required="true"
            onChange={(event) => setCity(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="patient-postal">{m.patientForm.postalCode}</label>
          <input
            id="patient-postal"
            value={postalCode}
            onChange={(event) => setPostalCode(event.target.value)}
          />
        </div>
      </div>

      <div className="appointment-form-actions">
        <button type="button" className="button button-secondary" onClick={onCancel}>
          {m.common.cancel}
        </button>
        <button type="submit" className="button appointment-form-primary" disabled={saving}>
          {saving ? m.common.saving : m.patientForm.save}
        </button>
      </div>
    </form>
  )
}
