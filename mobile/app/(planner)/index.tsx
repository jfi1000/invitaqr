import { useRouter } from 'expo-router'
import { useState } from 'react'
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { EventCard } from '../../components/EventCard'
import { useCreateEvent, useEvents } from '../../hooks/useEvents'
import { apiErrorMessage } from '../../lib/api'
import { toIso } from '../../lib/format'
import type { EventPlan } from '../../lib/types'

const PLANS: EventPlan[] = ['FREE', 'BASIC', 'PRO']

export default function DashboardScreen() {
  const router = useRouter()
  const events = useEvents()
  const createEvent = useCreateEvent()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [starts, setStarts] = useState('')
  const [ends, setEnds] = useState('')
  const [plan, setPlan] = useState<EventPlan>('FREE')
  const [error, setError] = useState<string | null>(null)

  function resetForm() {
    setName('')
    setLocation('')
    setStarts('')
    setEnds('')
    setPlan('FREE')
    setError(null)
  }

  async function handleCreate() {
    const startsAt = toIso(starts)
    const endsAt = toIso(ends)
    if (!name.trim() || !startsAt || !endsAt) {
      setError('Escribe nombre y fechas como 2026-12-01 18:00')
      return
    }
    if (new Date(endsAt) <= new Date(startsAt)) {
      setError('La fecha de fin debe ser posterior a la de inicio')
      return
    }
    setError(null)
    try {
      const event = await createEvent.mutateAsync({
        name: name.trim(),
        location: location.trim() || undefined,
        starts_at: startsAt,
        ends_at: endsAt,
        plan,
        capacity: plan === 'FREE' ? 50 : 100,
      })
      setOpen(false)
      resetForm()
      router.push(`/(planner)/events/${event.id}`)
    } catch (caught) {
      setError(apiErrorMessage(caught))
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-paper px-5">
      <View className="mb-4 mt-2 flex-row items-center justify-between">
        <Text className="text-4xl font-bold text-ink" style={{ fontFamily: 'Inter_700Bold' }}>
          Eventos
        </Text>
        <Pressable
          className="rounded-2xl bg-ink px-4 py-3"
          onPress={() => setOpen(true)}
        >
          <Text className="text-base font-bold text-white">Nuevo</Text>
        </Pressable>
      </View>

      {events.isLoading ? <Text className="text-lg text-stone-600">Cargando…</Text> : null}
      {events.isError ? (
        <Text className="text-base text-red-700">{apiErrorMessage(events.error)}</Text>
      ) : null}

      <FlatList
        data={events.data ?? []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          events.isLoading ? null : (
            <Text className="mt-8 text-lg text-stone-600">Todavía no hay eventos.</Text>
          )
        }
        renderItem={({ item }) => (
          <EventCard
            event={item}
            onPress={() => router.push(`/(planner)/events/${item.id}`)}
          />
        )}
      />

      <Modal animationType="slide" visible={open} onRequestClose={() => setOpen(false)}>
        <SafeAreaView className="flex-1 bg-paper px-5">
          <Text className="mt-4 text-3xl font-bold text-ink">Nuevo evento</Text>
          <Text className="mt-2 text-base text-stone-600">
            BASIC y PRO se pueden activar después del pago.
          </Text>
          <TextInput
            className="mt-6 rounded-2xl border border-line bg-white px-4 py-4 text-lg"
            placeholder="Nombre"
            placeholderTextColor="#8a8175"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            className="mt-3 rounded-2xl border border-line bg-white px-4 py-4 text-lg"
            placeholder="Lugar"
            placeholderTextColor="#8a8175"
            value={location}
            onChangeText={setLocation}
          />
          <TextInput
            className="mt-3 rounded-2xl border border-line bg-white px-4 py-4 text-lg"
            placeholder="Inicio: 2026-12-01 18:00"
            placeholderTextColor="#8a8175"
            value={starts}
            onChangeText={setStarts}
          />
          <TextInput
            className="mt-3 rounded-2xl border border-line bg-white px-4 py-4 text-lg"
            placeholder="Fin: 2026-12-01 23:00"
            placeholderTextColor="#8a8175"
            value={ends}
            onChangeText={setEnds}
          />
          <View className="mt-4 flex-row gap-2">
            {PLANS.map((item) => (
              <Pressable
                key={item}
                className={`rounded-full px-4 py-2 ${plan === item ? 'bg-ink' : 'bg-white border border-line'}`}
                onPress={() => setPlan(item)}
              >
                <Text className={plan === item ? 'font-bold text-white' : 'font-bold text-ink'}>
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>
          {error ? <Text className="mt-3 text-base text-red-700">{error}</Text> : null}
          <Pressable
            className="mt-6 items-center rounded-2xl bg-ink py-4"
            disabled={createEvent.isPending}
            onPress={() => void handleCreate()}
          >
            <Text className="text-lg font-bold text-white">
              {createEvent.isPending ? 'Creando…' : 'Crear evento'}
            </Text>
          </Pressable>
          <Pressable className="mt-3 items-center py-3" onPress={() => setOpen(false)}>
            <Text className="text-base font-bold text-stone-600">Cancelar</Text>
          </Pressable>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}
