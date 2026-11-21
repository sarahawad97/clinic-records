export const CHART_W = 840
export const CHART_H = 560

export const UPPER_TEETH = [
  '18', '17', '16', '15', '14', '13', '12', '11',
  '21', '22', '23', '24', '25', '26', '27', '28',
]

export const LOWER_TEETH = [
  '48', '47', '46', '45', '44', '43', '42', '41',
  '31', '32', '33', '34', '35', '36', '37', '38',
]

export const ALL_TEETH = [...UPPER_TEETH, ...LOWER_TEETH]

export interface ToothSpot {
  id: string
  arch: 'upper' | 'lower'
  x: number
  y: number
  rotation: number
}

function place(ids: string[], arch: 'upper' | 'lower'): ToothSpot[] {
  return ids.map((id, index) => {
    const t = index / (ids.length - 1)
    const curve = Math.sin(t * Math.PI)
    const x = 110 + t * 620
    const y = arch === 'upper' ? 78 + curve * 150 : 500 - curve * 140
    const rotation = (t - 0.5) * (arch === 'upper' ? -28 : 28)
    return { id, arch, x, y, rotation }
  })
}

export function toothSpots() {
  return [...place(UPPER_TEETH, 'upper'), ...place(LOWER_TEETH, 'lower')]
}

export function archPath(arch: 'upper' | 'lower') {
  const spots = toothSpots().filter((spot) => spot.arch === arch)
  return spots.map((spot, index) => `${index === 0 ? 'M' : 'L'} ${spot.x.toFixed(1)} ${spot.y.toFixed(1)}`).join(' ')
}

export function isToothId(value: string) {
  return ALL_TEETH.includes(value)
}
