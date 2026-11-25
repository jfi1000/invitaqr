import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, FlatList, Modal, Platform, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBadge } from '../../../../components/StatusBadge'
import { AppButton } from '../../../../components/ui/AppButton'
import { FieldLabel } from '../../../../components/ui/FieldLabel'
import { Screen } from '../../../../components/ui/Screen'
import { ScreenHeader } from '../../../../components/ui/ScreenHeader'
import { StaffListSkeleton } from '../../../../components/ui/screen-skeletons'
import { useEvent } from '../../../../hooks/useEvents'
import {
  apiErrorMessage,
  getEventStaff,
  inviteEventStaff,
  removeEventStaff,
} from '../../../../lib/api'
import { queryKeys } from '../../../../lib/query'
import type { EventStaffMember } from '../../../../lib/types'

function routeId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

export default function EventStaffScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ id: string }>()
  const eventId = routeId(params.id)
  const eventQuery = useEvent(eventId)
  const client = useQueryClient()
  const staffQuery = useQuery({
    queryKey: queryKeys.staff(eventId),
    queryFn: () => getEventStaff(eventId),
    enabled: Boolean(eventId),
  })

  const [inviteOpen, setInviteOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const invite = useMutation({
    mutationFn: () =>
      inviteEventStaff(eventId, {
        name: name.trim(),
        email: email.trim(),
      }),
    onSuccess: (result) => {
      void client.invalidateQueries({ queryKey: queryKeys.staff(eventId) })
      setInviteOpen(false)
      setName('')
      setEmail('')
      setError(null)
      setNotice(
        result.status === 'invited'
          ? 'Invitación enviada (activar cuenta)'
          : 'Staff asignado: se envió el enlace para escanear',
      )
    },
    onError: (caught) => setError(apiErrorMessage(caught)),
  })

  const remove = useMutation({
    mutationFn: (staffId: string) => removeEventStaff(eventId, staffId),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.staff(eventId) })
      setNotice('Staff removido del evento')
    },
    onError: (caught) => setError(apiErrorMessage(caught)),
  })

  function confirmRemove(member: EventStaffMember) {
    const message = `¿Quitar a ${member.name} de este evento?`
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(message)) {
        remove.mutate(member.staffId)
      }
      return
    }
    Alert.alert('Quitar staff', message, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: () => remove.mutate(member.staffId),
      },
    ])
  }

  return (
    <Screen>
      <ScreenHeader
        title="Staff"
        eyebrow={eventQuery.data?.name ?? 'Evento'}
        subtitle="Personal de acceso en puerta · escaneo desde 1 h antes del inicio"
        onBack={() => router.back()}
      />

      <AppButton
        className="mt-2"
        label="Invitar staff"
        onPress={() => {
          setInviteOpen(true)
          setError(null)
        }}
      />

      {notice ? (
        <Text className="mt-3 text-sm text-emerald-800" style={{ fontFamily: 'Inter_500Medium' }}>
          {notice}
        </Text>
      ) : null}
      {error && !inviteOpen ? (
        <Text className="mt-3 text-sm text-red-700">{error}</Text>
      ) : null}

      {staffQuery.isError ? (
        <Text className="mt-4 text-base text-red-700">
          {apiErrorMessage(staffQuery.error)}
        </Text>
      ) : null}

      <FlatList
        style={{ flex: 1 }}
        className="mt-4"
        data={staffQuery.data ?? []}
        keyExtractor={(item) => item.staffId}
        ListEmptyComponent={
          staffQuery.isPending ? (
            <StaffListSkeleton />
          ) : staffQuery.isSuccess ? (
            <Text className="mt-2 text-base text-mute">
              Aún no hay personal asignado.
            </Text>
          ) : undefined
        }
        renderItem={({ item }) => (
          <View className="mb-3 rounded-3xl border border-line bg-card px-4 py-4">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text
                  className="text-lg text-inkwell"
                  style={{ fontFamily: 'Inter_600SemiBold' }}
                >
                  {item.name}
                </Text>
                <Text className="mt-1 text-sm text-mute">{item.email}</Text>
              </View>
              <StatusBadge value={item.status} />
            </View>
            <AppButton
              className="mt-3"
              label="Quitar"
              variant="ghost"
              onPress={() => confirmRemove(item)}
            />
          </View>
        )}
      />

      <Modal visible={inviteOpen} animationType="slide" onRequestClose={() => setInviteOpen(false)}>
        <SafeAreaView className="flex-1 bg-paper">
          <View className="flex-1 px-5 pt-4">
            <ScreenHeader
              title="Invitar staff"
              eyebrow="Acceso"
              subtitle="Recibirán un correo para activar su cuenta."
              onBack={() => setInviteOpen(false)}
            />
            <FieldLabel>Nombre</FieldLabel>
            <TextInput
              className="rounded-2xl border border-line bg-white px-4 py-4 text-base text-inkwell"
              style={{ fontFamily: 'Inter_500Medium' }}
              placeholder="María Acceso"
              placeholderTextColor="#8d86a6"
              value={name}
              onChangeText={setName}
            />
            <FieldLabel>Correo</FieldLabel>
            <TextInput
              className="rounded-2xl border border-line bg-white px-4 py-4 text-base text-inkwell"
              style={{ fontFamily: 'Inter_500Medium' }}
              placeholder="staff@correo.com"
              placeholderTextColor="#8d86a6"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            {error ? <Text className="mt-3 text-sm text-red-700">{error}</Text> : null}
            <AppButton
              className="mt-5"
              label={invite.isPending ? 'Enviando…' : 'Enviar invitación'}
              loading={invite.isPending}
              onPress={() => {
                if (!name.trim() || !email.trim()) {
                  setError('Escribe nombre y correo')
                  return
                }
                invite.mutate()
              }}
            />
            <AppButton
              className="mt-2"
              label="Cancelar"
              variant="ghost"
              onPress={() => setInviteOpen(false)}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </Screen>
  )
}
