import { useEffect, useState } from 'react'
import {
  formatAddress,
  formatLongDate,
  formatMoney,
  formatPhone,
  localIsoDate,
} from '../format'
import { useMessages } from '../i18n'
import { useClinic } from '../store'
import { useAnnounce } from '../components/Shell'
import type { ClinicSettings } from '../types'

const LOCALES: ClinicSettings['intlLocale'][] = ['en-IL', 'en-GB', 'en-US']
const CURRENCIES: ClinicSettings['currency'][] = ['ILS', 'USD', 'EUR', 'GBP']

export function SettingsPage() {
  const { state, updateSettings, setClinicName, restoreDemo } = useClinic()
  const m = useMessages()
  const announce = useAnnounce()
  const [name, setName] = useState(state.clinicName)
  const [nameError, setNameError] = useState('')
  const [confirmRestore, setConfirmRestore] = useState(false)

  useEffect(() => {
    setName(state.clinicName)
  }, [state.clinicName])

  const previewAddress = formatAddress(
    {
      street: '8 Demo Orchard',
      city: 'Jerusalem',
      postalCode: '9000001',
      country: 'Israel',
    },
    state.settings.addressPreset,
  )

  return (
    <div className="page stack">
      <header className="page-head">
        <h1>{m.settings.heading}</h1>
        <p>{m.settings.intro}</p>
      </header>

      <section className="card stack">
        <h2>{m.settings.about}</h2>
        <p>{m.settings.aboutBody}</p>
      </section>

      <section className="card stack">
        <h2>{m.settings.clinicName}</h2>
        <form
          className="stack"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            const next = name.trim()
            if (!next) {
              setNameError(m.settings.clinicNameError)
              return
            }
            setNameError('')
            setClinicName(next)
            announce(m.settings.savedName)
          }}
        >
          <div className="field">
            <label htmlFor="clinic-name">{m.settings.clinicName}</label>
            <input
              id="clinic-name"
              value={name}
              aria-invalid={Boolean(nameError)}
              onChange={(event) => setName(event.target.value)}
            />
            {nameError ? <p className="field-error">{nameError}</p> : null}
          </div>
          <button type="submit" className="button">
            {m.settings.save}
          </button>
        </form>
      </section>

      <section className="card stack">
        <h2>{m.settings.language}</h2>
        <div className="field">
          <label htmlFor="language">{m.settings.language}</label>
          <select id="language" value="en" disabled>
            <option value="en">{m.settings.languageValue}</option>
          </select>
          <p className="hint">{m.settings.languageHelp}</p>
        </div>
        <fieldset>
          <legend>{m.settings.direction}</legend>
          <label className="choice">
            <input
              type="radio"
              name="dir"
              checked={state.settings.dir === 'ltr'}
              onChange={() => updateSettings({ dir: 'ltr' })}
            />
            {m.settings.ltr}
          </label>
          <label className="choice">
            <input
              type="radio"
              name="dir"
              checked={state.settings.dir === 'rtl'}
              onChange={() => updateSettings({ dir: 'rtl' })}
            />
            {m.settings.rtl}
          </label>
          <p className="hint">{m.settings.directionHelp}</p>
        </fieldset>
      </section>

      <section className="card stack">
        <h2>{m.settings.formats}</h2>
        <div className="split">
          <div className="field">
            <label htmlFor="date-locale">{m.settings.dateLocale}</label>
            <select
              id="date-locale"
              value={state.settings.intlLocale}
              onChange={(event) => {
                const value = event.target.value as ClinicSettings['intlLocale']
                if (LOCALES.includes(value)) updateSettings({ intlLocale: value })
              }}
            >
              {LOCALES.map((locale) => (
                <option key={locale} value={locale}>
                  {locale}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="currency">{m.settings.currency}</label>
            <select
              id="currency"
              value={state.settings.currency}
              onChange={(event) => {
                const value = event.target.value as ClinicSettings['currency']
                if (CURRENCIES.includes(value)) updateSettings({ currency: value })
              }}
            >
              {CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
            <p className="hint">{m.settings.currencyHelp}</p>
          </div>
        </div>
        <fieldset>
          <legend>{m.settings.phone}</legend>
          <label className="choice">
            <input
              type="radio"
              name="phone"
              checked={state.settings.phonePreset === 'il-mobile'}
              onChange={() => updateSettings({ phonePreset: 'il-mobile' })}
            />
            {m.settings.phoneIl}
          </label>
          <label className="choice">
            <input
              type="radio"
              name="phone"
              checked={state.settings.phonePreset === 'international'}
              onChange={() => updateSettings({ phonePreset: 'international' })}
            />
            {m.settings.phoneIntl}
          </label>
        </fieldset>
        <fieldset>
          <legend>{m.settings.address}</legend>
          <label className="choice">
            <input
              type="radio"
              name="address"
              checked={state.settings.addressPreset === 'street-city'}
              onChange={() => updateSettings({ addressPreset: 'street-city' })}
            />
            {m.settings.addressStreet}
          </label>
          <label className="choice">
            <input
              type="radio"
              name="address"
              checked={state.settings.addressPreset === 'city-street'}
              onChange={() => updateSettings({ addressPreset: 'city-street' })}
            />
            {m.settings.addressCity}
          </label>
        </fieldset>
        <fieldset>
          <legend>{m.settings.nameOrder}</legend>
          <label className="choice">
            <input
              type="radio"
              name="name-order"
              checked={state.settings.nameOrder === 'given-family'}
              onChange={() => updateSettings({ nameOrder: 'given-family' })}
            />
            {m.settings.givenFamily}
          </label>
          <label className="choice">
            <input
              type="radio"
              name="name-order"
              checked={state.settings.nameOrder === 'family-given'}
              onChange={() => updateSettings({ nameOrder: 'family-given' })}
            />
            {m.settings.familyGiven}
          </label>
        </fieldset>
        <fieldset>
          <legend>{m.settings.weekStart}</legend>
          <label className="choice">
            <input
              type="radio"
              name="week"
              checked={state.settings.weekStartsOn === 6}
              onChange={() => updateSettings({ weekStartsOn: 6 })}
            />
            {m.settings.saturday}
          </label>
          <label className="choice">
            <input
              type="radio"
              name="week"
              checked={state.settings.weekStartsOn === 0}
              onChange={() => updateSettings({ weekStartsOn: 0 })}
            />
            {m.settings.sunday}
          </label>
          <label className="choice">
            <input
              type="radio"
              name="week"
              checked={state.settings.weekStartsOn === 1}
              onChange={() => updateSettings({ weekStartsOn: 1 })}
            />
            {m.settings.monday}
          </label>
        </fieldset>
        <div className="card inset">
          <h3>{m.settings.preview}</h3>
          <p>{formatLongDate(localIsoDate(), state.settings.intlLocale)}</p>
          <p dir="ltr">{formatPhone('972500000000', state.settings.phonePreset)}</p>
          <p>{formatMoney(1050.5, state.settings.currency, state.settings.intlLocale)}</p>
          {previewAddress.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </section>

      <section className="card stack">
        <h2>{m.settings.notation}</h2>
        <fieldset>
          <legend>{m.settings.notation}</legend>
          <label className="choice">
            <input type="radio" name="notation" checked readOnly />
            {m.settings.fdi}
          </label>
          <label className="choice">
            <input type="radio" name="notation" disabled />
            {m.settings.universal} ({m.settings.notEnabled})
          </label>
          <label className="choice">
            <input type="radio" name="notation" disabled />
            {m.settings.palmer} ({m.settings.notEnabled})
          </label>
          <p className="hint">{m.settings.notationHelp}</p>
        </fieldset>
      </section>

      <section className="card stack">
        <h2>{m.settings.staff}</h2>
        <p>{m.settings.staffHelp}</p>
        <ul className="person-list">
          {state.staff.map((member) => (
            <li key={member.id} className="row spread">
              <span>
                {member.givenName} {member.familyName}
              </span>
              <span className="meta">{m.roles[member.role]}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card stack">
        <h2>{m.settings.restoreTitle}</h2>
        <p>{m.settings.restoreHelp}</p>
        {confirmRestore ? (
          <div className="stack">
            <p role="alert">{m.settings.restoreConfirm}</p>
            <div className="row">
              <button
                type="button"
                className="button"
                onClick={() => {
                  restoreDemo()
                  setConfirmRestore(false)
                  announce(m.settings.restored)
                }}
              >
                {m.settings.restoreAction}
              </button>
              <button type="button" className="button button-secondary" onClick={() => setConfirmRestore(false)}>
                {m.settings.keep}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="button button-secondary" onClick={() => setConfirmRestore(true)}>
            {m.common.restore}
          </button>
        )}
      </section>
    </div>
  )
}
