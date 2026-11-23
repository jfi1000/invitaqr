import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Share,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { GuestItem } from '../../../../components/GuestItem'
import { StatusBadge } from '../../../../components/StatusBadge'
import { AppButton } from '../../../../components/ui/AppButton'
import { Screen } from '../../../../components/ui/Screen'
import { ScreenHeader } from '../../../../components/ui/ScreenHeader'
import {
  apiErrorMessage,
  ensurePasses,
  getGuests,
  getPassQr,
} from '../../../../lib/api'
import { eventLogo } from '../../../../lib/brand'
import { queryKeys } from '../../../../lib/query'
import type { GuestView } from '../../../../lib/types'

function routeId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

export default function PassesScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ id: string }>()
  const eventId = routeId(params.id)
  const client = useQueryClient()
  const guests = useQuery({
    queryKey: queryKeys.guests(eventId),
    queryFn: () => getGuests(eventId),
    enabled: Boolean(eventId),
  })
  const allGuests = guests.data ?? []
  const passes = allGuests.filter((guest) => guest.pass)
  const missing = allGuests.filter((guest) => !guest.pass)
  const [selected, setSelected] = useState<GuestView | null>(null)
  const [hint, setHint] = useState<string | null>(null)

  const generate = useMutation({
    mutationFn: () => ensurePasses(eventId),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.guests(eventId) })
    },
  })

  const qrQuery = useQuery({
    queryKey: ['pass-qr', eventId, selected?.pass?.id],
    queryFn: () => getPassQr(eventId, selected!.pass!.id),
    enabled: Boolean(eventId && selected?.pass?.id && selected.pass.rsvpStatus === 'CONFIRMED'),
  })

  function isReady(guest: GuestView): boolean {
    return guest.pass?.rsvpStatus === 'CONFIRMED' && Boolean(guest.pass.qrToken)
  }

  function openQr(guest: GuestView) {
    setHint(null)
    if (!isReady(guest)) {
      setHint('Esperando confirmación')
      return
    }
    setSelected(guest)
  }

  async function sharePass(guest: GuestView) {
    setHint(null)
    if (!isReady(guest) || !guest.pass) {
      setHint('Esperando confirmación')
      return
    }
    try {
      const qr = await getPassQr(eventId, guest.pass.id)
      const extras: string[] = []
      if (qr.eventType === 'social') {
        if (qr.tableNumber) extras.push(`Mesa ${qr.tableNumber}`)
        extras.push(`Acompañantes autorizados: ${qr.maxCompanions}`)
      }
      if (qr.eventType === 'entertainment' && qr.zone) {
        extras.push(`Zona: ${qr.zone}`)
      }
      await Share.share({
        message: [
          `Pase InvitaQR para ${qr.guestName}`,
          `Evento: ${qr.eventName}`,
          ...extras,
          `Confirma o muestra tu pase: ${qr.shareUrl}`,
        ].join('\n'),
        title: `Pase de ${qr.guestName}`,
        url: qr.shareUrl,
      })
    } catch (caught) {
      setHint(apiErrorMessage(caught))
    }
  }

  return (
    <Screen>
      <ScreenHeader
        title="Pases"
        eyebrow="Acceso"
        subtitle="Cada invitado tiene un pase con su QR."
      />
      {guests.isError ? (
        <Text className="mt-1 text-sm text-red-700">{apiErrorMessage(guests.error)}</Text>
      ) : null}
      {generate.isError ? (
        <Text className="mt-1 text-sm text-red-700">{apiErrorMessage(generate.error)}</Text>
      ) : null}
      {hint ? <Text className="mt-1 text-sm text-amber-700">{hint}</Text> : null}
      {!guests.isLoading && allGuests.length === 0 ? (
        <View className="mt-4">
          <Text className="text-base text-mute">
            Primero agrega invitados para generar sus pases
          </Text>
          <AppButton
            className="mt-4"
            label="Agregar invitados"
            onPress={() => router.push(`/(planner)/events/${eventId}/guests`)}
          />
        </View>
      ) : null}
      {missing.length > 0 ? (
        <AppButton
          className="mt-2"
          label={generate.isPending ? 'Generando…' : 'Generar pases para todos'}
          loading={generate.isPending}
          onPress={() => generate.mutate()}
        />
      ) : null}
      <FlatList
        style={{ flex: 1 }}
        className="mt-4"
        data={passes}
        keyExtractor={(item) => item.pass?.id ?? item.id}
        ListEmptyComponent={
          guests.isLoading ? (
            <Text className="text-base text-mute">Cargando…</Text>
          ) : allGuests.length === 0 ? undefined : (
            <Text className="mt-6 text-base text-mute">Todavía no hay pases.</Text>
          )
        }
        renderItem={({ item }) => {
          const ready = isReady(item)
          return (
            <GuestItem
              name={item.name}
              detail={
                ready
                  ? [
                      item.tableNumber ? `Mesa ${item.tableNumber}` : null,
                      item.zone ? `Zona ${item.zone}` : null,
                      item.maxCompanions > 0
                        ? `${item.maxCompanions} acompañantes`
                        : 'QR listo',
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : 'Esperando confirmación'
              }
              badge={item.pass ? <StatusBadge value={item.pass.rsvpStatus} /> : undefined}
              action={
                ready ? (
                  <View className="flex-row gap-2">
                    <AppButton
                      className="flex-1"
                      label="Ver QR"
                      variant="soft"
                      onPress={() => openQr(item)}
                    />
                    <AppButton
                      className="flex-1"
                      label="Compartir"
                      variant="secondary"
                      onPress={() => void sharePass(item)}
                    />
                  </View>
                ) : (
                  <View className="items-center rounded-full bg-mist py-3">
                    <Text className="text-sm text-mute" style={{ fontFamily: 'Inter_600SemiBold' }}>
                      Esperando confirmación
                    </Text>
                  </View>
                )
              }
            />
          )
        }}
      />

      <Modal
        visible={selected !== null}
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <SafeAreaView className="flex-1 bg-paper">
          <View style={{ flex: 1, paddingHorizontal: 28, paddingTop: 12 }}>
            <ScreenHeader
              title="Pase QR"
              eyebrow="Invitado"
              onBack={() => setSelected(null)}
            />
            {qrQuery.isLoading ? <ActivityIndicator className="mt-8" color="#4334d6" /> : null}
            {qrQuery.isError ? (
              <Text className="mt-4 text-base text-red-700">{apiErrorMessage(qrQuery.error)}</Text>
            ) : null}
            {qrQuery.data ? (
              <View className="mt-2 items-center rounded-[28px] border border-line bg-card p-6">
                <Image
                  source={{ uri: eventLogo(qrQuery.data.logo) }}
                  style={{ width: 72, height: 72, borderRadius: 18, marginBottom: 12 }}
                />
                <Text
                  className="text-center text-[28px] text-inkwell"
                  style={{ fontFamily: 'Inter_600SemiBold', letterSpacing: -0.5 }}
                >
                  {qrQuery.data.guestName}
                </Text>
                <Text className="mt-1 text-center text-base text-mute">{qrQuery.data.eventName}</Text>
                {qrQuery.data.eventType === 'social' ? (
                  <Text className="mt-3 text-center text-sm text-inkwell">
                    {qrQuery.data.tableNumber ? `Mesa ${qrQuery.data.tableNumber} · ` : ''}
                    Acompañantes: {qrQuery.data.maxCompanions}
                  </Text>
                ) : null}
                {qrQuery.data.eventType === 'entertainment' && qrQuery.data.zone ? (
                  <Text className="mt-3 text-center text-sm text-inkwell">
                    Zona: {qrQuery.data.zone}
                  </Text>
                ) : null}
                <Image
                  source={{ uri: qrQuery.data.qrDataUrl }}
                  style={{ width: 260, height: 260, marginTop: 16 }}
                  accessibilityLabel={`Código QR de ${qrQuery.data.guestName}`}
                />
              </View>
            ) : null}
            <AppButton className="mt-6" label="Cerrar" onPress={() => setSelected(null)} />
          </View>
        </SafeAreaView>
      </Modal>
    </Screen>
  )
}
