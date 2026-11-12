import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as DocumentPicker from 'expo-document-picker'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { GuestItem } from '../../../../components/GuestItem'
import { StatusBadge } from '../../../../components/StatusBadge'
import {
  apiErrorMessage,
  createGuest,
  getGuests,
  importGuestCsv,
  importGuestText,
} from '../../../../lib/api'
import { queryKeys } from '../../../../lib/query'
import type { ImportResult } from '../../../../lib/types'

function routeId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

export default function GuestsScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ id: string }>()
  const eventId = routeId(params.id)
  const client = useQueryClient()
  const guests = useQuery({
    queryKey: queryKeys.guests(eventId),
    queryFn: () => getGuests(eventId),
    enabled: Boolean(eventId),
  })
  const [mode, setMode] = useState<'one' | 'text' | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [text, setText] = useState('')
  const [summary, setSummary] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function refresh() {
    void client.invalidateQueries({ queryKey: queryKeys.guests(eventId) })
  }

  function describe(result: ImportResult): string {
    return `Importados ${result.imported}. Duplicados ${result.duplicates}. Rechazados ${result.rejected.length}.`
  }

  const addOne = useMutation({
    mutationFn: () =>
      createGuest(eventId, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      }),
    onSuccess: () => {
      setMode(null)
      setName('')
      setPhone('')
      setEmail('')
      setError(null)
      refresh()
    },
    onError: (caught) => setError(apiErrorMessage(caught)),
  })

  const pasteText = useMutation({
    mutationFn: () => importGuestText(eventId, text),
    onSuccess: (result) => {
      setSummary(describe(result))
      setMode(null)
      setText('')
      setError(null)
      refresh()
    },
    onError: (caught) => setError(apiErrorMessage(caught)),
  })

  const importCsv = useMutation({
    mutationFn: async () => {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'text/plain'],
        copyToCacheDirectory: true,
      })
      if (picked.canceled || !picked.assets[0]) {
        return null
      }
      const file = picked.assets[0]
      return importGuestCsv(eventId, {
        uri: file.uri,
        name: file.name || 'invitados.csv',
        mimeType: file.mimeType,
      })
    },
    onSuccess: (result) => {
      if (!result) return
      setSummary(describe(result))
      setError(null)
      refresh()
    },
    onError: (caught) => setError(apiErrorMessage(caught)),
  })

  return (
    <SafeAreaView className="flex-1 bg-paper px-5">
      <Pressable onPress={() => router.back()} className="py-2">
        <Text className="text-base font-bold text-stone-600">Volver</Text>
      </Pressable>
      <Text className="text-3xl font-bold text-ink">Invitados</Text>
      <View className="mt-4 gap-2">
        <Pressable className="items-center rounded-2xl bg-ink py-3" onPress={() => setMode('one')}>
          <Text className="text-base font-bold text-white">Agregar uno</Text>
        </Pressable>
        <Pressable
          className="items-center rounded-2xl border border-ink py-3"
          disabled={importCsv.isPending}
          onPress={() => importCsv.mutate()}
        >
          <Text className="text-base font-bold text-ink">
            {importCsv.isPending ? 'Importando…' : 'Importar CSV'}
          </Text>
        </Pressable>
        <Pressable className="items-center rounded-2xl border border-ink py-3" onPress={() => setMode('text')}>
          <Text className="text-base font-bold text-ink">Pegar texto</Text>
        </Pressable>
      </View>
      {summary ? <Text className="mt-3 text-base text-emerald-800">{summary}</Text> : null}
      {error ? <Text className="mt-3 text-base text-red-700">{error}</Text> : null}
      {guests.isError ? (
        <Text className="mt-3 text-base text-red-700">{apiErrorMessage(guests.error)}</Text>
      ) : null}
      <FlatList
        className="mt-4"
        data={guests.data ?? []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          guests.isLoading ? (
            <Text className="text-lg text-stone-600">Cargando…</Text>
          ) : (
            <Text className="mt-6 text-lg text-stone-600">Aún no hay invitados.</Text>
          )
        }
        renderItem={({ item }) => (
          <GuestItem
            name={item.name}
            detail={[item.phone, item.email].filter(Boolean).join(' · ') || 'Sin contacto'}
            badge={item.pass ? <StatusBadge value={item.pass.rsvpStatus} /> : undefined}
          />
        )}
      />

      <Modal visible={mode !== null} animationType="slide" onRequestClose={() => setMode(null)}>
        <SafeAreaView className="flex-1 bg-paper px-5">
          <Text className="mt-4 text-3xl font-bold text-ink">
            {mode === 'one' ? 'Nuevo invitado' : 'Pegar lista'}
          </Text>
          {mode === 'one' ? (
            <>
              <TextInput
                className="mt-6 rounded-2xl border border-line bg-white px-4 py-4 text-lg"
                placeholder="Nombre"
                placeholderTextColor="#8a8175"
                value={name}
                onChangeText={setName}
              />
              <TextInput
                className="mt-3 rounded-2xl border border-line bg-white px-4 py-4 text-lg"
                placeholder="Teléfono"
                keyboardType="phone-pad"
                placeholderTextColor="#8a8175"
                value={phone}
                onChangeText={setPhone}
              />
              <TextInput
                className="mt-3 rounded-2xl border border-line bg-white px-4 py-4 text-lg"
                placeholder="Correo"
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor="#8a8175"
                value={email}
                onChangeText={setEmail}
              />
              <Text className="mt-2 text-base text-stone-600">Hace falta teléfono o correo.</Text>
              <Pressable
                className="mt-6 items-center rounded-2xl bg-ink py-4"
                disabled={addOne.isPending}
                onPress={() => addOne.mutate()}
              >
                <Text className="text-lg font-bold text-white">
                  {addOne.isPending ? 'Guardando…' : 'Guardar'}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <TextInput
                className="mt-6 min-h-40 rounded-2xl border border-line bg-white px-4 py-4 text-lg"
                multiline
                placeholder={'Ana López 5512345678\nLuis Pérez luis@correo.com'}
                placeholderTextColor="#8a8175"
                textAlignVertical="top"
                value={text}
                onChangeText={setText}
              />
              <Pressable
                className="mt-6 items-center rounded-2xl bg-ink py-4"
                disabled={pasteText.isPending}
                onPress={() => pasteText.mutate()}
              >
                <Text className="text-lg font-bold text-white">
                  {pasteText.isPending ? 'Importando…' : 'Importar texto'}
                </Text>
              </Pressable>
            </>
          )}
          <Pressable className="mt-3 items-center py-3" onPress={() => setMode(null)}>
            <Text className="text-base font-bold text-stone-600">Cerrar</Text>
          </Pressable>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}
