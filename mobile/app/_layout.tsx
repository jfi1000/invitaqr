import 'react-native-gesture-handler'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter'
import { Oswald_500Medium, Oswald_600SemiBold } from '@expo-google-fonts/oswald'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { QueryClientProvider } from '@tanstack/react-query'
import { hydrateSession } from '../stores/auth.store'
import { useAuthStore } from '../stores/auth.store'
import { queryClient } from '../lib/query'
import '../global.css'

SplashScreen.preventAutoHideAsync().catch(() => undefined)

function AuthGate() {
  const hydrated = useAuthStore((state) => state.hydrated)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (!hydrated) return
    const inAuth = segments[0] === '(auth)'
    const inPublicRsvp = segments[0] === 'rsvp'
    if (!isAuthenticated && !inAuth && !inPublicRsvp) {
      router.replace('/(auth)/login')
    } else if (isAuthenticated && inAuth) {
      router.replace('/(planner)')
    }
  }, [hydrated, isAuthenticated, segments, router])

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(planner)" />
      <Stack.Screen name="rsvp/[token]" />
    </Stack>
  )
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Oswald_500Medium,
    Oswald_600SemiBold,
  })
  const fontsReady = fontsLoaded || Boolean(fontError)
  const hydrated = useAuthStore((state) => state.hydrated)

  useEffect(() => {
    void hydrateSession()
  }, [])

  useEffect(() => {
    if (fontsReady && hydrated) {
      SplashScreen.hideAsync().catch(() => undefined)
    }
  }, [fontsReady, hydrated])

  if (!fontsReady || !hydrated) {
    return null
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <AuthGate />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
