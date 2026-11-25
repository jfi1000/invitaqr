import { useEffect, useMemo, useState } from 'react'
import {
  bindSessionListener,
  clearSessionTokens,
  persistSessionTokens,
  readAccessToken,
} from './api'
import { Login } from './components/Login'
import { Scanner } from './components/Scanner'
import { SetPassword } from './components/SetPassword'
import type { Session, StaffEventSummary } from './types'

const EVENT_KEY = 'invitaqr_event_id'
const EVENT_META_KEY = 'invitaqr_event_meta'

function readPath(): string {
  if (typeof window === 'undefined') return '/'
  return window.location.pathname.replace(/\/$/, '') || '/'
}

function readInviteToken(): string | null {
  if (typeof window === 'undefined') return null
  const token = new URLSearchParams(window.location.search).get('token')?.trim()
  return token || null
}

function readEventMeta(): StaffEventSummary | null {
  try {
    const raw = localStorage.getItem(EVENT_META_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StaffEventSummary
  } catch {
    return null
  }
}

export function App() {
  const [path, setPath] = useState(readPath)
  const inviteToken = useMemo(() => readInviteToken(), [path])
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    readAccessToken(),
  )
  const [eventId, setEventId] = useState<string | null>(() =>
    localStorage.getItem(EVENT_KEY),
  )
  const [eventMeta, setEventMeta] = useState<StaffEventSummary | null>(() =>
    readEventMeta(),
  )
  const [notice, setNotice] = useState<string | undefined>(undefined)

  useEffect(() => {
    bindSessionListener((token) => {
      setAccessToken(token)
      if (!token) {
        setEventId(null)
        setEventMeta(null)
        localStorage.removeItem(EVENT_KEY)
        localStorage.removeItem(EVENT_META_KEY)
      }
    })
    return () => bindSessionListener(null)
  }, [])

  function goHome(message?: string) {
    window.history.replaceState({}, '', '/')
    setPath('/')
    setNotice(message)
  }

  function enter(session: Session, event: StaffEventSummary | string) {
    const summary =
      typeof event === 'string'
        ? ({
            id: event,
            name: '',
            date: '',
            location: null,
            venueName: null,
            status: '',
            logo: null,
          } satisfies StaffEventSummary)
        : event

    persistSessionTokens(session.accessToken, session.refreshToken)
    localStorage.setItem(EVENT_KEY, summary.id)
    localStorage.setItem(EVENT_META_KEY, JSON.stringify(summary))
    setAccessToken(session.accessToken)
    setEventId(summary.id)
    setEventMeta(summary)
    setNotice(undefined)
  }

  function rememberEvent(summary: StaffEventSummary) {
    localStorage.setItem(EVENT_KEY, summary.id)
    localStorage.setItem(EVENT_META_KEY, JSON.stringify(summary))
    setEventId(summary.id)
    setEventMeta(summary)
  }

  function leave(message?: string) {
    clearSessionTokens()
    localStorage.removeItem(EVENT_KEY)
    localStorage.removeItem(EVENT_META_KEY)
    setAccessToken(null)
    setEventId(null)
    setEventMeta(null)
    setNotice(message)
  }

  if (path === '/set-password') {
    return (
      <SetPassword
        token={inviteToken}
        onDone={(message) => {
          leave()
          goHome(message)
        }}
      />
    )
  }

  if (!accessToken || !eventId) {
    return <Login notice={notice} onSuccess={enter} />
  }

  return (
    <Scanner
      eventId={eventId}
      event={eventMeta}
      onLogout={() => leave()}
      onSessionExpired={() => leave('La sesión expiró. Vuelve a entrar')}
      onEvent={rememberEvent}
    />
  )
}
