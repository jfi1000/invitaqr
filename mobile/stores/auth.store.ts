import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'
import type { AuthUser, Session } from '../lib/types'

const ACCESS_KEY = 'invitaqr.access'
const REFRESH_KEY = 'invitaqr.refresh'
const USER_KEY = 'invitaqr.user'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  hydrated: boolean
  setSession: (session: Session) => void
  clear: () => void
  markHydrated: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  hydrated: false,
  setSession: (session) =>
    set({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: session.user,
      isAuthenticated: true,
    }),
  clear: () =>
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    }),
  markHydrated: () => set({ hydrated: true }),
}))

export async function persistSession(session: Session): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_KEY, session.accessToken)
  await SecureStore.setItemAsync(REFRESH_KEY, session.refreshToken)
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(session.user))
  useAuthStore.getState().setSession(session)
}

export async function clearPersistedSession(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_KEY)
  await SecureStore.deleteItemAsync(REFRESH_KEY)
  await SecureStore.deleteItemAsync(USER_KEY)
  useAuthStore.getState().clear()
}

export async function hydrateSession(): Promise<void> {
  try {
    const accessToken = await SecureStore.getItemAsync(ACCESS_KEY)
    const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY)
    const rawUser = await SecureStore.getItemAsync(USER_KEY)
    const user = rawUser ? (JSON.parse(rawUser) as AuthUser) : null
    if (accessToken && refreshToken && user) {
      useAuthStore.getState().setSession({ accessToken, refreshToken, user })
    }
  } finally {
    useAuthStore.getState().markHydrated()
  }
}
