import { useRef } from 'react'
import { CHART_H, CHART_W, ALL_TEETH, archPath, toothSpots } from '../teeth'
import type { RecordStatus } from '../types'
import { useMessages } from '../i18n'
import { fill } from '../text'

const TOKEN_ORDER: RecordStatus[] = ['in_progress', 'planned', 'finding', 'completed']
const TOKEN_LETTER: Record<RecordStatus, string> = {
  in_progress: 'IP',
  planned: 'P',
  finding: 'F',
  completed: 'C',
}

export function ToothChart({
  marks,
  selectedId,
  onSelect,
}: {
  marks: Record<string, RecordStatus[]>
  selectedId: string | null
  onSelect: (toothId: string) => void
}) {
  const m = useMessages()
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({})
  const spots = toothSpots()

  function move(current: string, key: string) {
    const index = ALL_TEETH.indexOf(current)
    if (index < 0) return
    let next = index
    if (key === 'ArrowRight') next = Math.min(ALL_TEETH.length - 1, index + 1)
    if (key === 'ArrowLeft') next = Math.max(0, index - 1)
    if (key === 'ArrowDown' && index < 16) next = index + 16
    if (key === 'ArrowUp' && index >= 16) next = index - 16
    if (next !== index) buttons.current[ALL_TEETH[next]]?.focus()
  }

  return (
    <div className="stack">
      <div className="chart-orient" dir="ltr">
        <span>{m.chart.patientRight}</span>
        <span>{m.chart.patientLeft}</span>
      </div>
      <div className="chart-scroll">
        <div
          className="chart-board"
          dir="ltr"
          role="group"
          aria-label={m.chart.groupLabel}
          style={{ aspectRatio: `${CHART_W} / ${CHART_H}` }}
        >
          <svg className="arch-lines" viewBox={`0 0 ${CHART_W} ${CHART_H}`} aria-hidden="true">
            <path d={archPath('upper')} />
            <path d={archPath('lower')} />
            <line x1={CHART_W / 2} y1="40" x2={CHART_W / 2} y2={CHART_H - 40} />
          </svg>
          <p className="arch-label arch-upper">{m.chart.upper}</p>
          <p className="arch-label arch-lower">{m.chart.lower}</p>
          {spots.map((spot) => {
            const statuses = TOKEN_ORDER.filter((status) => (marks[spot.id] ?? []).includes(status))
            const summary =
              statuses.length === 0
                ? m.chart.noRecords
                : statuses.map((status) => m.recordStatus[status]).join(', ')
            return (
              <button
                key={spot.id}
                type="button"
                className="tooth"
                data-testid={`tooth-${spot.id}`}
                ref={(element) => {
                  buttons.current[spot.id] = element
                }}
                aria-pressed={selectedId === spot.id}
                aria-label={fill(m.chart.toothName, { tooth: spot.id, summary })}
                style={{
                  left: `${(spot.x / CHART_W) * 100}%`,
                  top: `${(spot.y / CHART_H) * 100}%`,
                }}
                onClick={() => onSelect(spot.id)}
                onKeyDown={(event) => {
                  if (event.key.startsWith('Arrow')) {
                    event.preventDefault()
                    move(spot.id, event.key)
                  }
                }}
              >
                <span
                  className="tooth-body"
                  style={{ transform: `rotate(${spot.rotation}deg)` }}
                  aria-hidden="true"
                />
                <span className="tooth-id">{spot.id}</span>
                <span className="tooth-tokens">
                  {statuses.map((status) => (
                    <span key={status} className="token" data-status={status}>
                      {TOKEN_LETTER[status]}
                    </span>
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      <p className="hint">{m.chart.keys}</p>
      <div className="legend">
        <h3>{m.chart.legend}</h3>
        <ul>
          {TOKEN_ORDER.map((status) => (
            <li key={status}>
              <span className="token" data-status={status}>
                {TOKEN_LETTER[status]}
              </span>
              {m.recordStatus[status]}
            </li>
          ))}
          <li>
            <span className="token">{m.common.none}</span>
            {m.chart.noRecords}
          </li>
        </ul>
      </div>
    </div>
  )
}
