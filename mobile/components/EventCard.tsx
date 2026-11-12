import { Pressable, Text, View } from 'react-native'
import { formatWhen } from '../lib/format'
import type { PlannerEvent } from '../lib/types'
import { StatusBadge } from './StatusBadge'

interface EventCardProps {
  event: PlannerEvent
  onPress: () => void
}

export function EventCard({ event, onPress }: EventCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-3xl border border-line bg-card px-4 py-4 active:opacity-80"
    >
      <View className="flex-row items-start justify-between gap-3">
        <Text className="flex-1 text-xl font-bold text-ink">{event.name}</Text>
        <StatusBadge value={event.status} />
      </View>
      <Text className="mt-2 text-base text-stone-600">{formatWhen(event.startsAt)}</Text>
      <Text className="mt-1 text-base text-stone-500">
        {event.location || 'Sin lugar'} · {event.plan}
      </Text>
    </Pressable>
  )
}
