import { useMemo, useState } from 'react'
import { addDays, localIsoDate, parseLocalDate } from '../format'
import { useMessages } from '../i18n'
import { currentAppointment } from '../record'
import { useClinic } from '../store'
import { fill } from '../text'

export type ChartRange = 'day' | 'month' | 'year'

type Point = { key: string; label: string; count: number }

const WIDTH = 640
const HEIGHT = 180
const PAD = { top: 18, right: 14, bottom: 28, left: 32 }

function niceMax(value: number) {
  if (value <= 5) return 5
  if (value <= 10) return 10
  if (value <= 20) return 20
  if (value <= 50) return 50
  return Math.ceil(value / 10) * 10
}

function buildPoints(dates: string[], range: ChartRange, today: string, intlLocale: string): Point[] {
  const counts = new Map<string, number>()
  for (const date of dates) {
    const key = range === 'day' ? date : range === 'month' ? date.slice(0, 7) : date.slice(0, 4)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  if (range === 'day') {
    return Array.from({ length: 14 }, (_, index) => {
      const date = addDays(today, index - 13)
      const short = new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'short' }).format(
        parseLocalDate(date),
      )
      return { key: date, label: short, count: counts.get(date) ?? 0 }
    })
  }

  if (range === 'month') {
    const year = Number(today.slice(0, 4))
    return Array.from({ length: 12 }, (_, month) => {
      const key = `${year}-${String(month + 1).padStart(2, '0')}`
      const sample = `${key}-01`
      return {
        key,
        label: new Intl.DateTimeFormat(intlLocale, { month: 'short' }).format(parseLocalDate(sample)),
        count: counts.get(key) ?? 0,
      }
    })
  }

  const year = Number(today.slice(0, 4))
  return Array.from({ length: 5 }, (_, index) => {
    const y = String(year - 4 + index)
    return { key: y, label: y, count: counts.get(y) ?? 0 }
  })
}

function linePath(points: { x: number; y: number }[]) {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  let path = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i += 1) {
    const current = points[i]
    const next = points[i + 1]
    const cx = (current.x + next.x) / 2
    path += ` C ${cx} ${current.y}, ${cx} ${next.y}, ${next.x} ${next.y}`
  }
  return path
}

/** Single chart with its own Daily / Monthly / Annually control — independent of figure pickers. */
export function AppointmentsStatusChart() {
  const { state } = useClinic()
  const m = useMessages()
  const today = localIsoDate()
  const [range, setRange] = useState<ChartRange>('month')
  const [hover, setHover] = useState<number | null>(null)

  const dates = useMemo(
    () => state.appointments.map((appointment) => currentAppointment(appointment).date),
    [state.appointments],
  )

  const series = useMemo(
    () => buildPoints(dates, range, today, state.settings.intlLocale),
    [dates, range, today, state.settings.intlLocale],
  )

  const maxCount = niceMax(Math.max(...series.map((point) => point.count), 0))
  const innerW = WIDTH - PAD.left - PAD.right
  const innerH = HEIGHT - PAD.top - PAD.bottom
  const plotted = series.map((point, index) => {
    const x =
      series.length === 1 ? PAD.left + innerW / 2 : PAD.left + (index / (series.length - 1)) * innerW
    const y = PAD.top + innerH - (point.count / maxCount) * innerH
    return { ...point, x, y }
  })
  const path = linePath(plotted)
  const area =
    plotted.length === 0
      ? ''
      : `${path} L ${plotted[plotted.length - 1].x} ${PAD.top + innerH} L ${plotted[0].x} ${PAD.top + innerH} Z`
  const ticks = [0, 0.5, 1].map((part) => Math.round(maxCount * part))
  const active = hover !== null ? plotted[hover] : null
  const rangeLabel =
    range === 'day' ? m.today.chartDay : range === 'month' ? m.today.chartMonth : m.today.chartYear

  return (
    <section className="overview-chart card stack" aria-labelledby="appointments-status-heading">
      <div className="overview-chart-head">
        <h2 id="appointments-status-heading">{m.today.chartHeading}</h2>
        <div className="overview-chart-tabs" role="tablist" aria-label={m.today.chartRange}>
          {([
            ['day', m.today.chartDay],
            ['month', m.today.chartMonth],
            ['year', m.today.chartYear],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={range === value}
              className={`overview-chart-tab${range === value ? ' is-active' : ''}`}
              onClick={() => {
                setRange(value)
                setHover(null)
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="meta overview-chart-caption">{fill(m.today.chartCaption, { range: rangeLabel })}</p>
      <div className="overview-chart-frame">
        <svg
          className="overview-chart-svg"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label={m.today.chartHeading}
        >
          <defs>
            <linearGradient id="appt-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a5fad" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#1a5fad" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {ticks.map((tick) => {
            const y = PAD.top + innerH - (tick / maxCount) * innerH
            return (
              <g key={tick}>
                <line
                  x1={PAD.left}
                  x2={WIDTH - PAD.right}
                  y1={y}
                  y2={y}
                  className="overview-chart-grid"
                />
                <text x={PAD.left - 8} y={y + 4} className="overview-chart-axis" textAnchor="end">
                  {tick}
                </text>
              </g>
            )
          })}
          {area ? <path d={area} fill="url(#appt-area)" /> : null}
          {path ? <path d={path} className="overview-chart-line" fill="none" /> : null}
          {plotted.map((point, index) => (
            <g key={point.key}>
              <circle
                cx={point.x}
                cy={point.y}
                r={hover === index ? 5.5 : 3.5}
                className={`overview-chart-dot${hover === index ? ' is-active' : ''}`}
                onMouseEnter={() => setHover(index)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(index)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                role="img"
                aria-label={fill(m.today.chartPoint, { label: point.label, count: point.count })}
              />
              <text x={point.x} y={HEIGHT - 8} className="overview-chart-axis" textAnchor="middle">
                {range === 'day' && index % 2 === 1 ? '' : point.label}
              </text>
            </g>
          ))}
          {active ? (
            <g className="overview-chart-tooltip" pointerEvents="none">
              <rect
                x={Math.min(Math.max(active.x - 58, 8), WIDTH - 124)}
                y={Math.max(active.y - 34, 6)}
                width="116"
                height="26"
                rx="13"
              />
              <text
                x={Math.min(Math.max(active.x, 66), WIDTH - 66)}
                y={Math.max(active.y - 16, 24)}
                textAnchor="middle"
              >
                {fill(m.today.chartTooltip, { count: active.count })}
              </text>
            </g>
          ) : null}
        </svg>
      </div>
    </section>
  )
}
