import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import { create } from 'zustand'
import type { AuthUser, Session } from '../lib/types'

const webStorage = {
  async getItemAsync(key: string): Promise<string | null> {
    if (typeof localStorage === 'undefined') return null
    return localStorage.getItem(key)
  },
  async setItemAsync(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value)
  },
  async deleteItemAsync(key: string): Promise<void> {
    localStorage.removeItem(key)
  },
}

const storage = Platform.OS === 'web' ? webStorage : SecureStore

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
  await storage.setItemAsync(ACCESS_KEY, session.accessToken)
  await storage.setItemAsync(REFRESH_KEY, session.refreshToken)
  await storage.setItemAsync(USER_KEY, JSON.stringify(session.user))
  useAuthStore.getState().setSession(session)
}

export async function clearPersistedSession(): Promise<void> {
  await storage.deleteItemAsync(ACCESS_KEY)
  await storage.deleteItemAsync(REFRESH_KEY)
  await storage.deleteItemAsync(USER_KEY)
  useAuthStore.getState().clear()
}

export async function hydrateSession(): Promise<void> {
  try {
    const accessToken = await storage.getItemAsync(ACCESS_KEY)
    const refreshToken = await storage.getItemAsync(REFRESH_KEY)
    const rawUser = await storage.getItemAsync(USER_KEY)
    const user = rawUser ? (JSON.parse(rawUser) as AuthUser) : null
    if (accessToken && refreshToken && user) {
      useAuthStore.getState().setSession({ accessToken, refreshToken, user })
    }
  } finally {
    useAuthStore.getState().markHydrated()
  }
}
