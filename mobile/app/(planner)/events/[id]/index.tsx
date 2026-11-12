import { useLocalSearchParams, useRouter } from 'expo-router'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBadge } from '../../../../components/StatusBadge'
import { useChangeEventStatus, useEvent } from '../../../../hooks/useEvents'
import { apiErrorMessage } from '../../../../lib/api'
import { formatWhen } from '../../../../lib/format'

function routeId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

export default function EventDetailScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ id: string }>()
  const id = routeId(params.id)
  const eventQuery = useEvent(id)
  const changeStatus = useChangeEventStatus(id)
  const event = eventQuery.data

  return (
    <SafeAreaView className="flex-1 bg-paper px-5">
      <Pressable onPress={() => router.back()} className="py-2">
        <Text className="text-base font-bold text-stone-600">Volver</Text>
      </Pressable>
      {eventQuery.isLoading ? <Text className="text-lg">Cargando…</Text> : null}
      {eventQuery.isError ? (
        <Text className="text-base text-red-700">{apiErrorMessage(eventQuery.error)}</Text>
      ) : null}
      {event ? (
        <ScrollView>
          <View className="mt-2 flex-row items-start justify-between gap-3">
            <Text className="flex-1 text-4xl font-bold text-ink">{event.name}</Text>
            <StatusBadge value={event.status} />
          </View>
          <Text className="mt-4 text-lg text-stone-700">{formatWhen(event.startsAt)}</Text>
          <Text className="text-lg text-stone-700">a {formatWhen(event.endsAt)}</Text>
          <Text className="mt-3 text-lg text-stone-600">{event.location || 'Sin lugar'}</Text>
          <View className="mt-3 flex-row gap-2">
            <StatusBadge value={event.plan} />
            <Text className="self-center text-base text-stone-600">
              Cupo {event.capacity}
            </Text>
          </View>
          {event.description ? (
            <Text className="mt-4 text-lg text-ink">{event.description}</Text>
          ) : null}

          {event.status === 'DRAFT' ? (
            <Pressable
              className="mt-6 items-center rounded-2xl bg-ink py-4"
              disabled={changeStatus.isPending}
              onPress={() => changeStatus.mutate('ACTIVE')}
            >
              <Text className="text-lg font-bold text-white">
                {changeStatus.isPending ? 'Activando…' : 'Activar evento'}
              </Text>
            </Pressable>
          ) : null}
          {changeStatus.isError ? (
            <Text className="mt-3 text-base text-red-700">
              {apiErrorMessage(changeStatus.error)}
            </Text>
          ) : null}

          <Pressable
            className="mt-4 items-center rounded-2xl border border-ink py-4"
            onPress={() => router.push(`/(planner)/events/${id}/guests`)}
          >
            <Text className="text-lg font-bold text-ink">Invitados</Text>
          </Pressable>
          <Pressable
            className="mt-3 items-center rounded-2xl border border-ink py-4"
            onPress={() => router.push(`/(planner)/events/${id}/passes`)}
          >
            <Text className="text-lg font-bold text-ink">Pases</Text>
          </Pressable>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  )
}
