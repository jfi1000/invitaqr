import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { clearPersistedSession, persistSession, useAuthStore } from '../stores/auth.store'
import type {
  AuthUser,
  CreateEventInput,
  CreateGuestInput,
  GuestView,
  ImportResult,
  PlannerEvent,
  RsvpView,
  Session,
} from './types'

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
)

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

function isAuthPath(url: string | undefined): boolean {
  return (
    !!url &&
    (url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh'))
  )
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token && !isAuthPath(config.url)) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = useAuthStore.getState().refreshToken
  if (!refreshToken) return null
  try {
    const response = await axios.post<{ data: Session }>(
      `${API_URL}/auth/refresh`,
      { refreshToken },
    )
    const session = response.data.data
    await persistSession(session)
    return session.accessToken
  } catch {
    return null
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined
    if (!original || error.response?.status !== 401 || original._retry || isAuthPath(original.url)) {
      return Promise.reject(error)
    }
    original._retry = true
    refreshPromise ??= refreshAccessToken().finally(() => {
      refreshPromise = null
    })
    const nextToken = await refreshPromise
    if (!nextToken) {
      await clearPersistedSession()
      return Promise.reject(error)
    }
    original.headers.Authorization = `Bearer ${nextToken}`
    return api(original)
  },
)

function unwrap<T>(payload: { data: T }): T {
  return payload.data
}

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)?.message
    if (message) return message
    if (!error.response) return 'No hay conexión con el servidor'
  }
  return 'No se pudo completar la solicitud'
}

export async function login(email: string, password: string): Promise<Session> {
  const response = await api.post<{ data: Session }>('/auth/login', { email, password })
  return unwrap(response.data)
}

export async function register(input: {
  name: string
  email: string
  password: string
}): Promise<Session> {
  const response = await api.post<{ data: Session }>('/auth/register', input)
  return unwrap(response.data)
}

export async function getMe(): Promise<AuthUser> {
  const response = await api.get<{ data: AuthUser }>('/users/me')
  return unwrap(response.data)
}

export async function getEvents(): Promise<PlannerEvent[]> {
  const response = await api.get<{ data: PlannerEvent[] }>('/events')
  return unwrap(response.data)
}

export async function getEvent(id: string): Promise<PlannerEvent> {
  const response = await api.get<{ data: PlannerEvent }>(`/events/${id}`)
  return unwrap(response.data)
}

export async function createEvent(input: CreateEventInput): Promise<PlannerEvent> {
  const response = await api.post<{ data: PlannerEvent }>('/events', input)
  return unwrap(response.data)
}

export async function updateEvent(
  id: string,
  input: Partial<CreateEventInput>,
): Promise<PlannerEvent> {
  const response = await api.patch<{ data: PlannerEvent }>(`/events/${id}`, input)
  return unwrap(response.data)
}

export async function changeEventStatus(
  id: string,
  status: PlannerEvent['status'],
): Promise<PlannerEvent> {
  const response = await api.patch<{ data: PlannerEvent }>(`/events/${id}/status`, { status })
  return unwrap(response.data)
}

export async function ensurePasses(
  eventId: string,
): Promise<{ created: number; guests: GuestView[] }> {
  const response = await api.post<{ data: { created: number; guests: GuestView[] } }>(
    `/events/${eventId}/guests/ensure-passes`,
  )
  return unwrap(response.data)
}

export async function getGuests(eventId: string): Promise<GuestView[]> {
  const response = await api.get<{ data: GuestView[] }>(`/events/${eventId}/guests`)
  return unwrap(response.data)
}

export async function createGuest(
  eventId: string,
  input: CreateGuestInput,
): Promise<GuestView> {
  const response = await api.post<{ data: GuestView }>(`/events/${eventId}/guests`, input)
  return unwrap(response.data)
}

export async function sendGuestInvite(
  eventId: string,
  guestId: string,
): Promise<GuestView> {
  const response = await api.post<{ data: GuestView }>(
    `/events/${eventId}/guests/${guestId}/send-invite`,
  )
  return unwrap(response.data)
}

export async function importGuestText(eventId: string, text: string): Promise<ImportResult> {
  const response = await api.post<{ data: ImportResult }>(
    `/events/${eventId}/guests/import-text`,
    { text },
  )
  return unwrap(response.data)
}

export async function getPassQr(
  eventId: string,
  passId: string,
): Promise<import('./types').PassQrView> {
  const response = await api.get<{ data: import('./types').PassQrView }>(
    `/events/${eventId}/guests/passes/${passId}/qr`,
  )
  return unwrap(response.data)
}

export async function getRsvp(token: string): Promise<RsvpView> {
  const response = await api.get<{ data: RsvpView }>(`/rsvp/${token}`)
  return unwrap(response.data)
}

export async function confirmRsvp(token: string, companions: number): Promise<RsvpView> {
  const response = await api.post<{ data: RsvpView }>(`/rsvp/${token}/confirm`, {
    companions,
  })
  return unwrap(response.data)
}

export async function declineRsvp(token: string): Promise<RsvpView> {
  const response = await api.post<{ data: RsvpView }>(`/rsvp/${token}/decline`, {})
  return unwrap(response.data)
}

export async function importGuestCsv(
  eventId: string,
  file: { uri: string; name: string; mimeType?: string | null; file?: File | Blob },
): Promise<ImportResult> {
  const body = new FormData()
  if (file.file) {
    body.append('file', file.file, file.name)
  } else if (typeof window !== 'undefined' && file.uri.startsWith('blob:')) {
    const blob = await fetch(file.uri).then((response) => response.blob())
    body.append('file', blob, file.name)
  } else {
    body.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || 'text/csv',
    } as unknown as Blob)
  }
  const response = await api.post<{ data: ImportResult }>(
    `/events/${eventId}/guests/import-csv`,
    body,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return unwrap(response.data)
}
