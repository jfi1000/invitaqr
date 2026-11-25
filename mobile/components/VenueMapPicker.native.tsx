import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native'
import MapView, { Marker, type Region } from 'react-native-maps'
import { SafeAreaView } from 'react-native-safe-area-context'
import { geocodeAddress, mapsUrl, type GeoPoint } from '../lib/venue'
import { type as typography } from '../lib/typography'
import { AppButton } from './ui/AppButton'
import { ScreenHeader } from './ui/ScreenHeader'

interface VenueMapPickerProps {
  visible: boolean
  venueName: string
  address: string
  initial?: { latitude: number; longitude: number } | null
  onClose: () => void
  onConfirm: (point: GeoPoint) => void
}

export function VenueMapPicker({
  visible,
  venueName,
  address,
  initial,
  onClose,
  onConfirm,
}: VenueMapPickerProps) {
  const [point, setPoint] = useState<GeoPoint | null>(
    initial
      ? { latitude: initial.latitude, longitude: initial.longitude }
      : null,
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [region, setRegion] = useState<Region | null>(
    initial
      ? {
          latitude: initial.latitude,
          longitude: initial.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }
      : null,
  )

  useEffect(() => {
    if (!visible) return

    if (
      typeof initial?.latitude === 'number' &&
      typeof initial.longitude === 'number'
    ) {
      setPoint({ latitude: initial.latitude, longitude: initial.longitude })
      setRegion({
        latitude: initial.latitude,
        longitude: initial.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      })
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false

    async function locate() {
      const query = [venueName, address].filter((part) => part.trim()).join(', ')
      if (!query) {
        setError('Escribe el nombre del lugar o la dirección para ubicar el mapa')
        setPoint(null)
        setRegion(null)
        return
      }

      setLoading(true)
      setError(null)
      try {
        const found = await geocodeAddress(query, { venueName, address })
        if (cancelled) return
        if (!found) {
          setError(
            'No encontramos esa dirección. Revisa el texto o toca el mapa cuando aparezca una zona cercana.',
          )
          setPoint(null)
          setRegion(null)
          return
        }
        setPoint(found)
        setRegion({
          latitude: found.latitude,
          longitude: found.longitude,
          latitudeDelta: found.approximate ? 0.04 : 0.01,
          longitudeDelta: found.approximate ? 0.04 : 0.01,
        })
        if (found.approximate) {
          setError(
            `Ubicación aproximada${found.label ? ` (${found.label.split(',').slice(0, 2).join(',').trim()})` : ''}. Arrastra el pin al punto exacto.`,
          )
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : 'No se pudo buscar la dirección',
          )
          setPoint(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void locate()
    return () => {
      cancelled = true
    }
  }, [visible, venueName, address, initial?.latitude, initial?.longitude])

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-paper">
        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8 }}>
          <ScreenHeader
            title="Ubicar en el mapa"
            eyebrow="Lugar"
            subtitle="Toca el mapa o arrastra el pin hasta la entrada."
            onBack={onClose}
          />

          <Text style={[typography.caption, { marginBottom: 8 }]}>
            {[venueName, address].filter((part) => part.trim()).join(' · ') ||
              'Sin dirección escrita'}
          </Text>

          <View
            style={{
              flex: 1,
              borderRadius: 24,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: '#e6e2f2',
              backgroundColor: '#eef0f7',
              minHeight: 280,
            }}
          >
            {loading || !region ? (
              <View className="flex-1 items-center justify-center">
                {loading ? (
                  <>
                    <ActivityIndicator color="#4334d6" />
                    <Text style={[typography.body, { marginTop: 10 }]}>
                      Buscando dirección…
                    </Text>
                  </>
                ) : (
                  <Text style={[typography.body, { textAlign: 'center', paddingHorizontal: 16 }]}>
                    No hay mapa aún. Revisa la dirección e inténtalo de nuevo.
                  </Text>
                )}
              </View>
            ) : (
              <MapView
                key={`${region.latitude.toFixed(5)}-${region.longitude.toFixed(5)}`}
                style={{ flex: 1 }}
                initialRegion={region}
                onPress={(event) => {
                  const { latitude, longitude } = event.nativeEvent.coordinate
                  setPoint({ latitude, longitude })
                  setError(null)
                }}
              >
                {point ? (
                  <Marker
                    coordinate={{
                      latitude: point.latitude,
                      longitude: point.longitude,
                    }}
                    draggable
                    onDragEnd={(event) => {
                      const { latitude, longitude } = event.nativeEvent.coordinate
                      setPoint({ latitude, longitude })
                      setError(null)
                    }}
                    title={venueName || 'Evento'}
                    description={address || undefined}
                  />
                ) : null}
              </MapView>
            )}
          </View>

          {error ? (
            <Text className="mt-3 text-sm text-amber-800">{error}</Text>
          ) : (
            <Text style={[typography.caption, { marginTop: 10 }]}>
              Arrastra el pin o toca el mapa para moverlo.
            </Text>
          )}

          {point ? (
            <Pressable
              className="mt-3"
              onPress={() =>
                void Linking.openURL(
                  mapsUrl({
                    latitude: point.latitude,
                    longitude: point.longitude,
                    venueName,
                    location: address,
                  }),
                )
              }
            >
              <Text style={[typography.label, { textAlign: 'center' }]}>
                Vista previa en Google Maps
              </Text>
            </Pressable>
          ) : null}

          <AppButton
            className="mt-4"
            label="Confirmar ubicación"
            disabled={!point || loading}
            onPress={() => {
              if (point) onConfirm(point)
            }}
          />
          <AppButton className="mt-2" label="Cancelar" variant="ghost" onPress={onClose} />
        </View>
      </SafeAreaView>
    </Modal>
  )
}
