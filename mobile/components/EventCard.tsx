import { Image, Pressable, Text, View } from 'react-native'
import { eventLogo } from '../lib/brand'
import { formatEventRange } from '../lib/format'
import { type as typography } from '../lib/typography'
import type { PlannerEvent } from '../lib/types'
import { formatVenueLine } from '../lib/venue'
import { StatusBadge } from './StatusBadge'

interface EventCardProps {
  event: PlannerEvent
  onPress: () => void
}

function Metric({
  value,
  label,
  hint,
}: {
  value: string
  label: string
  hint?: string
}) {
  return (
    <View className="flex-1 items-center px-2 py-2">
      <Text
        style={{
          fontFamily: 'Oswald_600SemiBold',
          fontSize: 28,
          lineHeight: 32,
          letterSpacing: 0.5,
          color: '#111111',
        }}
      >
        {value}
      </Text>
      <Text style={[typography.caption, { marginTop: 2, textAlign: 'center' }]}>
        {label}
      </Text>
      {hint ? (
        <Text style={[typography.caption, { marginTop: 1, textAlign: 'center', fontSize: 11 }]}>
          {hint}
        </Text>
      ) : null}
    </View>
  )
}

export function EventCard({ event, onPress }: EventCardProps) {
  const invited = event.guestCount ?? 0
  const companions = event.companionCount ?? 0
  const people = invited + companions
  const confirmedPeople =
    (event.confirmedCount ?? 0) + (event.confirmedCompanionCount ?? 0)
  const capacity = event.capacity || 0
  const peoplePct =
    capacity > 0 ? Math.min(100, Math.round((people / capacity) * 100)) : 0

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
          <Text
            style={[typography.caption, { marginTop: 6, color: '#111111' }]}
            numberOfLines={2}
          >
            📅 {formatEventRange(event.startsAt, event.endsAt)}
          </Text>
          <Text style={[typography.caption, { marginTop: 4 }]} numberOfLines={2}>
            📍 {formatVenueLine(event.venueName, event.location)}
            {typeof event.latitude === 'number' && typeof event.longitude === 'number'
              ? ' · pin'
              : ''}
          </Text>
          <View className="mt-2.5 flex-row flex-wrap items-center gap-2">
            <StatusBadge value={event.plan} />
            {event.type ? <StatusBadge value={event.type} /> : null}
          </View>
        </View>
      </View>

      <View className="mt-3.5 overflow-hidden rounded-2xl bg-mist">
        <View className="flex-row items-stretch">
          <Metric value={String(invited)} label="Invitados" />
          <View style={{ width: 1, backgroundColor: '#e6e2f2', marginVertical: 10 }} />
          <Metric value={String(companions)} label="Acompañantes" />
        </View>
        {capacity > 0 ? (
          <View className="border-t border-line px-3 py-2.5">
            <View className="mb-1.5 flex-row items-center justify-between">
              <Text style={typography.caption}>
                Personas · {people} de {capacity}
              </Text>
              <Text style={[typography.caption, { color: '#4334d6' }]}>{peoplePct}%</Text>
            </View>
            <View className="h-1.5 overflow-hidden rounded-full bg-white">
              <View
                className="h-1.5 rounded-full bg-indigo"
                style={{ width: `${peoplePct}%` }}
              />
            </View>
            <Text style={[typography.caption, { marginTop: 6 }]}>
              Confirmados · {confirmedPeople} personas
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  )
}
