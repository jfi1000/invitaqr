import type { ScanResponse, Session, StaffEventSummary } from './types'

export class ApiError extends Error {
  status: number
  code?: string

  constructor(status: number, message: string, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export function isSessionAborted(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'STALE_SESSION'
}

const ACCESS_KEY = 'invitaqr_access_token'
const REFRESH_KEY = 'invitaqr_refresh_token'

type SessionListener = (accessToken: string | null) => void

let sessionListener: SessionListener | null = null
let refreshInFlight: Promise<string | null> | null = null
let sessionEpoch = 0

export function bindSessionListener(listener: SessionListener | null) {
  sessionListener = listener
}

export function readAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY)
}

export function persistSessionTokens(accessToken: string, refreshToken: string) {
  sessionEpoch += 1
  localStorage.setItem(ACCESS_KEY, accessToken)
  localStorage.setItem(REFRESH_KEY, refreshToken)
  sessionListener?.(accessToken)
}

export function clearSessionTokens() {
  sessionEpoch += 1
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  sessionListener?.(null)
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== ACCESS_KEY && event.key !== REFRESH_KEY && event.key !== null) {
      return
    }
    sessionListener?.(localStorage.getItem(ACCESS_KEY))
  })
}

function baseUrl(): string {
  const configured = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, '')
  if (configured) return configured
  if (import.meta.env.DEV) return '/api'
  throw new ApiError(0, 'Falta configurar VITE_API_URL')
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${baseUrl()}${path}`, init)
  } catch {
    throw new ApiError(0, 'No hay conexión con el servidor')
  }

  const body = (await response.json().catch(() => null)) as
    | { data?: T; message?: string; error?: string }
    | null

  if (!response.ok || body?.data == null) {
    throw new ApiError(
      response.status,
      body?.message ?? 'No se pudo completar la solicitud',
      body?.error,
    )
  }

  return body.data
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight

  const epochAtStart = sessionEpoch
  const refreshToken = localStorage.getItem(REFRESH_KEY)

  const promise = (async () => {
    if (!refreshToken) {
      if (sessionEpoch === epochAtStart) clearSessionTokens()
      return null
    }
    try {
      const session = await request<Session>('/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      const storedRefresh = localStorage.getItem(REFRESH_KEY)
      if (sessionEpoch !== epochAtStart || storedRefresh !== refreshToken) {
        if (sessionEpoch !== epochAtStart) {
          throw new ApiError(0, 'La sesión cambió', 'STALE_SESSION')
        }
        return localStorage.getItem(ACCESS_KEY)
      }
      persistSessionTokens(session.accessToken, session.refreshToken)
      return session.accessToken
    } catch (caught) {
      if (isSessionAborted(caught)) throw caught
      if (
        sessionEpoch !== epochAtStart ||
        localStorage.getItem(REFRESH_KEY) !== refreshToken
      ) {
        throw new ApiError(0, 'La sesión cambió', 'STALE_SESSION')
      }
      if (caught instanceof ApiError && caught.status === 401) {
        clearSessionTokens()
        return null
      }
      if (caught instanceof ApiError) throw caught
      throw new ApiError(0, 'No hay conexión con el servidor')
    }
  })()

  refreshInFlight = promise
  void promise.finally(() => {
    if (refreshInFlight === promise) refreshInFlight = null
  })
  return promise
}

async function authRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const run = (token: string) => {
    const headers = new Headers(init.headers)
    headers.set('Authorization', `Bearer ${token}`)
    return request<T>(path, { ...init, headers })
  }

  let token = localStorage.getItem(ACCESS_KEY)
  if (!token) {
    token = await refreshAccessToken()
    if (!token) {
      throw new ApiError(401, 'La sesión expiró. Vuelve a entrar')
    }
  }

  try {
    return await run(token)
  } catch (caught) {
    if (isSessionAborted(caught)) throw caught
    if (!(caught instanceof ApiError) || caught.status !== 401) {
      throw caught
    }
    const next = await refreshAccessToken()
    if (!next) {
      throw new ApiError(401, 'La sesión expiró. Vuelve a entrar')
    }
    return run(next)
  }
}

export function login(email: string, password: string): Promise<Session> {
  return request<Session>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
}

export function getMyEvents(accessToken: string): Promise<StaffEventSummary[]> {
  return request<StaffEventSummary[]>('/staff/my-events', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export function getStaffEvent(eventId: string): Promise<StaffEventSummary> {
  return authRequest<StaffEventSummary>(`/staff/events/${eventId}`)
}

export function getStaffInviteStatus(
  token: string,
): Promise<{ status: 'valid' | 'expired' | 'unavailable' }> {
  return request<{ status: 'valid' | 'expired' | 'unavailable' }>(
    `/auth/staff/invite-status?token=${encodeURIComponent(token.trim())}`,
    { headers: { Accept: 'application/json' } },
  )
}

export function setStaffPassword(
  inviteToken: string,
  password: string,
): Promise<{ success: true }> {
  return request<{ success: true }>('/auth/staff/set-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inviteToken: inviteToken.trim(), password }),
  })
}

export function scanQr(qrToken: string, eventId: string): Promise<ScanResponse> {
  return authRequest<ScanResponse>('/scanner/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qrToken, eventId }),
  })
}
