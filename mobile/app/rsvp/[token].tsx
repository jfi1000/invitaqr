import { useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { Image, Linking, Pressable, Text, TextInput, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { AppButton } from '../../components/ui/AppButton'
import { RsvpSkeleton } from '../../components/ui/screen-skeletons'
import { Screen } from '../../components/ui/Screen'
import { apiErrorMessage, confirmRsvp, declineRsvp, getRsvp } from '../../lib/api'
import { eventLogo } from '../../lib/brand'
import { formatEventRange } from '../../lib/format'
import type { RsvpView } from '../../lib/types'
import { type as typography } from '../../lib/typography'
import { formatVenueLine, mapsUrl } from '../../lib/venue'

export default function PublicRsvpScreen() {
  const params = useLocalSearchParams<{ token?: string }>()
  const token = Array.isArray(params.token) ? params.token[0] : params.token
  const [data, setData] = useState<RsvpView | null>(null)
  const [companions, setCompanions] = useState('0')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError('Enlace de invitación no válido')
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    void getRsvp(token)
      .then((view) => {
        if (cancelled) return
        setData(view)
        setCompanions(String(Math.min(view.pass.companionsConfirmed, view.guest.maxCompanions)))
      })
      .catch((caught) => {
        if (!cancelled) setError(apiErrorMessage(caught))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  async function handleConfirm() {
    if (!token) return
    const count = Number(companions)
    if (!Number.isFinite(count) || count < 0) {
      setError('Indica un número válido de acompañantes')
      return
    }
    if (data && count > data.guest.maxCompanions) {
      setError(`Puedes confirmar hasta ${data.guest.maxCompanions} acompañantes`)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const view = await confirmRsvp(token, count)
      setData(view)
    } catch (caught) {
      setError(apiErrorMessage(caught))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDecline() {
    if (!token) return
    setSubmitting(true)
    setError(null)
    try {
      const view = await declineRsvp(token)
      setData(view)
    } catch (caught) {
      setError(apiErrorMessage(caught))
    } finally {
      setSubmitting(false)
    }
  }

  function bumpCompanions(delta: number) {
    const max = data?.guest.maxCompanions ?? 0
    const next = Math.max(0, Math.min(max, Number(companions || 0) + delta))
    setCompanions(String(next))
  }

  if (loading) {
    return (
      <Screen>
        <RsvpSkeleton />
      </Screen>
    )
  }

  if (error && !data) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center px-4">
          <Text style={[typography.section, { textAlign: 'center' }]}>No pudimos abrir la invitación</Text>
          <Text style={[typography.body, { marginTop: 10, textAlign: 'center' }]}>{error}</Text>
        </View>
      </Screen>
    )
  }

  if (!data) {
    return null
  }

  const eventOpen = data.event.status === 'ACTIVE'
  const status = data.pass.rsvpStatus

  return (
    <Screen scroll>
      <View className="items-center pt-4">
        <Image
          source={{ uri: eventLogo(data.event.logo) }}
          style={{ width: 88, height: 88, borderRadius: 22, backgroundColor: '#4334d6' }}
        />
        <Text style={[typography.label, { marginTop: 18 }]}>INVITAQR</Text>
        <Text style={[typography.display, { marginTop: 8, textAlign: 'center' }]}>
          {data.event.name}
        </Text>
        <Text style={[typography.body, { marginTop: 10, textAlign: 'center' }]}>
          Hola, {data.guest.name}
        </Text>
      </View>

      <View className="mt-6 rounded-3xl border border-line bg-card px-5 py-5">
        <Text style={typography.caption}>FECHA Y HORA</Text>
        <Text style={[typography.section, { marginTop: 6, fontSize: 18 }]}>
          {formatEventRange(data.event.startsAt, data.event.endsAt)}
        </Text>
        <Text style={[typography.caption, { marginTop: 16 }]}>LUGAR</Text>
        <Text style={[typography.body, { marginTop: 6 }]}>
          {formatVenueLine(data.event.venueName, data.event.location)}
        </Text>
        {data.event.venueName || data.event.location || data.event.latitude ? (
          <Pressable
            className="mt-3"
            onPress={() =>
              void Linking.openURL(
                mapsUrl({
                  venueName: data.event.venueName,
                  location: data.event.location,
                  latitude: data.event.latitude,
                  longitude: data.event.longitude,
                }),
              )
            }
          >
            <Text style={typography.label}>Abrir en Maps</Text>
          </Pressable>
        ) : null}
      </View>

      {!eventOpen ? (
        <View className="mt-8 rounded-3xl border border-line bg-mist px-5 py-6">
          <Text style={[typography.section, { textAlign: 'center' }]}>
            Este evento no está recibiendo confirmaciones
          </Text>
        </View>
      ) : null}

      {eventOpen && status === 'PENDING' ? (
        <View className="mt-8">
          <Text style={[typography.section, { textAlign: 'center' }]}>¿Asistirás?</Text>
          {data.guest.maxCompanions > 0 ? (
            <View className="mt-5">
              <Text style={[typography.caption, { textAlign: 'center' }]}>
                Acompañantes (máx. {data.guest.maxCompanions})
              </Text>
              <View className="mt-3 flex-row items-center justify-center gap-4">
                <Pressable
                  onPress={() => bumpCompanions(-1)}
                  className="h-11 w-11 items-center justify-center rounded-full bg-mist active:opacity-80"
                >
                  <Text style={typography.section}>−</Text>
                </Pressable>
                <TextInput
                  value={companions}
                  onChangeText={(value) => setCompanions(value.replace(/[^\d]/g, ''))}
                  keyboardType="number-pad"
                  className="min-w-[64px] rounded-2xl border border-line bg-white px-4 py-3 text-center text-xl text-inkwell"
                  style={{ fontFamily: 'Inter_700Bold' }}
                />
                <Pressable
                  onPress={() => bumpCompanions(1)}
                  className="h-11 w-11 items-center justify-center rounded-full bg-mist active:opacity-80"
                >
                  <Text style={typography.section}>+</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {error ? (
            <Text className="mt-4 text-center text-base text-red-700">{error}</Text>
          ) : null}

          <AppButton
            className="mt-6"
            label={submitting ? 'Guardando…' : 'Confirmar asistencia'}
            loading={submitting}
            onPress={() => void handleConfirm()}
          />
          <AppButton
            className="mt-3"
            label="No podré ir"
            variant="secondary"
            disabled={submitting}
            onPress={() => void handleDecline()}
          />
        </View>
      ) : null}

      {eventOpen && status === 'CONFIRMED' ? (
        <View className="mt-8 items-center">
          <Text style={[typography.section, { textAlign: 'center', color: '#1f8a4c' }]}>
            ¡Tu lugar está confirmado!
          </Text>
          <Text style={[typography.body, { marginTop: 8, textAlign: 'center' }]}>
            Presenta este código QR el día del evento.
          </Text>
          {data.pass.qrToken ? (
            <View className="mt-6 rounded-3xl border border-line bg-white p-5">
              <QRCode value={data.pass.qrToken} size={220} />
            </View>
          ) : null}
          {data.pass.companionsConfirmed > 0 ? (
            <Text style={[typography.caption, { marginTop: 14 }]}>
              Acompañantes: {data.pass.companionsConfirmed}
            </Text>
          ) : null}
        </View>
      ) : null}

      {eventOpen && status === 'WAITLIST' ? (
        <View className="mt-8 rounded-3xl border border-line bg-mist px-5 py-6">
          <Text style={[typography.section, { textAlign: 'center' }]}>Lista de espera</Text>
          <Text style={[typography.body, { marginTop: 10, textAlign: 'center' }]}>
            Estás en lista de espera, te avisaremos si se libera un lugar
          </Text>
        </View>
      ) : null}

      {eventOpen && status === 'DECLINED' ? (
        <View className="mt-8 rounded-3xl border border-line bg-mist px-5 py-6">
          <Text style={[typography.section, { textAlign: 'center' }]}>
            Ya registraste que no podrás asistir
          </Text>
        </View>
      ) : null}
    </Screen>
  )
}
