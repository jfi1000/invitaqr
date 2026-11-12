import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../hooks/useAuth'
import { apiErrorMessage, getMe } from '../../lib/api'
import { queryKeys } from '../../lib/query'
import { useAuthStore } from '../../stores/auth.store'
import { StatusBadge } from '../../components/StatusBadge'

export default function ProfileScreen() {
  const storedUser = useAuthStore((state) => state.user)
  const { logout } = useAuth()
  const [busy, setBusy] = useState(false)
  const profile = useQuery({
    queryKey: queryKeys.me,
    queryFn: getMe,
  })
  const user = profile.data ?? storedUser

  return (
    <SafeAreaView className="flex-1 bg-paper px-5">
      <Text className="mt-2 text-4xl font-bold text-ink" style={{ fontFamily: 'Inter_700Bold' }}>
        Perfil
      </Text>
      {profile.isError ? (
        <Text className="mt-4 text-base text-red-700">{apiErrorMessage(profile.error)}</Text>
      ) : null}
      <View className="mt-6 rounded-3xl border border-line bg-card p-5">
        <Text className="text-2xl font-bold text-ink">{user?.name ?? 'Organizador'}</Text>
        <Text className="mt-2 text-lg text-stone-600">{user?.email}</Text>
        <View className="mt-4 self-start">
          {user ? <StatusBadge value={user.role} /> : null}
        </View>
      </View>
      <Pressable
        className="mt-8 items-center rounded-2xl border border-ink py-4"
        disabled={busy}
        onPress={() => {
          setBusy(true)
          void logout().finally(() => setBusy(false))
        }}
      >
        <Text className="text-lg font-bold text-ink">{busy ? 'Saliendo…' : 'Cerrar sesión'}</Text>
      </Pressable>
    </SafeAreaView>
  )
}
