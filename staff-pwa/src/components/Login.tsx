import { FormEvent, useState } from 'react'
import { ApiError, getMyEvents, login } from '../api'
import type { Session, StaffEventSummary } from '../types'
import { BrandMark } from './BrandMark'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function formatEventDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Fecha por confirmar'
  return date.toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

interface LoginProps {
  notice?: string
  onSuccess: (session: Session, event: StaffEventSummary | string) => void
}

export function Login({ notice, onSuccess }: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [eventId, setEventId] = useState('')
  const [session, setSession] = useState<Session | null>(null)
  const [events, setEvents] = useState<StaffEventSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const nextSession = await login(email.trim(), password)
      if (nextSession.user.role !== 'STAFF' && nextSession.user.role !== 'OWNER') {
        setError('Esta app es solo para personal de acceso')
        return
      }

      if (nextSession.user.role === 'OWNER') {
        setSession(nextSession)
        setEvents(null)
        return
      }

      const assigned = await getMyEvents(nextSession.accessToken)
      if (assigned.length === 0) {
        setError('No tienes eventos asignados')
        setSession(null)
        setEvents([])
        return
      }
      if (assigned.length === 1) {
        onSuccess(nextSession, assigned[0])
        return
      }
      setSession(nextSession)
      setEvents(assigned)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo iniciar sesión')
    } finally {
      setBusy(false)
    }
  }

  function enterOwnerEvent(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!session) return
    const nextEventId = eventId.trim()
    if (!UUID_PATTERN.test(nextEventId)) {
      setError('El identificador del evento no es válido')
      return
    }
    onSuccess(session, nextEventId)
  }

  if (session?.user.role === 'OWNER') {
    return (
      <main className="screen">
        <BrandMark />
        <p className="eyebrow">Owner</p>
        <h1>Elige el evento</h1>
        <p className="lead">Ingresa el ID del evento a escanear</p>
        {notice ? <p className="notice">{notice}</p> : null}
        <form className="login-form" onSubmit={enterOwnerEvent}>
          <label>
            ID del evento
            <input
              type="text"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={eventId}
              onChange={(event) => setEventId(event.target.value)}
              required
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit">Entrar al evento</button>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              setSession(null)
              setEventId('')
              setError(null)
            }}
          >
            Usar otra cuenta
          </button>
        </form>
      </main>
    )
  }

  if (session && events && events.length > 0) {
    return (
      <main className="screen">
        <BrandMark />
        <p className="eyebrow">Acceso</p>
        <h1>Tus eventos</h1>
        <p className="lead">Elige el evento a escanear</p>
        <div className="event-list">
          {events.map((item) => (
            <button
              key={item.id}
              type="button"
              className="event-card"
              onClick={() => onSuccess(session, item)}
            >
              <strong>{item.name}</strong>
              <span>
                {formatEventDate(item.date)}
              </span>
              <span>{item.venueName || item.location || 'Sin lugar'}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            setSession(null)
            setEvents(null)
            setError(null)
          }}
        >
          Usar otra cuenta
        </button>
      </main>
    )
  }

  return (
    <main className="screen">
      <BrandMark />
      <p className="eyebrow">InvitaQR</p>
      <h1>Acceso del personal</h1>
      <p className="lead">Entra para escanear pases en puerta</p>
      {notice ? <p className="notice">{notice}</p> : null}
      <form className="login-form" onSubmit={handleSubmit}>
        <label>
          Correo
          <input
            type="email"
            autoComplete="username"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            minLength={8}
            maxLength={72}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button type="submit" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
