import { useState } from 'react'
import { Login } from './components/Login'
import { Scanner } from './components/Scanner'
import type { Session } from './types'

const TOKEN_KEY = 'invitaqr_access_token'
const EVENT_KEY = 'invitaqr_event_id'

export function App() {
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY),
  )
  const [eventId, setEventId] = useState<string | null>(() =>
    localStorage.getItem(EVENT_KEY),
  )
  const [notice, setNotice] = useState<string | undefined>(undefined)

  function enter(session: Session, nextEventId: string) {
    localStorage.setItem(TOKEN_KEY, session.accessToken)
    localStorage.setItem(EVENT_KEY, nextEventId)
    setAccessToken(session.accessToken)
    setEventId(nextEventId)
    setNotice(undefined)
  }

  function leave(message?: string) {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(EVENT_KEY)
    setAccessToken(null)
    setEventId(null)
    setNotice(message)
  }

  if (!accessToken || !eventId) {
    return <Login notice={notice} onSuccess={enter} />
  }

  return (
    <Scanner
      accessToken={accessToken}
      eventId={eventId}
      onLogout={() => leave()}
      onSessionExpired={() => leave('La sesión expiró. Vuelve a entrar')}
    />
  )
}
