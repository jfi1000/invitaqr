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
  OUT_OF_SCHEDULE: 'Fuera del horario del evento',
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

interface ResultBadgeProps {
  result: ScanResult
  guestName?: string
  companions?: number
}

export function ResultBadge({ result, guestName, companions }: ResultBadgeProps) {
  const tone = toneFor(result)
  const detail = DETAIL[result]
  const extra =
    result === 'OK' && companions && companions > 0
      ? `${companions} acompañante${companions === 1 ? '' : 's'}`
      : ''

  return (
    <section className={`badge badge-${tone}`} role="status" aria-live="assertive">
      <p className="badge-title">{headline(result, guestName)}</p>
      {detail ? <p className="badge-detail">{detail}</p> : null}
      {extra ? <p className="badge-detail">{extra}</p> : null}
    </section>
  )
}
