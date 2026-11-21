import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { formatPersonName } from '../format'
import { useMessages } from '../i18n'
import { useClinic } from '../store'

const Announce = createContext<(message: string) => void>(() => {})

export function useAnnounce() {
  return useContext(Announce)
}

export function Shell({ children }: { children: ReactNode }) {
  const { state, persistError, setActingStaff } = useClinic()
  const m = useMessages()
  const [live, setLive] = useState('')

  useEffect(() => {
    document.title = state.clinicName || m.app.title
    document.documentElement.lang = 'en'
    document.documentElement.dir = state.settings.dir
  }, [m.app.title, state.clinicName, state.settings.dir])

  function announce(message: string) {
    setLive('')
    window.setTimeout(() => setLive(message), 30)
  }

  return (
    <Announce.Provider value={announce}>
      <div className="app">
        <a className="skip" href="#content">
          {m.app.skip}
        </a>
        <aside className="rail">
          <div className="brand">
            <p className="brand-name">{state.clinicName}</p>
            <p className="brand-city">{state.city}</p>
          </div>
          <nav className="nav" aria-label={m.app.title}>
            <NavLink to="/" end>
              {m.app.nav.today}
            </NavLink>
            <NavLink to="/patients">{m.app.nav.patients}</NavLink>
            <NavLink to="/calendar">{m.app.nav.calendar}</NavLink>
            <NavLink to="/settings">{m.app.nav.settings}</NavLink>
          </nav>
          <div className="session">
            <label htmlFor="acting-staff">{m.app.recordingAs}</label>
            <select
              id="acting-staff"
              value={state.actingStaffId}
              onChange={(event) => setActingStaff(event.target.value)}
            >
              {state.staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {formatPersonName(member, state.settings.nameOrder)} — {m.roles[member.role]}
                </option>
              ))}
            </select>
            <p className="session-note">{m.app.demoSession}</p>
          </div>
          <p className="rail-foot">{m.app.footer}</p>
        </aside>
        <div className="workspace">
          <p className="banner">{m.app.banner}</p>
          {persistError ? (
            <p className="banner banner-error" role="alert">
              {m.app.persistError}
            </p>
          ) : null}
          <main id="content" tabIndex={-1}>
            {children}
          </main>
        </div>
        <div className="live" aria-live="polite">
          {live}
        </div>
      </div>
    </Announce.Provider>
  )
}
