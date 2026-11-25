import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useGlobalSearchParams, useLocalSearchParams, useRouter, useSegments } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Alert, Image, Linking, Modal, ScrollView, Switch, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  buildEventPayload,
  emptyEventEditorValues,
  EventEditorFields,
  EventEditorValues,
} from '../../../../components/EventEditorFields'
import { StatusBadge } from '../../../../components/StatusBadge'
import { AppButton } from '../../../../components/ui/AppButton'
import { Screen } from '../../../../components/ui/Screen'
import { ScreenHeader } from '../../../../components/ui/ScreenHeader'
import { useChangeEventStatus, useEvent } from '../../../../hooks/useEvents'
import { apiErrorMessage, updateEvent } from '../../../../lib/api'
import { eventLogo } from '../../../../lib/brand'
import { fromIsoLocal, formatWhen, toIso } from '../../../../lib/format'
import { backToEventList } from '../../../../lib/navigation'
import { queryKeys } from '../../../../lib/query'
import { SCAN_EARLY_MINUTES, scanOpensAt } from '../../../../lib/scan-window'
import { mapsUrl } from '../../../../lib/venue'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function routeId(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value
  return raw && UUID.test(raw) ? raw : ''
}

function InfoRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View className="mt-3 flex-row items-start gap-3">
      <Text className="text-lg">{icon}</Text>
      <Text className="flex-1 text-base text-inkwell" style={{ fontFamily: 'Inter_500Medium' }}>
        {text}
      </Text>
    </View>
  )
}

