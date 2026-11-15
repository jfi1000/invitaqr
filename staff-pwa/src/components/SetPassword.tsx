import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, getStaffInviteStatus, setStaffPassword } from '../api'
import { BrandMark } from './BrandMark'

interface SetPasswordProps {
  token: string | null
  onDone: (message: string) => void
}

export function SetPassword({ token, onDone }: SetPasswordProps) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(true)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  const invalidToken = useMemo(() => !token || token.length < 10, [token])

  useEffect(() => {
    let cancelled = false

    async function check() {
      if (invalidToken || !token) {
        onDoneRef.current(
          'Este enlace ya no es válido. Entra con tu correo y contraseña.',
        )
        return
      }
      try {
        const status = await getStaffInviteStatus(token)
        if (cancelled) return
        if (status.status === 'valid') {
          setChecking(false)
          return
        }
        if (status.status === 'expired') {
          onDoneRef.current(
            'El enlace expiró. Pide una nueva invitación o entra si ya activaste tu cuenta.',
          )
          return
        }
        onDoneRef.current(
          'Este enlace ya se usó. Entra con tu correo y contraseña para escanear.',
        )
      } catch {
        if (!cancelled) setChecking(false)
      }
    }

    void check()
    return () => {
      cancelled = true
    }
  }, [invalidToken, token])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (invalidToken || !token) {
      onDone('Este enlace ya se usó. Entra con tu correo y contraseña para escanear.')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }

    setBusy(true)
    try {
      await setStaffPassword(token, password)
      onDone('Contraseña lista. Entra para escanear. También te enviamos el enlace por correo.')
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 400) {
        onDone(
          caught.message.includes('expir')
            ? 'El enlace expiró. Pide una nueva invitación o entra si ya activaste tu cuenta.'
            : 'Este enlace ya se usó. Entra con tu correo y contraseña para escanear.',
        )
        return
      }
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'No se pudo guardar la contraseña',
      )
    } finally {
      setBusy(false)
    }
  }

  if (checking) {
    return (
      <main className="screen">
        <BrandMark />
        <p className="eyebrow">InvitaQR</p>
        <h1>Activar cuenta</h1>
        <p className="lead">Revisando el enlace…</p>
      </main>
    )
  }

  return (
    <main className="screen">
      <BrandMark />
      <p className="eyebrow">InvitaQR</p>
      <h1>Activar cuenta</h1>
      <p className="lead">Elige tu contraseña de acceso</p>
      <form className="login-form" onSubmit={handleSubmit}>
        <label>
          Nueva contraseña
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <label>
          Confirmar contraseña
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            minLength={8}
            onChange={(event) => setConfirm(event.target.value)}
            required
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button type="submit" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar y continuar'}
        </button>
      </form>
    </main>
  )
}
