export function formatWhen(value: string | null | undefined): string {
  if (!value) return 'Sin fecha'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** Inicio; si el fin es distinto, lo incluye (mismo día solo hora, o rango completo). */
export function formatEventRange(
  startsAt: string | null | undefined,
  endsAt?: string | null,
): string {
  if (!startsAt) return 'Sin fecha'
  const start = new Date(startsAt)
  if (Number.isNaN(start.getTime())) return startsAt

  const startLabel = formatWhen(startsAt)
  if (!endsAt) return startLabel

  const end = new Date(endsAt)
  if (Number.isNaN(end.getTime())) return startLabel
  if (end.getTime() === start.getTime()) return startLabel

  if (sameLocalDay(start, end)) {
    const endTime = new Intl.DateTimeFormat('es-MX', { timeStyle: 'short' }).format(end)
    return `${startLabel} → ${endTime}`
  }

  return `${startLabel} → ${formatWhen(endsAt)}`
}

const EVENT_DATE =
  /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/

export function toIso(value: string): string | null {
  const match = value.trim().match(EVENT_DATE)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hours = match[4] === undefined ? 18 : Number(match[4])
  const minutes = match[5] === undefined ? 0 : Number(match[5])
  if (hours > 23 || minutes > 59) return null
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return date.toISOString()
}

export function fromIsoLocal(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
