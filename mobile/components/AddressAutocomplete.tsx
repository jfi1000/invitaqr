import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'

export interface PhotonFeature {
  label: string
  fullLabel: string
  latitude: number
  longitude: number
}

interface AddressAutocompleteProps {
  value: string
  onChangeText: (text: string) => void
  onSelect: (feature: PhotonFeature) => void
  placeholder?: string
  inputClassName?: string
}

interface PhotonHit {
  geometry: { coordinates: [number, number] }
  properties: {
    name?: string
    street?: string
    housenumber?: string
    city?: string
    state?: string
    country?: string
    countrycode?: string
  }
}

const PHOTON_URL = 'https://photon.komoot.io/api/'
const MX_BBOX = '-118.4,14.5,-86.7,32.7'

function inMexico(properties: PhotonHit['properties']): boolean {
  const country = (properties.country ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
  return properties.countrycode === 'MX' || country.includes('mexico')
}

function toFeature(hit: PhotonHit): PhotonFeature | null {
  const place = hit.properties
  const [longitude, latitude] = hit.geometry.coordinates
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  const street = [place.street, place.housenumber].filter(Boolean).join(' ')
  const primary = place.name || street
  if (!primary) return null
  const parts = [primary, place.city, place.state].filter(
    (part, index, all): part is string => Boolean(part) && all.indexOf(part) === index,
  )
  return {
    label: primary,
    fullLabel: parts.join(', '),
    latitude,
    longitude,
  }
}

export function AddressAutocomplete({
  value,
  onChangeText,
  onSelect,
  placeholder = 'Av. Independencia 100, Xalapa, Veracruz',
  inputClassName,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<PhotonFeature[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const selectedLabel = useRef<string | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (selectedLabel.current !== null) {
      const picked = selectedLabel.current === value
      selectedLabel.current = null
      if (picked) return
    }
    if (value.trim().length < 4) {
      setSuggestions([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(() => {
      void fetchSuggestions(value)
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [value])

  async function fetchSuggestions(query: string) {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        q: query,
        limit: '5',
        lang: 'default',
        bbox: MX_BBOX,
      })
      const response = await fetch(`${PHOTON_URL}?${params.toString()}`, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'InvitaQR/1.0',
        },
      })
      if (!response.ok) return
      const data = (await response.json()) as { features?: PhotonHit[] }
      const hits = (data.features ?? [])
        .filter((feature) => inMexico(feature.properties))
        .map(toFeature)
        .filter((feature): feature is PhotonFeature => feature !== null)
      setSuggestions(hits)
      setOpen(hits.length > 0)
    } catch {
      setSuggestions([])
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  function handleSelect(item: PhotonFeature) {
    selectedLabel.current = item.fullLabel
    onChangeText(item.fullLabel)
    setSuggestions([])
    setOpen(false)
    onSelect(item)
  }

  const inputStyle =
    inputClassName ??
    'rounded-2xl border border-line bg-white px-4 py-4 text-base text-inkwell'

  return (
    <View>
      <View>
        <TextInput
          className={inputStyle}
          style={{ fontFamily: 'Inter_500Medium', color: '#111111', paddingRight: 36 }}
          placeholder={placeholder}
          placeholderTextColor="#8d86a6"
          value={value}
          onChangeText={onChangeText}
          autoCorrect={false}
          autoCapitalize="words"
        />
        {loading ? (
          <ActivityIndicator
            size="small"
            color="#4334d6"
            style={{ position: 'absolute', right: 14, top: 18 }}
          />
        ) : null}
      </View>

      {open && suggestions.length > 0 ? (
        <View
          style={{
            marginTop: 4,
            backgroundColor: '#ffffff',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#e6e2f2',
            overflow: 'hidden',
          }}
        >
          {suggestions.map((item) => (
            <Pressable
              key={`${item.latitude}-${item.longitude}-${item.fullLabel}`}
              onPress={() => handleSelect(item)}
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: '#f0eef8',
                backgroundColor: pressed ? '#f5f3ff' : '#ffffff',
              })}
            >
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#1a1033' }}>
                {item.label}
              </Text>
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 12,
                  color: '#5c5670',
                  marginTop: 2,
                }}
              >
                {item.fullLabel}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  )
}
