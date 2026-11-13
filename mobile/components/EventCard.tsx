import { Image, Pressable, Text, View } from 'react-native'
import { eventLogo } from '../lib/brand'
import { formatEventRange } from '../lib/format'
import { type as typography } from '../lib/typography'
import type { PlannerEvent } from '../lib/types'
import { StatusBadge } from './StatusBadge'

interface EventCardProps {
  event: PlannerEvent
  onPress: () => void
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <View className="flex-1">
      <Text style={[typography.caption, { marginBottom: 4 }]}>{label}</Text>
      <Text style={[typography.section, { fontSize: 18 }]}>{value}</Text>
      {hint ? <Text style={[typography.caption, { marginTop: 2 }]}>{hint}</Text> : null}
    </View>
  )
}

export function EventCard({ event, onPress }: EventCardProps) {
  const invited = event.guestCount ?? 0
  const confirmed = event.confirmedCount ?? 0
  const capacity = event.capacity || 0
  const invitedPct =
    capacity > 0 ? Math.min(100, Math.round((invited / capacity) * 100)) : 0
  const confirmedPct =
    invited > 0 ? Math.round((confirmed / invited) * 100) : 0

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-3xl border border-line bg-card px-4 py-4 active:opacity-90"
    >
      <View className="flex-row items-start gap-3">
        <Image
          source={{ uri: eventLogo(event.logo) }}
          style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: '#4334d6' }}
        />
        <View className="flex-1">
          <View className="flex-row items-start justify-between gap-2">
            <Text style={[typography.section, { flex: 1 }]} numberOfLines={2}>
              {event.name}
            </Text>
            <StatusBadge value={event.status} />
          </View>
          <Text style={[typography.caption, { marginTop: 8 }]} numberOfLines={2}>
            📅 {formatEventRange(event.startsAt, event.endsAt)}
          </Text>
          <View className="mt-2 flex-row flex-wrap items-center gap-2">
            <StatusBadge value={event.plan} />
            <Text style={typography.caption}>{event.location || 'Sin lugar'}</Text>
          </View>
        </View>
      </View>

      <View className="mt-4 border-t border-line pt-3">
        <View className="flex-row gap-3">
          <Stat label="Número de invitados" value={String(invited)} />
          <Stat
            label="Confirmados"
            value={String(confirmed)}
            hint={invited > 0 ? `${confirmedPct}% de invitados` : 'Sin RSVP aún'}
          />
        </View>
        {capacity > 0 ? (
          <View className="mt-3">
            <View className="mb-1.5 flex-row items-center justify-between">
              <Text style={typography.caption}>
                Cupo del plan · {capacity}
              </Text>
              <Text style={typography.caption}>{invitedPct}%</Text>
            </View>
            <View className="h-2 overflow-hidden rounded-full bg-mist">
              <View
                className="h-2 rounded-full bg-indigo"
                style={{ width: `${invitedPct}%` }}
              />
            </View>
          </View>
        ) : null}
      </View>
    </Pressable>
  )
}
