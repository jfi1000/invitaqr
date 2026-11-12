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

export type EventStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'CANCELLED'
export type EventPlan = 'FREE' | 'BASIC' | 'PRO'
export type RsvpStatus = 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'WAITLIST'

export interface PlannerEvent {
  id: string
  ownerId: string
  name: string
  description: string | null
  location: string | null
  startsAt: string
  endsAt: string
  capacity: number
  rsvpDeadline: string | null
  plan: EventPlan
  status: EventStatus
  createdAt: string
  updatedAt: string
}

export interface PassView {
  id: string
  guestId: string
  eventId: string
  rsvpToken: string
  qrToken: string | null
  rsvpStatus: RsvpStatus
  companionsConfirmed: number
  accessedAt: string | null
  accessStatus: 'NOT_ACCESSED' | 'ACCESSED' | 'REJECTED'
  rsvpAt: string | null
}

export interface GuestView {
  id: string
  eventId: string
  name: string
  phone: string | null
  email: string | null
  maxCompanions: number
  notes: string | null
  createdAt: string
  pass: PassView | null
}

export interface ImportResult {
  imported: number
  duplicates: number
  rejected: { line: number; reason: string }[]
  guests: GuestView[]
}

export interface CreateEventInput {
  name: string
  location?: string
  starts_at: string
  ends_at: string
  capacity?: number
  plan?: EventPlan
}

export interface CreateGuestInput {
  name: string
  phone?: string
  email?: string
  max_companions?: number
  notes?: string
}
