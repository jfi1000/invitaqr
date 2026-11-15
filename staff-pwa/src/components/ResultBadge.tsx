import type { ResultTone, ScanResult } from '../types'

const DENIED = new Set<ScanResult>([
  'ALREADY_USED',
  'INVALID_TOKEN',
  'EXPIRED',
  'WRONG_EVENT',
])

const WARNING = new Set<ScanResult>([
  'EVENT_INACTIVE',
  'OUT_OF_SCHEDULE',
  'NOT_CONFIRMED',
])

const DETAIL: Record<ScanResult, string> = {
  OK: '',
  ALREADY_USED: 'Este pase ya se usó',
  INVALID_TOKEN: 'El código no es válido',
  EXPIRED: 'El código está vencido',
  WRONG_EVENT: 'El pase es de otro evento',
  EVENT_INACTIVE: 'El evento no está activo',
  OUT_OF_SCHEDULE: 'Fuera del horario (el escaneo abre 1 h antes del inicio)',
  NOT_CONFIRMED: 'La asistencia no está confirmada',
}

function toneFor(result: ScanResult): ResultTone {
  if (result === 'OK') return 'ok'
  if (DENIED.has(result)) return 'denied'
  if (WARNING.has(result)) return 'warning'
  return 'denied'
}

function headline(result: ScanResult, guestName?: string): string {
  if (result === 'OK') {
    return `✓ Acceso permitido - ${guestName?.trim() || 'Invitado'}`
  }
  if (WARNING.has(result)) return '⚠ No permitido'
  return '✗ Acceso denegado'
}

function okDetails(input: {
  tableNumber?: number | null
  guestCount?: number
  companions?: number
}): string[] {
  const lines: string[] = []
  if (input.tableNumber != null && input.tableNumber > 0) {
    lines.push(`Mesa ${input.tableNumber}`)
  }

  const total =
    input.guestCount ??
    (input.companions !== undefined ? 1 + input.companions : undefined)
  if (total !== undefined && total > 0) {
    lines.push(`${total} invitado${total === 1 ? '' : 's'}`)
  } else if (input.companions && input.companions > 0) {
    lines.push(
      `${input.companions} acompañante${input.companions === 1 ? '' : 's'}`,
    )
  }
  return lines
}

interface ResultBadgeProps {
  result: ScanResult
  guestName?: string
  companions?: number
  guestCount?: number
  tableNumber?: number | null
}

export function ResultBadge({
  result,
  guestName,
  companions,
  guestCount,
  tableNumber,
}: ResultBadgeProps) {
  const tone = toneFor(result)
  const detail = DETAIL[result]
  const extras = result === 'OK' ? okDetails({ tableNumber, guestCount, companions }) : []

  return (
    <section className={`badge badge-${tone}`} role="status" aria-live="assertive">
      <p className="badge-title">{headline(result, guestName)}</p>
      {detail ? <p className="badge-detail">{detail}</p> : null}
      {extras.map((line) => (
        <p key={line} className="badge-detail">
          {line}
        </p>
      ))}
    </section>
  )
}
