import { Link, useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { AuthFrame } from '../../components/AuthFrame'
import { useAuth } from '../../hooks/useAuth'
import { apiErrorMessage } from '../../lib/api'

export default function LoginScreen() {
  const { login } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
    <AuthFrame>
      <Text
        className="text-center text-3xl text-inkwell"
        style={{ fontFamily: 'Inter_600SemiBold', letterSpacing: -0.6 }}
      >
        Bienvenido
      </Text>
      <Text className="mb-6 mt-2 text-center text-base text-inkwell/70">
        Entra para organizar tu evento
      </Text>
      <TextInput
        className="rounded-full bg-mist px-5 py-4 text-base text-inkwell"
        style={{ fontFamily: 'Inter_500Medium' }}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="Correo"
        placeholderTextColor="#8d86a6"
        value={email}
        onChangeText={setEmail}
      />
      <View className="mt-3 justify-center">
        <TextInput
          className="rounded-full bg-mist px-5 py-4 pr-16 text-base text-inkwell"
          style={{ fontFamily: 'Inter_500Medium' }}
          secureTextEntry={!showPassword}
          placeholder="Contraseña"
          placeholderTextColor="#8d86a6"
          value={password}
          onChangeText={setPassword}
        />
        <Pressable
          className="absolute right-4 py-4"
          onPress={() => setShowPassword((current) => !current)}
        >
          <Text className="text-sm text-indigo" style={{ fontFamily: 'Inter_600SemiBold' }}>
            {showPassword ? 'Ocultar' : 'Ver'}
          </Text>
        </Pressable>
      </View>
      {error ? <Text className="mt-3 text-center text-sm text-red-700">{error}</Text> : null}
      <Pressable
        className="mt-6 items-center rounded-full bg-indigo py-4 active:opacity-80"
        disabled={busy}
        onPress={() => void handleSubmit()}
      >
        <Text className="text-base text-white" style={{ fontFamily: 'Inter_600SemiBold' }}>
          {busy ? 'Entrando…' : 'Entrar'}
        </Text>
      </Pressable>
      <Link href="/(auth)/register" className="mt-6 text-center text-sm text-inkwell/70">
        ¿Aún no tienes cuenta? <Text className="text-indigo" style={{ fontFamily: 'Inter_600SemiBold' }}>Crear cuenta</Text>
      </Link>
    </AuthFrame>
  )
}
