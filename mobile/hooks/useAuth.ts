import { clearPersistedSession, hydrateSession, persistSession } from '../stores/auth.store'
import { login as loginRequest, register as registerRequest } from '../lib/api'
import { queryClient } from '../lib/query'
import type { AuthUser } from '../lib/types'

export function useAuth() {
  async function login(email: string, password: string): Promise<AuthUser> {
    const session = await loginRequest(email, password)
    if (session.user.role === 'STAFF') {
      throw new Error('Esta app es para organizadores. El personal entra por el escáner.')
    }
    await persistSession(session)
    return session.user
  }

  async function register(name: string, email: string, password: string): Promise<AuthUser> {
    const session = await registerRequest({ name, email, password })
    await persistSession(session)
    return session.user
  }

  async function logout(): Promise<void> {
    await clearPersistedSession()
    queryClient.clear()
  }

  return { login, register, logout, hydrate: hydrateSession }
}
