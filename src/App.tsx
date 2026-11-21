import { Component, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell'
import { ErrorScreen, LoadingScreen } from './components/States'
import { en } from './messages/en'
import { CalendarPage } from './pages/CalendarPage'
import { DirectoryPage } from './pages/DirectoryPage'
import { ProfilePage } from './pages/ProfilePage'
import { SettingsPage } from './pages/SettingsPage'
import { TodayPage } from './pages/TodayPage'
import { useClinic } from './store'

export function App() {
  const { phase, restoreDemo } = useClinic()
  if (phase === 'loading') return <LoadingScreen />
  if (phase === 'error') return <ErrorScreen onRestore={restoreDemo} />
  return (
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/patients" element={<DirectoryPage />} />
          <Route path="/patients/:patientId" element={<ProfilePage />} />
          <Route path="/patients/:patientId/:section" element={<ProfilePage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  )
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="gate">
          <p role="alert">{en.app.crash}</p>
        </div>
      )
    }
    return this.props.children
  }
}
