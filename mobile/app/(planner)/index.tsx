import { useRouter } from 'expo-router'
import { useRef, useState } from 'react'
import { FlatList, Modal, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  buildEventPayload,
  emptyEventEditorValues,
  EventEditorFields,
  EventEditorValues,
} from '../../components/EventEditorFields'
import { EmptyEventsState } from '../../components/EmptyEventsState'
import { EventCard } from '../../components/EventCard'
import { EventsFooterArt } from '../../components/EventsFooterArt'
import { SuccessBurst } from '../../components/SuccessBurst'
import { AppButton } from '../../components/ui/AppButton'
import { Screen } from '../../components/ui/Screen'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { EventListSkeleton } from '../../components/ui/screen-skeletons'
import { useCreateEvent, useEvents } from '../../hooks/useEvents'
import { apiErrorMessage, createCheckout } from '../../lib/api'
import { openStripeCheckout } from '../../lib/checkout'
import { toIso } from '../../lib/format'
import { openEvent } from '../../lib/navigation'
import type { EventPlan } from '../../lib/types'

export default function DashboardScreen() {
  const router = useRouter()
  const createdIdRef = useRef<string | null>(null)
  const events = useEvents()
  const createEvent = useCreateEvent()
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<EventEditorValues>(emptyEventEditorValues())
  const [error, setError] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [createdName, setCreatedName] = useState('')
  const [paying, setPaying] = useState<'BASIC' | 'PRO' | null>(null)

  function resetForm() {
    setValues(emptyEventEditorValues())
    setError(null)
  }

  async function handleCreate(planOverride?: EventPlan) {
    const plan = planOverride ?? values.plan
    if (!values.name.trim()) {
      setError('Escribe el nombre del evento')
      return
    }
    const startsAt = toIso(values.starts)
    if (!startsAt) {
      setError('Elige la fecha y hora de inicio')
      return
    }
    if (new Date(startsAt).getTime() < Date.now()) {
      setError('La fecha de inicio no puede estar en el pasado')
      return
    }
    const endsAt = values.ends.trim() ? toIso(values.ends) : startsAt
    if (!endsAt) {
      setError('La fecha de fin no es válida. Déjala vacía si es un solo día.')
      return
    }
    if (new Date(endsAt).getTime() < new Date(startsAt).getTime()) {
      setError('La fecha de fin no puede ser anterior a la de inicio')
      return
    }
    if (values.type === 'social' && values.hasTables) {
      const tables = Number(values.tableCount)
      if (!Number.isFinite(tables) || tables < 1) {
        setError('Indica cuántas mesas tendrá el evento')
        return
      }
    }
    if (values.type === 'entertainment' && values.hasZones && !values.zones.trim()) {
      setError('Escribe las zonas separadas por coma')
      return
    }
    setError(null)
    setPaying(plan === 'BASIC' || plan === 'PRO' ? plan : null)
    try {
      const payload = buildEventPayload({ ...values, plan })
      const event = await createEvent.mutateAsync({
        ...payload,
        starts_at: startsAt,
        ends_at: values.ends.trim() ? endsAt : undefined,
      })
      if (plan === 'BASIC' || plan === 'PRO') {
        const session = await createCheckout(event.id, plan)
        await openStripeCheckout(session.url)
        return
      }
      setOpen(false)
      resetForm()
      setCreatedName(event.name)
      createdIdRef.current = event.id
      setCreatedId(event.id)
    } catch (caught) {
      setError(apiErrorMessage(caught))
    } finally {
      setPaying(null)
    }
  }

  return (
    <Screen>
      <ScreenHeader
        title="Eventos"
        eyebrow="InvitaQR"
        subtitle="Tus eventos activos y borradores"
        showBack={false}
        right={
          <AppButton label="Nuevo" onPress={() => setOpen(true)} className="px-5 py-3" />
        }
      />

      {events.isError ? (
        <Text className="text-base text-red-700">{apiErrorMessage(events.error)}</Text>
      ) : null}

      {events.isLoading ? <EventListSkeleton /> : null}

      {events.isLoading ? null : (
      <FlatList
        style={{ flex: 1 }}
        data={events.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          events.isLoading ? undefined : <EmptyEventsState onCreate={() => setOpen(true)} />
        }
        ListFooterComponent={
          events.data && events.data.length > 0 ? (
            <EventsFooterArt onCreate={() => setOpen(true)} />
          ) : undefined
        }
        renderItem={({ item }) => (
          <EventCard
            event={item}
            onPress={() => openEvent(router, item.id)}
          />
        )}
      />
      )}

      <Modal animationType="slide" visible={open} onRequestClose={() => setOpen(false)}>
        <SafeAreaView className="flex-1 bg-paper">
          <View style={{ flex: 1, paddingHorizontal: 28, paddingTop: 12 }}>
            <ScreenHeader
              title="Nuevo evento"
              eyebrow="Crear"
              subtitle="BASIC y PRO se pueden activar después del pago."
              onBack={() => setOpen(false)}
            />
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <EventEditorFields
                values={{ ...values, plan: paying ?? values.plan }}
                paying={paying}
                onPay={(plan) => {
                  setValues((current) => ({ ...current, plan }))
                  void handleCreate(plan)
                }}
                onChange={(patch) => setValues((current) => ({ ...current, ...patch }))}
              />
              {error ? <Text className="mt-3 text-base text-red-700">{error}</Text> : null}
            </ScrollView>
            <View
              style={{
                paddingTop: 12,
                paddingBottom: 8,
                borderTopWidth: 1,
                borderTopColor: '#e6e2f2',
                backgroundColor: '#f7f6fb',
              }}
            >
              <AppButton
                label={
                  createEvent.isPending
                    ? paying
                      ? 'Abriendo pago…'
                      : 'Creando…'
                    : values.plan === 'FREE'
                      ? 'Crear evento'
                      : `Crear y pagar ${values.plan}`
                }
                loading={createEvent.isPending}
                onPress={() => void handleCreate()}
              />
              <AppButton
                className="mt-2"
                label="Cancelar"
                variant="ghost"
                onPress={() => setOpen(false)}
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      <SuccessBurst
        visible={Boolean(createdId)}
        title="Evento creado"
        subtitle={
          createdName
            ? `${createdName} ya está listo. Continúa para agregar invitados y pases.`
            : 'Tu evento ya está listo. Continúa para agregar invitados y pases.'
        }
        buttonLabel="Ver evento"
        onContinue={() => {
          const id = createdIdRef.current ?? createdId
          if (id) {
            openEvent(router, id)
          }
        }}
        onExited={() => {
          createdIdRef.current = null
          setCreatedId(null)
          setCreatedName('')
        }}
      />
    </Screen>
  )
}
