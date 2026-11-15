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
export type EventType = 'social' | 'corporate' | 'educational' | 'entertainment'
export type RsvpStatus = 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'WAITLIST'
export type StaffStatus = 'active' | 'invited'

export interface EventStaffMember {
  staffId: string
  name: string
  email: string
  status: StaffStatus
  assignedAt: string
}

export interface InviteStaffResult {
  staffId: string
  name: string
  email: string
  status: 'invited' | 'assigned'
}

export interface PlannerEvent {
  id: string
  ownerId: string
  name: string
  description: string | null
  location: string | null
  venueName: string | null
  latitude: number | null
  longitude: number | null
  startsAt: string
  endsAt: string
  capacity: number
  rsvpDeadline: string | null
  plan: EventPlan
  status: EventStatus
  type: EventType
  hasTables: boolean
  tableCount: number | null
  defaultMaxCompanions: number
  hasZones: boolean
  zones: string | null
  logo: string | null
  guestCount?: number
  confirmedCount?: number
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
  tableNumber: number | null
  zone: string | null
  notes: string | null
  inviteSentAt: string | null
  createdAt: string
  pass: PassView | null
}

export interface PassQrView {
  guestName: string
  eventName: string
  eventType: EventType
  logo: string | null
  tableNumber: number | null
  maxCompanions: number
  zone: string | null
  companionsConfirmed: number
  qrDataUrl: string
  shareUrl: string
  rsvpStatus: string
}

export interface RsvpView {
  pass: {
    id: string
    rsvpStatus: RsvpStatus
    companionsConfirmed: number
    rsvpAt: string | null
    qrToken: string | null
  }
  guest: {
    id: string
    name: string
    maxCompanions: number
  }
  event: {
    id: string
    name: string
    description: string | null
    location: string | null
    venueName: string | null
    latitude: number | null
    longitude: number | null
    startsAt: string
    endsAt: string
    capacity: number
    rsvpDeadline: string | null
    status: EventStatus
    logo: string | null
  }
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
  venue_name?: string
  latitude?: number | null
  longitude?: number | null
  starts_at: string
  ends_at?: string
  capacity?: number
  plan?: EventPlan
  type?: EventType
  has_tables?: boolean
  table_count?: number
  default_max_companions?: number
  has_zones?: boolean
  zones?: string
  logo?: string | null
}

export interface CreateGuestInput {
  name: string
  phone?: string
  email?: string
  max_companions?: number
  table_number?: number
  zone?: string
  notes?: string
  send_invite?: boolean
}