export default function EventDetailScreen() {
  const router = useRouter()
  const local = useLocalSearchParams<{ id?: string }>()
  const global = useGlobalSearchParams<{ id?: string }>()
  const segments = useSegments()
  const id =
    routeId(local.id) ||
    routeId(global.id) ||
    segments.map(String).reverse().find((segment) => UUID.test(segment)) ||
    ''
  const eventQuery = useEvent(id)
  const changeStatus = useChangeEventStatus(id)
  const event = eventQuery.data
  const client = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState<EventEditorValues>(emptyEventEditorValues())
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [notifyGuests, setNotifyGuests] = useState(true)
  const alertedLoadError = useRef<unknown>(null)

  useEffect(() => {
    if (!id) {
      const timer = setTimeout(() => {
        Alert.alert('Error', 'No encontramos este evento.')
      }, 400)
      return () => clearTimeout(timer)
    }
    if (!eventQuery.isError) {
      alertedLoadError.current = null
      return
    }
    if (alertedLoadError.current === eventQuery.error) return
    alertedLoadError.current = eventQuery.error
    Alert.alert('Error', apiErrorMessage(eventQuery.error))
  }, [id, eventQuery.isError, eventQuery.error])

  const save = useMutation({
    mutationFn: () => {
      if (!values.name.trim()) {
        throw new Error('Escribe el nombre del evento')
      }
      const startsAt = toIso(values.starts)
      if (!startsAt) {
        throw new Error('Elige la fecha y hora de inicio')
      }
      if (new Date(startsAt).getTime() < Date.now()) {
        throw new Error('La fecha de inicio no puede estar en el pasado')
      }
      const endsAt = values.ends.trim() ? toIso(values.ends) : startsAt
      if (!endsAt || new Date(endsAt).getTime() < new Date(startsAt).getTime()) {
        throw new Error('La fecha de fin no puede ser anterior a la de inicio')
      }
      if (values.type === 'social' && values.hasTables) {
        const tables = Number(values.tableCount)
        if (!Number.isFinite(tables) || tables < 1) {
          throw new Error('Indica cuántas mesas tendrá el evento')
        }
      }
      if (values.type === 'entertainment' && values.hasZones && !values.zones.trim()) {
        throw new Error('Escribe las zonas separadas por coma')
      }
      const payload = buildEventPayload(values)
      return updateEvent(id, {
        ...payload,
        starts_at: startsAt,
        ends_at: values.ends.trim() ? endsAt : startsAt,
      })
    },
    onSuccess: (updated) => {
      client.setQueryData(queryKeys.event(id), updated)
      void client.invalidateQueries({ queryKey: queryKeys.events })
      setEditing(false)
    },
    onError: (caught) => {
      const own =
        caught instanceof Error &&
        (caught.message.startsWith('Escribe') ||
          caught.message.startsWith('Elige') ||
          caught.message.startsWith('La fecha') ||
          caught.message.startsWith('Indica') ||
          caught.message.startsWith('Escribe las zonas'))
      Alert.alert('Error', own ? caught.message : apiErrorMessage(caught))
    },
  })

  function openEdit() {
    if (!event) return
    setValues({
      name: event.name,
      venueName: event.venueName ?? '',
      location: event.location ?? '',
      latitude: event.latitude ?? null,
      longitude: event.longitude ?? null,
      starts: fromIsoLocal(event.startsAt),
      ends: fromIsoLocal(event.endsAt),
      plan: event.plan,
      type: event.type ?? 'social',
      hasTables: Boolean(event.hasTables),
      tableCount: event.tableCount ? String(event.tableCount) : '',
      hasZones: Boolean(event.hasZones),
      zones: event.zones ?? '',
      logo: event.logo,
    })
    setEditing(true)
  }

  function reportStatusError(caught: unknown) {
    Alert.alert('Error', apiErrorMessage(caught))
  }

  return (
    <>
    <Screen scroll>
      <ScreenHeader
        title="Evento"
        eyebrow="InvitaQR"
        onBack={() => backToEventList(router)}
      />
      {id && eventQuery.isPending ? (
        <Text className="mt-4 text-base text-mute">Cargando…</Text>
      ) : null}
      {event ? (
        <View>
          <View className="items-center rounded-[28px] border border-line bg-card px-5 pb-6 pt-7">
            <Image
              source={{ uri: eventLogo(event.logo) }}
              style={{ width: 88, height: 88, borderRadius: 24, backgroundColor: '#4334d6' }}
            />
            <Text
              className="mt-4 text-center"
              style={{
                fontFamily: 'Inter_700Bold',
                fontSize: 28,
                lineHeight: 34,
                letterSpacing: -0.4,
                color: '#111111',
              }}
            >
              {event.name}
            </Text>
            <View className="mt-4 flex-row flex-wrap items-center justify-center gap-2">
              <StatusBadge value={event.plan} large />
              <StatusBadge value={event.status} />
              <StatusBadge value={event.type ?? 'social'} />
            </View>
          </View>

          <View className="mt-4 rounded-[28px] border border-line bg-card px-5 py-4">
            <InfoRow
              icon="📅"
              text={`${formatWhen(event.startsAt)} → ${formatWhen(event.endsAt)}`}
            />
            <InfoRow
              icon="🏛️"
              text={event.venueName || 'Sin nombre de lugar'}
            />
            <InfoRow
              icon="🗺️"
              text={event.location || 'Sin dirección definida'}
            />
            {typeof event.latitude === 'number' &&
            typeof event.longitude === 'number' ? (
              <InfoRow
                icon="📌"
                text={`Pin ${event.latitude.toFixed(5)}, ${event.longitude.toFixed(5)}`}
              />
            ) : null}
            {event.venueName ||
            event.location ||
            (typeof event.latitude === 'number' &&
              typeof event.longitude === 'number') ? (
              <View className="mt-3">
                <AppButton
                  label="Abrir en Maps"
                  variant="secondary"
                  onPress={() =>
                    void Linking.openURL(
                      mapsUrl({
                        venueName: event.venueName,
                        location: event.location,
                        latitude: event.latitude,
                        longitude: event.longitude,
                      }),
                    )
                  }
                />
              </View>
            ) : null}
            <InfoRow icon="👥" text={`Cupo ${event.capacity} personas`} />
            {event.type === 'social' && event.hasTables ? (
              <InfoRow icon="🪑" text={`${event.tableCount ?? 0} mesas`} />
            ) : null}
            {event.type === 'entertainment' && event.hasZones ? (
              <InfoRow icon="🎟️" text={`Zonas: ${event.zones}`} />
            ) : null}
            {event.description ? (
              <Text className="mt-4 text-base text-inkwell" style={{ fontFamily: 'Inter_500Medium' }}>
                {event.description}
              </Text>
            ) : null}
          </View>

          <View className="mt-4 rounded-[28px] border border-line bg-mist/70 px-5 py-4">
            <Text
              className="text-base text-inkwell"
              style={{ fontFamily: 'Inter_600SemiBold' }}
            >
              Escaneo en puerta
            </Text>
            <Text
              className="mt-2 text-sm text-mute"
              style={{ fontFamily: 'Inter_500Medium' }}
            >
              Se habilita {SCAN_EARLY_MINUTES} min antes del inicio (
              {formatWhen(scanOpensAt(event.startsAt).toISOString())}) y cierra al
              terminar el evento ({formatWhen(event.endsAt)}).
            </Text>
          </View>

          {event.status === 'ACTIVE' ? (
            <AppButton
              className="mt-5"
              label="Suspender evento"
              variant="ghost"
              onPress={() => {
                setNotifyGuests(true)
                setSuspendOpen(true)
              }}
            />
          ) : null}
          {event.status === 'SUSPENDED' ? (
            <View className="mt-5 rounded-[28px] border border-amber-200 bg-amber-50 px-5 py-4">
              <StatusBadge value="SUSPENDED" />
              <Text
                className="mt-3 text-sm text-amber-900"
                style={{ fontFamily: 'Inter_500Medium' }}
              >
                Este evento está suspendido. Reactívalo para que los invitados puedan confirmar y entrar.
              </Text>
              <AppButton
                className="mt-4"
                label={changeStatus.isPending ? 'Reactivando…' : 'Reactivar evento'}
                loading={changeStatus.isPending}
                onPress={() =>
                  changeStatus.mutate(
                    { status: 'ACTIVE' },
                    { onError: reportStatusError },
                  )
                }
              />
            </View>
          ) : null}
          <AppButton
            className="mt-4"
            label="Ver invitados"
            onPress={() => router.push(`/(planner)/events/${id}/guests`)}
          />
          <AppButton
            className="mt-3"
            label="Ver pases"
            onPress={() => router.push(`/(planner)/events/${id}/passes`)}
          />
          <AppButton
            className="mt-3"
            label="Staff"
            variant="secondary"
            onPress={() => router.push(`/(planner)/events/${id}/staff`)}
          />
          <AppButton className="mt-3" label="Editar evento" variant="secondary" onPress={openEdit} />
        </View>
      ) : null}
    </Screen>

      <Modal
        visible={editing}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          if (!save.isPending) setEditing(false)
        }}
      >
        <SafeAreaView className="flex-1 bg-paper">
          <View style={{ flex: 1, paddingHorizontal: 28, paddingTop: 12 }}>
            <ScreenHeader
              title="Editar evento"
              eyebrow="Evento"
              subtitle={event?.name}
              onBack={() => {
                if (!save.isPending) setEditing(false)
              }}
            />
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <EventEditorFields
                values={values}
                onChange={(patch) => setValues((current) => ({ ...current, ...patch }))}
              />
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
                label={save.isPending ? 'Guardando…' : 'Guardar'}
                loading={save.isPending}
                onPress={() => save.mutate()}
              />
              <AppButton
                className="mt-2"
                label="Cancelar"
                variant="ghost"
                disabled={save.isPending}
                onPress={() => setEditing(false)}
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={suspendOpen}
        onRequestClose={() => {
          if (!changeStatus.isPending) setSuspendOpen(false)
        }}
      >
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="w-full rounded-[28px] bg-white px-5 py-5">
            <Text
              className="text-xl text-inkwell"
              style={{ fontFamily: 'Inter_700Bold' }}
            >
              Suspender evento
            </Text>
            <Text
              className="mt-2 text-base text-mute"
              style={{ fontFamily: 'Inter_500Medium' }}
            >
              Mientras esté suspendido no se validan pases ni confirmaciones.
            </Text>
            <View className="mt-4 flex-row items-center justify-between gap-3">
              <Text
                className="flex-1 text-base text-inkwell"
                style={{ fontFamily: 'Inter_500Medium' }}
              >
                Avisar a invitados confirmados por email
              </Text>
              <Switch
                value={notifyGuests}
                onValueChange={setNotifyGuests}
                trackColor={{ false: '#e6e2f2', true: '#4334d6' }}
                thumbColor="#ffffff"
              />
            </View>
            <AppButton
              className="mt-5"
              label={changeStatus.isPending ? 'Suspendiendo…' : 'Suspender'}
              loading={changeStatus.isPending}
              onPress={() =>
                changeStatus.mutate(
                  { status: 'SUSPENDED', notifyGuests },
                  {
                    onSuccess: () => setSuspendOpen(false),
                    onError: reportStatusError,
                  },
                )
              }
            />
            <AppButton
              className="mt-2"
              label="Cancelar"
              variant="ghost"
              disabled={changeStatus.isPending}
              onPress={() => setSuspendOpen(false)}
            />
          </View>
        </View>
      </Modal>
    </>
  )
}
