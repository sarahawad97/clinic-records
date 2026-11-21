import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App, AppErrorBoundary } from './App'
import { MessagesProvider } from './i18n'
import { ClinicProvider } from './store'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <MessagesProvider>
        <ClinicProvider>
          <App />
        </ClinicProvider>
      </MessagesProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
