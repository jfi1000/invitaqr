import { FormEvent, useState } from 'react'
import { ApiError, login } from '../api'
import type { Session } from '../types'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface LoginProps {
  notice?: string
  onSuccess: (session: Session, eventId: string) => void
}

export function Login({ notice, onSuccess }: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [eventId, setEventId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const nextEventId = eventId.trim()
    if (!UUID_PATTERN.test(nextEventId)) {
      setError('El identificador del evento no es válido')
      return
    }

    setBusy(true)
    try {
      const session = await login(email.trim(), password)
      if (session.user.role !== 'STAFF' && session.user.role !== 'OWNER') {
        setError('Esta app es solo para personal de acceso')
        return
      }
      onSuccess(session, nextEventId)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo iniciar sesión')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="screen">
      <h1>InvitaQR</h1>
      <p className="lead">Acceso del personal</p>
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
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
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
        <button type="submit" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
