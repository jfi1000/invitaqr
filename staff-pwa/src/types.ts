export type UserRole = 'OWNER' | 'PLANNER' | 'STAFF'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
}

export interface Session {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export type ScanResult =
  | 'OK'
  | 'ALREADY_USED'
  | 'INVALID_TOKEN'
  | 'EXPIRED'
  | 'WRONG_EVENT'
  | 'EVENT_INACTIVE'
  | 'OUT_OF_SCHEDULE'
  | 'NOT_CONFIRMED'

export interface ScanResponse {
  result: ScanResult
  guestName?: string
  companions?: number
}

export type ResultTone = 'ok' | 'denied' | 'warning'
