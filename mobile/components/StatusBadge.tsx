import { Text, View } from 'react-native'
import type { EventStatus, RsvpStatus } from '../lib/types'

const LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  ACTIVE: 'Activo',
  CLOSED: 'Cerrado',
  CANCELLED: 'Cancelado',
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  DECLINED: 'Rechazado',
  WAITLIST: 'Espera',
  FREE: 'FREE',
  BASIC: 'BASIC',
  PRO: 'PRO',
  social: 'Social',
  corporate: 'Corporativo',
  educational: 'Educativo',
  entertainment: 'Entretenimiento',
}

const TONES: Record<string, { box: string; text: string }> = {
  DRAFT: { box: 'bg-stone-100', text: 'text-stone-700' },
  ACTIVE: { box: 'bg-emerald-100', text: 'text-emerald-800' },
  CLOSED: { box: 'bg-stone-200', text: 'text-stone-700' },
  CANCELLED: { box: 'bg-red-100', text: 'text-red-700' },
  PENDING: { box: 'bg-amber-100', text: 'text-amber-800' },
  CONFIRMED: { box: 'bg-emerald-100', text: 'text-emerald-800' },
  DECLINED: { box: 'bg-red-100', text: 'text-red-700' },
  WAITLIST: { box: 'bg-yellow-100', text: 'text-yellow-800' },
  FREE: { box: 'bg-inkwell', text: 'text-white' },
  BASIC: { box: 'bg-indigo', text: 'text-white' },
  PRO: { box: 'bg-indigo-deep', text: 'text-white' },
  social: { box: 'bg-mist', text: 'text-indigo' },
  corporate: { box: 'bg-mist', text: 'text-indigo' },
  educational: { box: 'bg-mist', text: 'text-indigo' },
  entertainment: { box: 'bg-mist', text: 'text-indigo' },
  OWNER: { box: 'bg-inkwell', text: 'text-white' },
  PLANNER: { box: 'bg-indigo', text: 'text-white' },
  STAFF: { box: 'bg-amber-100', text: 'text-amber-800' },
}

interface StatusBadgeProps {
  value: EventStatus | RsvpStatus | string
  large?: boolean
}

export function StatusBadge({ value, large }: StatusBadgeProps) {
  const tone = TONES[value] ?? { box: 'bg-stone-100', text: 'text-stone-700' }
  return (
    <View className={`rounded-full ${large ? 'px-4 py-1.5' : 'px-3 py-1'} ${tone.box}`}>
      <Text
        className={`${large ? 'text-sm' : 'text-xs'} ${tone.text}`}
        style={{ fontFamily: 'Inter_600SemiBold', letterSpacing: large ? 0.4 : 0.2 }}
      >
        {LABELS[value] ?? value}
      </Text>
    </View>
  )
}
