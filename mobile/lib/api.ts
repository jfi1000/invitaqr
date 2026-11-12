import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import Constants from 'expo-constants'
import { clearPersistedSession, persistSession, useAuthStore } from '../stores/auth.store'
import type {
  AuthUser,
  CreateEventInput,
  CreateGuestInput,
  GuestView,
  ImportResult,
  PlannerEvent,
  Session,
} from './types'

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL
  const fromExtra = Constants.expoConfig?.extra?.apiUrl as string | undefined
  return (fromEnv || fromExtra || 'http://localhost:3000').replace(/\/$/, '')
}

export const api = axios.create({
  baseURL: resolveApiUrl(),
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
      `${resolveApiUrl()}/auth/refresh`,
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

export async function changeEventStatus(
  id: string,
  status: PlannerEvent['status'],
): Promise<PlannerEvent> {
  const response = await api.patch<{ data: PlannerEvent }>(`/events/${id}/status`, { status })
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

export async function importGuestText(eventId: string, text: string): Promise<ImportResult> {
  const response = await api.post<{ data: ImportResult }>(
    `/events/${eventId}/guests/import-text`,
    { text },
  )
  return unwrap(response.data)
}

export async function importGuestCsv(
  eventId: string,
  file: { uri: string; name: string; mimeType?: string | null },
): Promise<ImportResult> {
  const body = new FormData()
  body.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType || 'text/csv',
  } as unknown as Blob)
  const response = await api.post<{ data: ImportResult }>(
    `/events/${eventId}/guests/import-csv`,
    body,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return unwrap(response.data)
}
