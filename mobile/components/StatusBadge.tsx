import { Text, View } from 'react-native'
import type { EventStatus, RsvpStatus } from '../lib/types'

const LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  ACTIVE: 'Activo',
  CLOSED: 'Cerrado',
  CANCELLED: 'Cancelado',
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  DECLINED: 'Declinó',
  WAITLIST: 'Espera',
  FREE: 'Free',
  BASIC: 'Basic',
  PRO: 'Pro',
}

const TONES: Record<string, { box: string; text: string }> = {
  DRAFT: { box: 'bg-stone-200', text: 'text-stone-800' },
  ACTIVE: { box: 'bg-emerald-100', text: 'text-emerald-900' },
  CLOSED: { box: 'bg-stone-300', text: 'text-stone-800' },
  CANCELLED: { box: 'bg-red-100', text: 'text-red-800' },
  PENDING: { box: 'bg-amber-100', text: 'text-amber-900' },
  CONFIRMED: { box: 'bg-emerald-100', text: 'text-emerald-900' },
  DECLINED: { box: 'bg-red-100', text: 'text-red-800' },
  WAITLIST: { box: 'bg-yellow-100', text: 'text-yellow-900' },
  FREE: { box: 'bg-stone-200', text: 'text-stone-800' },
  BASIC: { box: 'bg-sky-100', text: 'text-sky-900' },
  PRO: { box: 'bg-violet-100', text: 'text-violet-900' },
  OWNER: { box: 'bg-stone-200', text: 'text-stone-800' },
  PLANNER: { box: 'bg-sky-100', text: 'text-sky-900' },
  STAFF: { box: 'bg-amber-100', text: 'text-amber-900' },
}

interface StatusBadgeProps {
  value: EventStatus | RsvpStatus | string
}

export function StatusBadge({ value }: StatusBadgeProps) {
  const tone = TONES[value] ?? { box: 'bg-stone-200', text: 'text-stone-800' }
  return (
    <View className={`rounded-full px-3 py-1 ${tone.box}`}>
      <Text className={`text-sm font-bold ${tone.text}`}>{LABELS[value] ?? value}</Text>
    </View>
  )
}
