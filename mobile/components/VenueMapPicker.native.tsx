import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
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

function savedPoint(
  initial?: { latitude: number; longitude: number } | null,
): { latitude: number; longitude: number } | null {
  const latitude = Number(initial?.latitude)
  const longitude = Number(initial?.longitude)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  return { latitude, longitude }
}

function regionFor(
  point: { latitude: number; longitude: number },
  delta = 0.01,
): Region {
  return {
    latitude: point.latitude,
    longitude: point.longitude,
    latitudeDelta: delta,
    longitudeDelta: delta,
  }
}

export function VenueMapPicker({
  visible,
  venueName,
  address,
  initial,
  onClose,
  onConfirm,
}: VenueMapPickerProps) {
  const mapRef = useRef<MapView>(null)
  const starting = savedPoint(initial)
  const [mapReady, setMapReady] = useState(false)
  const [point, setPoint] = useState<GeoPoint | null>(starting)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [region, setRegion] = useState<Region | null>(
    starting ? regionFor(starting) : null,
  )

  useEffect(() => {
    if (!visible) {
      setMapReady(false)
      return
    }
    const saved = savedPoint(initial)
    if (saved) {
      const next = regionFor(saved)
      setPoint(saved)
      setRegion(next)
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
        const next = regionFor(found, found.approximate ? 0.04 : 0.01)
        setPoint(found)
        setRegion(next)
        mapRef.current?.animateToRegion(next, 300)
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
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      onShow={() => setMapReady(true)}
    >
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
            {loading || !region || !mapReady ? (
              <View className="flex-1 items-center justify-center">
                {loading || (region && !mapReady) ? (
                  <>
                    <ActivityIndicator color="#4334d6" />
                    <Text style={[typography.body, { marginTop: 10 }]}>
                      {loading ? 'Buscando dirección…' : 'Abriendo mapa…'}
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
                ref={mapRef}
                style={StyleSheet.absoluteFill}
                initialRegion={region}
                onMapReady={() => {
                  mapRef.current?.animateToRegion(region, 1)
                }}
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
