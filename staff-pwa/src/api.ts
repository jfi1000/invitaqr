import type { ScanResponse, Session } from './types'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function baseUrl(): string {
  const url = import.meta.env.VITE_API_URL?.replace(/\/$/, '')
  if (!url) {
    throw new ApiError(0, 'Falta configurar VITE_API_URL')
  }
  return url
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${baseUrl()}${path}`, init)
  } catch {
    throw new ApiError(0, 'No hay conexión con el servidor')
  }

  const body = (await response.json().catch(() => null)) as
    | { data?: T; message?: string }
    | null

  if (!response.ok || !body?.data) {
    throw new ApiError(response.status, body?.message ?? 'No se pudo completar la solicitud')
  }

  return body.data
}

export function login(email: string, password: string): Promise<Session> {
  return request<Session>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
}

export function scanQr(
  accessToken: string,
  qrToken: string,
  eventId: string,
): Promise<ScanResponse> {
  return request<ScanResponse>('/scanner/validate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ qrToken, eventId }),
  })
}
