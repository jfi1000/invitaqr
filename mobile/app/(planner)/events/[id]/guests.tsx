import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as DocumentPicker from 'expo-document-picker'
import { useLocalSearchParams } from 'expo-router'
import { createElement, useRef, useState } from 'react'
import {
  FlatList,
  Modal,
  Platform,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { GuestItem } from '../../../../components/GuestItem'
import { StatusBadge } from '../../../../components/StatusBadge'
import { AppButton } from '../../../../components/ui/AppButton'
import { FieldLabel } from '../../../../components/ui/FieldLabel'
import { Screen } from '../../../../components/ui/Screen'
import { ScreenHeader } from '../../../../components/ui/ScreenHeader'
import { useEvent } from '../../../../hooks/useEvents'
import {
  apiErrorMessage,
  createGuest,
  getGuests,
  importGuestCsv,
  importGuestText,
  sendGuestInvite,
} from '../../../../lib/api'
import { queryKeys } from '../../../../lib/query'
import type { ImportResult } from '../../../../lib/types'

function routeId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

type GuestField = 'name' | 'contact' | 'companions' | 'table' | 'text'

const EMPTY_FIELD_ERRORS: Record<GuestField, string | null> = {
  name: null,
  contact: null,
  companions: null,
  table: null,
  text: null,
}

function inputClass(hasError: boolean): string {
  return `rounded-2xl border bg-white px-4 py-4 text-base text-inkwell ${
    hasError ? 'border-red-500' : 'border-line'
  }`
}

export default function GuestsScreen() {
  const params = useLocalSearchParams<{ id: string }>()
  const eventId = routeId(params.id)
  const eventQuery = useEvent(eventId)
  const eventName = eventQuery.data?.name
  const client = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const guests = useQuery({
    queryKey: queryKeys.guests(eventId),
    queryFn: () => getGuests(eventId),
    enabled: Boolean(eventId),
  })
  const [mode, setMode] = useState<'one' | 'text' | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [companions, setCompanions] = useState('0')
  const [tableNumber, setTableNumber] = useState('')
  const [text, setText] = useState('')
  const [summary, setSummary] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] =
    useState<Record<GuestField, string | null>>(EMPTY_FIELD_ERRORS)
  const isSocial = eventQuery.data?.type === 'social'
  const hasTables = Boolean(isSocial && eventQuery.data?.hasTables)
  const tableCount = eventQuery.data?.tableCount ?? null

  function refresh() {
    void client.invalidateQueries({ queryKey: queryKeys.guests(eventId) })
  }

  function clearField(field: GuestField) {
    setFieldErrors((current) =>
      current[field] ? { ...current, [field]: null } : current,
    )
  }

  function resetGuestForm() {
    setName('')
    setPhone('')
    setEmail('')
    setCompanions('0')
    setTableNumber('')
    setFieldErrors(EMPTY_FIELD_ERRORS)
    setError(null)
  }

  function validateGuestForm(): {
    maxCompanions: number
    table_number?: number
  } | null {
    const next: Record<GuestField, string | null> = { ...EMPTY_FIELD_ERRORS }
    if (!name.trim()) {
      next.name = 'Escribe el nombre del invitado'
    }
    if (!phone.trim() && !email.trim()) {
      next.contact = 'Indica teléfono o correo'
    } else if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.contact = 'El correo no es válido'
    }

    const maxCompanions = Number(companions)
    if (companions.trim() === '' || !Number.isInteger(maxCompanions) || maxCompanions < 0) {
      next.companions = 'Usa un número válido (0 o más)'
    }

    let table_number: number | undefined
    if (hasTables) {
      if (!tableNumber.trim()) {
        next.table = 'Asigna el número de mesa'
      } else {
        const mesa = Number(tableNumber)
        if (!Number.isInteger(mesa) || mesa < 1) {
          next.table = 'La mesa debe ser 1 o más'
        } else if (tableCount && mesa > tableCount) {
          next.table = `La mesa no puede ser mayor a ${tableCount}`
        } else {
          table_number = mesa
        }
      }
    }

    setFieldErrors(next)
    const hasError = Object.values(next).some(Boolean)
    if (hasError) {
      setError('Revisa los campos marcados en rojo')
      return null
    }
    setError(null)
    return { maxCompanions, table_number }
  }

  function describe(result: ImportResult): string {
    const rejected =
      result.rejected.length > 0
        ? ` Rechazados: ${result.rejected
            .slice(0, 3)
            .map((row) => `línea ${row.line} (${row.reason})`)
            .join('; ')}${result.rejected.length > 3 ? '…' : ''}.`
        : ''
    return `Importados ${result.imported}. Duplicados ${result.duplicates}.${rejected}`
  }

  const addOne = useMutation({
    mutationFn: (sendInvite: boolean) => {
      const valid = validateGuestForm()
      if (!valid) {
        throw new Error('VALIDATION')
      }
      if (sendInvite && !email.trim()) {
        setFieldErrors((current) => ({
          ...current,
          contact: 'Para enviar la invitación necesitas un correo',
        }))
        setError('Revisa los campos marcados en rojo')
        throw new Error('VALIDATION')
      }
      return createGuest(eventId, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        max_companions: valid.maxCompanions,
        table_number: valid.table_number,
        send_invite: sendInvite,
      })
    },
    onSuccess: (_guest, sendInvite) => {
      setMode(null)
      resetGuestForm()
      setSummary(sendInvite ? 'Invitado guardado e invitación enviada.' : 'Invitado guardado.')
      refresh()
    },
    onError: (caught) => {
      if (caught instanceof Error && caught.message === 'VALIDATION') {
        return
      }
      setError(apiErrorMessage(caught))
    },
  })

  const resendInvite = useMutation({
    mutationFn: (guestId: string) => sendGuestInvite(eventId, guestId),
    onSuccess: () => {
      setSummary('Invitación enviada.')
      setError(null)
      refresh()
    },
    onError: (caught) => setError(apiErrorMessage(caught)),
  })

  const pasteText = useMutation({
    mutationFn: () => {
      if (!text.trim()) {
        setFieldErrors((current) => ({
          ...current,
          text: 'Pega al menos una línea con nombre y teléfono o correo',
        }))
        setError('Revisa los campos marcados en rojo')
        throw new Error('VALIDATION')
      }
      return importGuestText(eventId, text)
    },
    onSuccess: (result) => {
      setSummary(describe(result))
      setMode(null)
      setText('')
      setFieldErrors(EMPTY_FIELD_ERRORS)
      setError(null)
      refresh()
    },
    onError: (caught) => {
      if (caught instanceof Error && caught.message === 'VALIDATION') {
        return
      }
      setError(apiErrorMessage(caught))
    },
  })

  const importCsv = useMutation({
    mutationFn: async (file?: File) => {
      if (file) {
        return importGuestCsv(eventId, {
          uri: '',
          name: file.name || 'invitados.csv',
          mimeType: file.type || 'text/csv',
          file,
        })
      }
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      })
      if (picked.canceled || !picked.assets[0]) {
        return null
      }
      const asset = picked.assets[0]
      return importGuestCsv(eventId, {
        uri: asset.uri,
        name: asset.name || 'invitados.csv',
        mimeType: asset.mimeType,
        file: asset.file,
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

  function startCsvImport() {
    setError(null)
    if (Platform.OS === 'web') {
      fileInputRef.current?.click()
      return
    }
    importCsv.mutate(undefined)
  }

  return (
    <Screen>
      <ScreenHeader
        title="Invitados"
        eyebrow="Gestión"
        subtitle={eventName ? `Evento: ${eventName}` : 'Cargando evento…'}
      />
      <View className="gap-2">
        <AppButton
          label="Agregar uno"
          onPress={() => {
            resetGuestForm()
            setMode('one')
          }}
        />
        <AppButton
          label={importCsv.isPending ? 'Importando…' : 'Importar CSV'}
          variant="secondary"
          loading={importCsv.isPending}
          onPress={startCsvImport}
        />
        <AppButton
          label="Pegar texto"
          variant="secondary"
          onPress={() => {
            setError(null)
            setFieldErrors(EMPTY_FIELD_ERRORS)
            setMode('text')
          }}
        />
      </View>
      {Platform.OS === 'web'
        ? createElement('input', {
            ref: fileInputRef,
            type: 'file',
            accept: '.csv,text/csv,text/plain',
            style: { display: 'none' },
            onChange: (event: { target: HTMLInputElement }) => {
              const file = event.target.files?.[0]
              if (file) {
                importCsv.mutate(file)
              }
              event.target.value = ''
            },
          })
        : null}
      {summary ? <Text className="mt-3 text-sm text-emerald-700">{summary}</Text> : null}
      {error ? <Text className="mt-3 text-sm text-red-700">{error}</Text> : null}
      {guests.isError ? (
        <Text className="mt-3 text-sm text-red-700">{apiErrorMessage(guests.error)}</Text>
      ) : null}
      <FlatList
        style={{ flex: 1 }}
        className="mt-4"
        data={guests.data ?? []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          guests.isLoading ? (
            <Text className="text-base text-mute">Cargando…</Text>
          ) : (
            <Text className="mt-6 text-base text-mute">Aún no hay invitados.</Text>
          )
        }
        renderItem={({ item }) => {
          const contact =
            [item.email, item.phone].filter(Boolean).join(' · ') || 'Sin contacto'
          const companionsLabel =
            item.maxCompanions > 0
              ? `${item.maxCompanions} acompañante${item.maxCompanions === 1 ? '' : 's'}`
              : 'Sin acompañantes'
          const tableLabel = item.tableNumber ? `Mesa ${item.tableNumber}` : null
          const inviteSent = Boolean(item.inviteSentAt)
          const canSend =
            Boolean(item.email) && eventQuery.data?.status === 'ACTIVE'
          return (
            <GuestItem
              name={item.name}
              detail={[contact, companionsLabel, tableLabel].filter(Boolean).join(' · ')}
              badge={
                <View className="items-end gap-1">
                  <StatusBadge value={inviteSent ? 'INVITE_SENT' : 'INVITE_PENDING'} />
                  {item.pass ? <StatusBadge value={item.pass.rsvpStatus} /> : null}
                </View>
              }
              action={
                canSend ? (
                  <AppButton
                    label={
                      resendInvite.isPending && resendInvite.variables === item.id
                        ? 'Enviando…'
                        : inviteSent
                          ? 'Reenviar invitación'
                          : 'Enviar invitación'
                    }
                    variant="secondary"
                    loading={resendInvite.isPending && resendInvite.variables === item.id}
                    onPress={() => resendInvite.mutate(item.id)}
                  />
                ) : undefined
              }
            />
          )
        }}
      />

      <Modal visible={mode !== null} animationType="slide" onRequestClose={() => setMode(null)}>
        <SafeAreaView className="flex-1 bg-paper">
          <View style={{ flex: 1, paddingHorizontal: 28, paddingTop: 12 }}>
          <ScreenHeader
            title={mode === 'one' ? 'Nuevo invitado' : 'Pegar lista'}
            eyebrow="Invitados"
            subtitle={
              mode === 'one'
                ? eventName
                  ? `Añadir a: ${eventName}`
                  : 'Añadir invitado a este evento'
                : hasTables
                  ? 'Una persona por línea: nombre y teléfono o correo. En CSV usa acompanantes y mesa.'
                  : 'Una persona por línea: nombre y teléfono o correo. En CSV usa la columna acompanantes.'
            }
            onBack={() => setMode(null)}
          />
          {mode === 'one' ? (
            <>
              <FieldLabel>Nombre</FieldLabel>
              <TextInput
                className={inputClass(Boolean(fieldErrors.name))}
                placeholder="Ana López"
                placeholderTextColor="#8d86a6"
                value={name}
                onChangeText={(value) => {
                  setName(value)
                  clearField('name')
                }}
              />
              {fieldErrors.name ? (
                <Text className="mt-1 text-sm text-red-600">{fieldErrors.name}</Text>
              ) : null}

              <FieldLabel>Teléfono</FieldLabel>
              <TextInput
                className={inputClass(Boolean(fieldErrors.contact))}
                placeholder="5512345678"
                keyboardType="phone-pad"
                placeholderTextColor="#8d86a6"
                value={phone}
                onChangeText={(value) => {
                  setPhone(value)
                  clearField('contact')
                }}
              />
              <FieldLabel>Correo</FieldLabel>
              <TextInput
                className={inputClass(Boolean(fieldErrors.contact))}
                placeholder="ana@correo.com"
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor="#8d86a6"
                value={email}
                onChangeText={(value) => {
                  setEmail(value)
                  clearField('contact')
                }}
              />
              {fieldErrors.contact ? (
                <Text className="mt-1 text-sm text-red-600">{fieldErrors.contact}</Text>
              ) : null}

              <FieldLabel>Acompañantes autorizados</FieldLabel>
              <TextInput
                className={inputClass(Boolean(fieldErrors.companions))}
                placeholder="0"
                keyboardType="number-pad"
                placeholderTextColor="#8d86a6"
                value={companions}
                onChangeText={(value) => {
                  setCompanions(value)
                  clearField('companions')
                }}
              />
              {fieldErrors.companions ? (
                <Text className="mt-1 text-sm text-red-600">{fieldErrors.companions}</Text>
              ) : null}

              {hasTables ? (
                <>
                  <FieldLabel>Mesa</FieldLabel>
                  <TextInput
                    className={inputClass(Boolean(fieldErrors.table))}
                    placeholder={tableCount ? `1 a ${tableCount}` : 'Ej. 5'}
                    keyboardType="number-pad"
                    placeholderTextColor="#8d86a6"
                    value={tableNumber}
                    onChangeText={(value) => {
                      setTableNumber(value)
                      clearField('table')
                    }}
                  />
                  {fieldErrors.table ? (
                    <Text className="mt-1 text-sm text-red-600">{fieldErrors.table}</Text>
                  ) : null}
                </>
              ) : null}

              <Text className="mt-2 text-sm text-mute">
                {hasTables
                  ? `Hace falta teléfono o correo. Asigna una mesa${tableCount ? ` (1–${tableCount})` : ''}.`
                  : isSocial
                    ? 'Hace falta teléfono o correo. Los acompañantes son por invitado.'
                    : 'Hace falta teléfono o correo.'}
              </Text>
              {error ? <Text className="mt-3 text-sm text-red-600">{error}</Text> : null}
              <AppButton
                className="mt-6"
                label={
                  addOne.isPending && addOne.variables === false
                    ? 'Guardando…'
                    : 'Guardar invitado'
                }
                loading={addOne.isPending && addOne.variables === false}
                disabled={addOne.isPending}
                onPress={() => addOne.mutate(false)}
              />
              <AppButton
                className="mt-2"
                label={
                  addOne.isPending && addOne.variables === true
                    ? 'Enviando…'
                    : 'Guardar y enviar invitación'
                }
                variant="secondary"
                loading={addOne.isPending && addOne.variables === true}
                disabled={addOne.isPending}
                onPress={() => addOne.mutate(true)}
              />
            </>
          ) : (
            <>
              <TextInput
                className={`mt-2 min-h-40 ${inputClass(Boolean(fieldErrors.text))}`}
                multiline
                placeholder={'Ana López 5512345678\nLuis Pérez luis@correo.com'}
                placeholderTextColor="#8d86a6"
                textAlignVertical="top"
                value={text}
                onChangeText={(value) => {
                  setText(value)
                  clearField('text')
                }}
              />
              {fieldErrors.text ? (
                <Text className="mt-1 text-sm text-red-600">{fieldErrors.text}</Text>
              ) : null}
              {error && mode === 'text' ? (
                <Text className="mt-3 text-sm text-red-600">{error}</Text>
              ) : null}
              <AppButton
                className="mt-6"
                label={pasteText.isPending ? 'Importando…' : 'Importar texto'}
                loading={pasteText.isPending}
                onPress={() => pasteText.mutate()}
              />
            </>
          )}
          <AppButton
            className="mt-3"
            label="Cerrar"
            variant="ghost"
            onPress={() => {
              setMode(null)
              resetGuestForm()
              setText('')
            }}
          />
          </View>
        </SafeAreaView>
      </Modal>
    </Screen>
  )
}
