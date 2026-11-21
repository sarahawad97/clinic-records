import { useMessages } from '../i18n'

export function LoadingScreen() {
  const m = useMessages()
  return (
    <div className="gate">
      <p role="status">{m.common.loading}</p>
    </div>
  )
}

export function ErrorScreen({ onRestore }: { onRestore: () => void }) {
  const m = useMessages()
  return (
    <div className="gate">
      <h1>{m.storage.heading}</h1>
      <p role="alert">{m.storage.body}</p>
      <button type="button" className="button" onClick={onRestore}>
        {m.common.restore}
      </button>
    </div>
  )
}

export function EmptyState({ children }: { children: string }) {
  return <p className="empty" role="status">{children}</p>
}
