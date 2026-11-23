import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native'
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

type LeafletNs = typeof import('leaflet')
type LeafletMap = import('leaflet').Map
type LeafletMarker = import('leaflet').Marker

declare global {
  interface Window {
    L?: LeafletNs
  }
}

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'

function loadLeaflet(): Promise<LeafletNs> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Leaflet solo corre en web'))
  }
  if (window.L) return Promise.resolve(window.L)

  return new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = LEAFLET_CSS
      document.head.appendChild(link)
    }

    const existing = document.querySelector(`script[src="${LEAFLET_JS}"]`)
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.L) resolve(window.L)
        else reject(new Error('Leaflet no cargó'))
      })
      return
    }

    const script = document.createElement('script')
    script.src = LEAFLET_JS
    script.async = true
    script.onload = () => {
      if (window.L) resolve(window.L)
      else reject(new Error('Leaflet no cargó'))
    }
    script.onerror = () => reject(new Error('No se pudo cargar el mapa'))
    document.head.appendChild(script)
  })
}

function TouchMap({
  point,
  onChange,
}: {
  point: GeoPoint
  onChange: (next: GeoPoint) => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markerRef = useRef<LeafletMarker | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    let cancelled = false
    let map: LeafletMap | null = null

    async function setup() {
      const L = await loadLeaflet()
      if (cancelled || !containerRef.current) return

      const pinIcon = L.divIcon({
        className: 'invitaqr-map-pin',
        html: `<div style="
          width: 26px;
          height: 26px;
          border-radius: 50% 50% 50% 0;
          background: #4334d6;
          border: 3px solid #fff;
          box-shadow: 0 2px 8px rgba(40, 30, 90, 0.35);
          transform: rotate(-45deg);
        "></div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 26],
      })

      map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView([point.latitude, point.longitude], 16)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)

      const marker = L.marker([point.latitude, point.longitude], {
        draggable: true,
        icon: pinIcon,
        autoPan: true,
      }).addTo(map)

      marker.on('dragend', () => {
        const { lat, lng } = marker.getLatLng()
        onChangeRef.current({ latitude: lat, longitude: lng })
      })

      map.on('click', (event) => {
        const { lat, lng } = event.latlng
        marker.setLatLng([lat, lng])
        onChangeRef.current({ latitude: lat, longitude: lng })
      })

      mapRef.current = map
      markerRef.current = marker

      requestAnimationFrame(() => {
        map?.invalidateSize()
      })
      setTimeout(() => map?.invalidateSize(), 250)
    }

    void setup()

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // Montaje único; sync de punto en el efecto siguiente
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const marker = markerRef.current
    if (!map || !marker) return
    const current = marker.getLatLng()
    if (
      Math.abs(current.lat - point.latitude) < 1e-7 &&
      Math.abs(current.lng - point.longitude) < 1e-7
    ) {
      return
    }
    marker.setLatLng([point.latitude, point.longitude])
    map.panTo([point.latitude, point.longitude])
  }, [point.latitude, point.longitude])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: 280, touchAction: 'none' }}
    />
  )
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
  const [mapKey, setMapKey] = useState(0)

  useEffect(() => {
    if (!visible) return
    let cancelled = false

    async function locate() {
      if (initial) {
        setPoint({ latitude: initial.latitude, longitude: initial.longitude })
        setError(null)
        setMapKey((key) => key + 1)
        return
      }

      const query = [venueName, address].filter((part) => part.trim()).join(', ')
      if (!query) {
        setError('Escribe el nombre del lugar o la dirección para ubicar el mapa')
        setPoint(null)
        return
      }

      setLoading(true)
      setError(null)
      try {
        const found = await geocodeAddress(query, { venueName, address })
        if (cancelled) return
        if (!found) {
          setError(
            'No encontramos esa dirección. Revisa el texto o busca la zona en Google Maps.',
          )
          setPoint(null)
          return
        }
        setPoint(found)
        setMapKey((key) => key + 1)
        if (found.approximate) {
          setError(
            `Ubicación aproximada${found.label ? ` (${found.label.split(',').slice(0, 2).join(',').trim()})` : ''}. Toca el mapa o arrastra el pin.`,
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
            {loading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator color="#4334d6" />
                <Text style={[typography.body, { marginTop: 10 }]}>
                  Buscando dirección…
                </Text>
              </View>
            ) : point ? (
              <TouchMap
                key={mapKey}
                point={point}
                onChange={(next) => {
                  setPoint(next)
                  setError(null)
                }}
              />
            ) : (
              <View className="flex-1 items-center justify-center px-6">
                <Text style={[typography.body, { textAlign: 'center' }]}>
                  Escribe una dirección y vuelve a abrir el mapa.
                </Text>
              </View>
            )}
          </View>

          {error ? (
            <Text className="mt-3 text-sm text-amber-800">{error}</Text>
          ) : (
            <Text style={[typography.caption, { marginTop: 10 }]}>
              Toca donde quieras el pin, o arrástralo con el dedo.
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
