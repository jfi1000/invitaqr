import { Link, useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text, TextInput } from 'react-native'
import { AuthFrame } from '../../components/AuthFrame'
import { useAuth } from '../../hooks/useAuth'
import { apiErrorMessage } from '../../lib/api'

export default function RegisterScreen() {
  const { register } = useAuth()
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit() {
    setError(null)
    setBusy(true)
    try {
      await register(name.trim(), email.trim(), password)
      router.replace('/(planner)')
    } catch (caught) {
      setError(apiErrorMessage(caught))
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
        Crear cuenta
      </Text>
      <Text className="mb-6 mt-2 text-center text-base text-inkwell/70">
        Quedas como organizador del evento
      </Text>
      <TextInput
        className="rounded-full bg-mist px-5 py-4 text-base text-inkwell"
        style={{ fontFamily: 'Inter_500Medium' }}
        placeholder="Nombre"
        placeholderTextColor="#8d86a6"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        className="mt-3 rounded-full bg-mist px-5 py-4 text-base text-inkwell"
        style={{ fontFamily: 'Inter_500Medium' }}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Correo"
        placeholderTextColor="#8d86a6"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        className="mt-3 rounded-full bg-mist px-5 py-4 text-base text-inkwell"
        style={{ fontFamily: 'Inter_500Medium' }}
        secureTextEntry
        placeholder="Contraseña, mínimo 8"
        placeholderTextColor="#8d86a6"
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text className="mt-3 text-center text-sm text-red-700">{error}</Text> : null}
      <Pressable
        className="mt-6 items-center rounded-full bg-indigo py-4 active:opacity-80"
        disabled={busy}
        onPress={() => void handleSubmit()}
      >
        <Text className="text-base text-white" style={{ fontFamily: 'Inter_600SemiBold' }}>
          {busy ? 'Creando…' : 'Crear cuenta'}
        </Text>
      </Pressable>
      <Link href="/(auth)/login" className="mt-6 text-center text-sm text-inkwell/70">
        Ya tengo cuenta
      </Link>
    </AuthFrame>
  )
}
