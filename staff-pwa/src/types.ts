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

export interface StaffEventSummary {
  id: string
  name: string
  date: string
  location: string | null
  venueName: string | null
  status: string
  logo: string | null
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
  guestCount?: number
  tableNumber?: number | null
}

export type ResultTone = 'ok' | 'denied' | 'warning'
