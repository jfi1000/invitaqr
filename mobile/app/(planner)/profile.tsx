import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { StatusBadge } from '../../components/StatusBadge'
import { Screen } from '../../components/ui/Screen'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { useAuth } from '../../hooks/useAuth'
import { apiErrorMessage, getMe } from '../../lib/api'
import { queryKeys } from '../../lib/query'
import { type as typography } from '../../lib/typography'
import { useAuthStore } from '../../stores/auth.store'

type MenuIcon = keyof typeof Ionicons.glyphMap

interface MenuItem {
  key: string
  label: string
  icon: MenuIcon
  subtitle?: string
  subtitleAccent?: string
}

const MENU: MenuItem[] = [
  {
    key: 'edit',
    label: 'Editar perfil',
    icon: 'person-outline',
  },
  {
    key: 'billing',
    label: 'Plan y Facturación',
    icon: 'card-outline',
    subtitle: 'Plan: FREE — ',
    subtitleAccent: 'Activo',
  },
  {
    key: 'settings',
    label: 'Configuración',
    icon: 'settings-outline',
  },
  {
    key: 'members',
    label: 'Miembros de la organización',
    icon: 'people-outline',
  },
  {
    key: 'support',
    label: 'Soporte y Ayuda',
    icon: 'chatbubble-ellipses-outline',
  },
  {
    key: 'terms',
    label: 'Términos y Privacidad',
    icon: 'document-text-outline',
  },
]

function soon() {
  Alert.alert('Próximamente', 'Esta opción estará disponible pronto.')
}

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
    <Screen>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="Perfil"
          eyebrow="Cuenta"
          subtitle="Datos de tu organización"
          showBack={false}
        />
        {profile.isError ? (
          <Text className="mt-2 text-base text-red-700">{apiErrorMessage(profile.error)}</Text>
        ) : null}

        <View className="mt-2 rounded-[28px] border border-line bg-card p-5">
          <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-indigo">
            <Text className="text-xl text-white" style={{ fontFamily: 'Inter_700Bold' }}>
              {(user?.name ?? 'O').slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <Text style={typography.title}>{user?.name ?? 'Organizador'}</Text>
          <Text style={[typography.body, { marginTop: 8 }]}>{user?.email}</Text>
          <View className="mt-4 self-start">
            {user ? <StatusBadge value={user.role} /> : null}
          </View>
        </View>

        <View className="mt-4 gap-2">
          {MENU.map((item) => (
            <Pressable
              key={item.key}
              onPress={soon}
              className="flex-row items-center rounded-2xl border border-line bg-card px-4 py-4 active:opacity-80"
            >
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-mist">
                <Ionicons name={item.icon} size={20} color="#4334d6" />
              </View>
              <View className="flex-1">
                <Text style={typography.section}>{item.label}</Text>
                {item.subtitle ? (
                  <Text style={[typography.caption, { marginTop: 2 }]}>
                    {item.subtitle}
                    {item.subtitleAccent ? (
                      <Text style={{ color: '#16a34a', fontFamily: 'Inter_600SemiBold' }}>
                        {item.subtitleAccent}
                      </Text>
                    ) : null}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color="#8a8a8a" />
            </Pressable>
          ))}
        </View>

        <Pressable
          disabled={busy}
          onPress={() => {
            setBusy(true)
            void logout().finally(() => setBusy(false))
          }}
          className="mt-6 items-center rounded-2xl border border-red-200 bg-red-50 px-4 py-4 active:opacity-80"
        >
          <Text
            style={{
              fontFamily: 'Inter_600SemiBold',
              fontSize: 16,
              color: '#dc2626',
            }}
          >
            {busy ? 'Saliendo…' : 'Cerrar sesión'}
          </Text>
        </Pressable>
      </ScrollView>
    </Screen>
  )
}
