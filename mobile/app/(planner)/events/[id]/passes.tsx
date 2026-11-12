import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { FlatList, Pressable, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { GuestItem } from '../../../../components/GuestItem'
import { StatusBadge } from '../../../../components/StatusBadge'
import { apiErrorMessage, getGuests } from '../../../../lib/api'
import { queryKeys } from '../../../../lib/query'

function routeId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

export default function PassesScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ id: string }>()
  const eventId = routeId(params.id)
  const guests = useQuery({
    queryKey: queryKeys.guests(eventId),
    queryFn: () => getGuests(eventId),
    enabled: Boolean(eventId),
  })
  const passes = (guests.data ?? []).filter((guest) => guest.pass)

  return (
    <SafeAreaView className="flex-1 bg-paper px-5">
      <Pressable onPress={() => router.back()} className="py-2">
        <Text className="text-base font-bold text-stone-600">Volver</Text>
      </Pressable>
      <Text className="text-3xl font-bold text-ink">Pases</Text>
      {guests.isError ? (
        <Text className="mt-3 text-base text-red-700">{apiErrorMessage(guests.error)}</Text>
      ) : null}
      <FlatList
        className="mt-4"
        data={passes}
        keyExtractor={(item) => item.pass?.id ?? item.id}
        ListEmptyComponent={
          guests.isLoading ? (
            <Text className="text-lg text-stone-600">Cargando…</Text>
          ) : (
            <Text className="mt-6 text-lg text-stone-600">Todavía no hay pases.</Text>
          )
        }
        renderItem={({ item }) => (
          <GuestItem
            name={item.name}
            detail={
              item.pass && item.pass.companionsConfirmed > 0
                ? `${item.pass.companionsConfirmed} acompañantes`
                : 'Sin acompañantes'
            }
            badge={item.pass ? <StatusBadge value={item.pass.rsvpStatus} /> : undefined}
          />
        )}
      />
    </SafeAreaView>
  )
}
