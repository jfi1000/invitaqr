export interface GeoPoint {
  latitude: number
  longitude: number
  label?: string
  approximate?: boolean
}

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
)

/** Geocodifica vía API (Nominatim con variantes MX; sin CORS en web). */
export async function geocodeAddress(
  query: string,
  parts?: {
    venueName?: string
    address?: string
    street?: string
    city?: string
    state?: string
  },
): Promise<GeoPoint | null> {
  const params = new URLSearchParams()
  const q = query.trim()
  if (q) params.set('q', q)
  if (parts?.address?.trim()) params.set('address', parts.address.trim())
  if (parts?.venueName?.trim()) params.set('venue', parts.venueName.trim())
  if (parts?.street?.trim()) params.set('street', parts.street.trim())
  if (parts?.city?.trim()) params.set('city', parts.city.trim())
  if (parts?.state?.trim()) params.set('state', parts.state.trim())
  if (![...params.keys()].length) return null

  const response = await fetch(`${API_URL}/geo/search?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    throw new Error('No se pudo buscar la dirección')
  }
  const payload = (await response.json()) as {
    data: {
      latitude: number
      longitude: number
      label?: string
      approximate?: boolean
    } | null
  }
  if (!payload.data) return null
  return {
    latitude: payload.data.latitude,
    longitude: payload.data.longitude,
    label: payload.data.label,
    approximate: payload.data.approximate,
  }
}

export function mapsUrl(point: {
  latitude?: number | null
  longitude?: number | null
  venueName?: string | null
  location?: string | null
}): string {
  if (
    typeof point.latitude === 'number' &&
    typeof point.longitude === 'number' &&
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude)
  ) {
    return `https://www.google.com/maps/search/?api=1&query=${point.latitude},${point.longitude}`
  }
  const q = [point.venueName, point.location].filter(Boolean).join(', ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q || 'México')}`
}

export function formatVenueLine(venueName?: string | null, location?: string | null): string {
  const name = venueName?.trim()
  const address = location?.trim()
  if (name && address) return `${name} · ${address}`
  return name || address || 'Sin lugar'
}
