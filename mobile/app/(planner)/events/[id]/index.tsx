import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useGlobalSearchParams, useLocalSearchParams, useRouter, useSegments } from 'expo-router'
import { useState } from 'react'
import { Image, Linking, Text, View } from 'react-native'
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
import { apiErrorMessage, createCheckout, updateEvent } from '../../../../lib/api'
import { openStripeCheckout } from '../../../../lib/checkout'
import { eventLogo } from '../../../../lib/brand'
import { fromIsoLocal, formatWhen, toIso } from '../../../../lib/format'
import { backToEventList } from '../../../../lib/navigation'
import { queryKeys } from '../../../../lib/query'
import { type as typography } from '../../../../lib/typography'
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
  const [formError, setFormError] = useState<string | null>(null)
  const [paying, setPaying] = useState<'BASIC' | 'PRO' | null>(null)

  async function pay(plan: 'BASIC' | 'PRO') {
    if (!id || paying) return
    setPaying(plan)
    setFormError(null)
    try {
      const session = await createCheckout(id, plan)
      await openStripeCheckout(session.url)
    } catch (caught) {
      setFormError(apiErrorMessage(caught))
      setPaying(null)
    }
  }

  const save = useMutation({
    mutationFn: () => {
      if (!event) {
        throw new Error('No encontramos este evento')
      }
      if (!values.name.trim()) {
        throw new Error('Escribe el nombre del evento')
      }
      const startsAt = toIso(values.starts)
      if (!startsAt) {
        throw new Error('Elige la fecha y hora de inicio')
      }
      const originalStart = new Date(event.startsAt).getTime()
      const nextStart = new Date(startsAt).getTime()
      const startMoved = Math.abs(nextStart - originalStart) > 60_000
      if (startMoved && nextStart < Date.now()) {
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
      setFormError(null)
    },
    onError: (caught) => {
      const own =
        caught instanceof Error &&
        (caught.message.startsWith('Escribe') ||
          caught.message.startsWith('Elige') ||
          caught.message.startsWith('La fecha') ||
          caught.message.startsWith('Indica') ||
          caught.message.startsWith('Escribe las zonas'))
      setFormError(own ? caught.message : apiErrorMessage(caught))
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
    setFormError(null)
    setEditing(true)
  }

  return (
    <Screen scroll>
      <ScreenHeader
        title="Evento"
        eyebrow="InvitaQR"
        onBack={() => backToEventList(router)}
      />
      {!id ? <Text className="mt-4 text-base text-red-700">No encontramos este evento.</Text> : null}
      {id && eventQuery.isPending ? (
        <Text className="mt-4 text-base text-mute">Cargando…</Text>
      ) : null}
      {eventQuery.isError ? (
        <Text className="mt-4 text-base text-red-700">{apiErrorMessage(eventQuery.error)}</Text>
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

          {event.paidPlan === 'BASIC' || event.paidPlan === 'PRO' ? (
            <View className="mt-5 items-center rounded-[28px] border border-line bg-card px-5 py-6">
              <Text style={typography.label}>PAQUETE</Text>
              <Text className="mt-2 text-center text-indigo" style={typography.display}>
                {event.paidPlan}
              </Text>
              <Text
                className="mt-2 text-center text-inkwell"
                style={{ fontFamily: 'Inter_500Medium', fontSize: 16, lineHeight: 22 }}
              >
                {event.paidPlan === 'PRO'
                  ? 'Este evento ya tiene el paquete PRO, hasta 500 personas.'
                  : 'Este evento ya tiene el paquete BASIC, hasta 150 personas.'}
              </Text>
            </View>
          ) : null}

          {event.status === 'DRAFT' ? (
            <View className="mt-5 gap-3">
              {event.paidPlan === 'PRO' ? null : event.paidPlan === 'BASIC' ? (
                <AppButton
                  label={paying === 'PRO' ? 'Abriendo pago…' : 'Subir a PRO $599'}
                  loading={paying === 'PRO'}
                  disabled={paying !== null}
                  onPress={() => void pay('PRO')}
                />
              ) : (
                <>
                  <Text className="text-center text-sm text-mute" style={{ fontFamily: 'Inter_500Medium' }}>
                    FREE se activa sin pago. BASIC ($299) y PRO ($599) se cobran una vez.
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    <AppButton
                      className="flex-1"
                      label={paying === 'BASIC' ? 'Abriendo pago…' : 'BASIC $299'}
                      loading={paying === 'BASIC'}
                      disabled={paying !== null}
                      onPress={() => void pay('BASIC')}
                    />
                    <AppButton
                      className="flex-1"
                      label={paying === 'PRO' ? 'Abriendo pago…' : 'PRO $599'}
                      loading={paying === 'PRO'}
                      disabled={paying !== null}
                      onPress={() => void pay('PRO')}
                    />
                  </View>
                </>
              )}
              <AppButton
                label={changeStatus.isPending ? 'Activando…' : 'Activar evento'}
                loading={changeStatus.isPending}
                variant={event.paidPlan ? 'secondary' : 'primary'}
                onPress={() => changeStatus.mutate('ACTIVE')}
              />
              {formError ? <Text className="text-center text-base text-red-700">{formError}</Text> : null}
            </View>
          ) : null}
          {changeStatus.isError ? (
            <Text className="mt-3 text-base text-red-700">{apiErrorMessage(changeStatus.error)}</Text>
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

          {editing ? (
            <View className="mt-6 rounded-[28px] border border-line bg-card p-4">
              <Text
                className="text-[28px] text-inkwell"
                style={{ fontFamily: 'Inter_600SemiBold', letterSpacing: -0.5 }}
              >
                Editar evento
              </Text>
              <EventEditorFields
                allowPast
                paying={paying}
                onPay={(plan) => {
                  if (event.paidPlan === 'PRO') return
                  if (event.paidPlan === 'BASIC' && plan !== 'PRO') return
                  void pay(plan)
                }}
                values={values}
                onChange={(patch) => setValues((current) => ({ ...current, ...patch }))}
              />
              {formError ? <Text className="mt-3 text-base text-red-700">{formError}</Text> : null}
              <AppButton
                className="mt-4"
                label={save.isPending ? 'Guardando…' : 'Guardar'}
                loading={save.isPending}
                onPress={() => save.mutate()}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </Screen>
  )
}
