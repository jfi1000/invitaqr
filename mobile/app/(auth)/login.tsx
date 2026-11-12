import { Link, useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../hooks/useAuth'
import { apiErrorMessage } from '../../lib/api'

export default function LoginScreen() {
  const { login } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit() {
    setError(null)
    setBusy(true)
    try {
      await login(email.trim(), password)
      router.replace('/(planner)')
    } catch (caught) {
      const staffMessage =
        caught instanceof Error && caught.message.includes('organizadores')
          ? caught.message
          : null
      setError(staffMessage ?? apiErrorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-paper px-6">
      <View className="flex-1 justify-center">
        <Text className="text-5xl font-bold text-ink" style={{ fontFamily: 'Inter_700Bold' }}>
          InvitaQR
        </Text>
        <Text className="mt-2 text-lg text-stone-600">Entra para organizar tu evento</Text>
        <TextInput
          className="mt-8 rounded-2xl border border-line bg-white px-4 py-4 text-lg text-ink"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="Correo"
          placeholderTextColor="#8a8175"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          className="mt-3 rounded-2xl border border-line bg-white px-4 py-4 text-lg text-ink"
          secureTextEntry
          placeholder="Contraseña"
          placeholderTextColor="#8a8175"
          value={password}
          onChangeText={setPassword}
        />
        {error ? <Text className="mt-3 text-base text-red-700">{error}</Text> : null}
        <Pressable
          className="mt-6 items-center rounded-2xl bg-ink py-4 active:opacity-80"
          disabled={busy}
          onPress={() => void handleSubmit()}
        >
          <Text className="text-lg font-bold text-white">{busy ? 'Entrando…' : 'Entrar'}</Text>
        </Pressable>
        <Link href="/(auth)/register" className="mt-6 text-center text-base font-bold text-ink">
          Crear cuenta
        </Link>
      </View>
    </SafeAreaView>
  )
}
