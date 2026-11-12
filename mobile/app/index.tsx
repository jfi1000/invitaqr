import { Redirect } from 'expo-router'
import { useAuthStore } from '../stores/auth.store'

export default function Index() {
  const hydrated = useAuthStore((state) => state.hydrated)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  if (!hydrated) return null
  return <Redirect href={isAuthenticated ? '/(planner)' : '/(auth)/login'} />
}
