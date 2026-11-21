import type { ReactNode } from 'react'
import { useMessages } from '../i18n'

export function EditHistory({
  items,
}: {
  items: { id: string; meta: ReactNode; detail: ReactNode }[]
}) {
  const m = useMessages()
  if (items.length === 0) return <p className="meta">{m.common.noEarlierVersions}</p>
  return (
    <details className="history">
      <summary>{m.common.editHistory}</summary>
      <ol>
        {items.map((item) => (
          <li key={item.id}>
            <div className="meta">{item.meta}</div>
            <div>{item.detail}</div>
          </li>
        ))}
      </ol>
    </details>
  )
}
