import * as ImagePicker from 'expo-image-picker'
import { useMemo, useState } from 'react'
import { Image, Pressable, Switch, Text, TextInput, View } from 'react-native'
import { DateTimeField } from './DateTimeField'
import { VenueMapPicker } from './VenueMapPicker'
import { FieldLabel } from './ui/FieldLabel'
import { AppButton } from './ui/AppButton'
import { eventLogo } from '../lib/brand'
import type { EventPlan, EventType } from '../lib/types'

const PLANS: EventPlan[] = ['FREE', 'BASIC', 'PRO']
const TYPES: { value: EventType; label: string }[] = [
  { value: 'social', label: 'Social' },
  { value: 'corporate', label: 'Corporativo' },
  { value: 'educational', label: 'Educativo' },
  { value: 'entertainment', label: 'Entretenimiento' },
]

export interface EventEditorValues {
  name: string
  venueName: string
  location: string
  latitude: number | null
  longitude: number | null
  starts: string
  ends: string
  plan: EventPlan
  type: EventType
  hasTables: boolean
  tableCount: string
  hasZones: boolean
  zones: string
  logo: string | null
}

interface EventEditorFieldsProps {
  values: EventEditorValues
  onChange: (patch: Partial<EventEditorValues>) => void
}

const inputClass =
  'rounded-2xl border border-line bg-white px-4 py-4 text-base text-inkwell'

export function EventEditorFields({ values, onChange }: EventEditorFieldsProps) {
  const [mapOpen, setMapOpen] = useState(false)
  const pinReady =
    typeof values.latitude === 'number' && typeof values.longitude === 'number'
  const mapInitial = useMemo(
    () =>
      values.latitude != null && values.longitude != null
        ? { latitude: values.latitude, longitude: values.longitude }
        : null,
    [values.latitude, values.longitude],
  )

  async function pickLogo() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      return
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
      allowsEditing: true,
      aspect: [1, 1],
    })
    if (picked.canceled || !picked.assets[0]?.base64) {
      return
    }
    const asset = picked.assets[0]
    const mime = asset.mimeType || 'image/jpeg'
    onChange({ logo: `data:${mime};base64,${asset.base64}` })
  }

  return (
    <View>
      <FieldLabel>Nombre</FieldLabel>
      <TextInput
        className={inputClass}
        style={{ fontFamily: 'Inter_500Medium' }}
        placeholder="Boda de Ana y Luis"
        placeholderTextColor="#8d86a6"
        value={values.name}
        onChangeText={(name) => onChange({ name })}
      />
      <FieldLabel>Nombre del lugar</FieldLabel>
      <TextInput
        className={inputClass}
        style={{ fontFamily: 'Inter_500Medium' }}
        placeholder="Salón Jardín Las Palmas"
        placeholderTextColor="#8d86a6"
        value={values.venueName}
        onChangeText={(venueName) => onChange({ venueName })}
      />
      <FieldLabel>Ubicación / dirección</FieldLabel>
      <TextInput
        className={inputClass}
        style={{ fontFamily: 'Inter_500Medium', minHeight: 56 }}
        placeholder="Calle, número, colonia, ciudad, estado (ej. Av. Ávila Camacho 15, Centro, Xalapa, Ver.)"
        placeholderTextColor="#8d86a6"
        multiline
        numberOfLines={2}
        textAlignVertical="top"
        value={values.location}
        onChangeText={(location) =>
          onChange({ location, latitude: null, longitude: null })
        }
      />
      <View className="mt-3 rounded-3xl border border-line bg-mist/70 px-4 py-3">
        <Text className="text-sm text-mute" style={{ fontFamily: 'Inter_500Medium' }}>
          {pinReady
            ? `Pin listo · ${values.latitude!.toFixed(5)}, ${values.longitude!.toFixed(5)}`
            : 'Aún no hay pin. Ubica el mapa para marcar el punto exacto.'}
        </Text>
        <AppButton
          className="mt-3"
          label={pinReady ? 'Ajustar pin en el mapa' : 'Ubicar en el mapa'}
          variant="secondary"
          onPress={() => setMapOpen(true)}
        />
        {pinReady ? (
          <AppButton
            className="mt-2"
            label="Quitar pin"
            variant="ghost"
            onPress={() => onChange({ latitude: null, longitude: null })}
          />
        ) : null}
      </View>
      <VenueMapPicker
        visible={mapOpen}
        venueName={values.venueName}
        address={values.location}
        initial={mapInitial}
        onClose={() => setMapOpen(false)}
        onConfirm={(point) => {
          onChange({
            latitude: point.latitude,
            longitude: point.longitude,
          })
          setMapOpen(false)
        }}
      />
      <FieldLabel>Tipo</FieldLabel>
      <View className="flex-row flex-wrap gap-2">
        {TYPES.map((item) => {
          const active = values.type === item.value
          return (
            <Pressable
              key={item.value}
              className={`rounded-full px-4 py-2.5 ${active ? 'bg-indigo' : 'border border-line bg-white'}`}
              onPress={() => onChange({ type: item.value })}
            >
              <Text
                className={active ? 'text-white' : 'text-inkwell'}
                style={{ fontFamily: 'Inter_600SemiBold' }}
              >
                {item.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
      {values.type === 'social' ? (
        <View className="mt-4 rounded-3xl border border-line bg-mist/60 p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-base text-inkwell" style={{ fontFamily: 'Inter_600SemiBold' }}>
              ¿El evento tiene mesas?
            </Text>
            <Switch
              value={values.hasTables}
              onValueChange={(hasTables) => onChange({ hasTables })}
              trackColor={{ false: '#e6e2f2', true: '#a79bff' }}
              thumbColor={values.hasTables ? '#4334d6' : '#f4f3f4'}
            />
          </View>
          {values.hasTables ? (
            <>
              <FieldLabel>Número de mesas</FieldLabel>
              <TextInput
                className={inputClass}
                keyboardType="number-pad"
                value={values.tableCount}
                onChangeText={(tableCount) => onChange({ tableCount })}
                placeholder="12"
                placeholderTextColor="#8d86a6"
              />
            </>
          ) : null}
          <Text className="mt-3 text-sm text-mute">
            Los acompañantes se definen al agregar cada invitado.
          </Text>
        </View>
      ) : null}
      {values.type === 'entertainment' ? (
        <View className="mt-4 rounded-3xl border border-line bg-mist/60 p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-base text-inkwell" style={{ fontFamily: 'Inter_600SemiBold' }}>
              ¿El evento tiene zonas?
            </Text>
            <Switch
              value={values.hasZones}
              onValueChange={(hasZones) => onChange({ hasZones })}
              trackColor={{ false: '#e6e2f2', true: '#a79bff' }}
              thumbColor={values.hasZones ? '#4334d6' : '#f4f3f4'}
            />
          </View>
          {values.hasZones ? (
            <>
              <FieldLabel>Zonas</FieldLabel>
              <TextInput
                className={inputClass}
                value={values.zones}
                onChangeText={(zones) => onChange({ zones })}
                placeholder="General, VIP, Staff"
                placeholderTextColor="#8d86a6"
              />
            </>
          ) : null}
        </View>
      ) : null}
      <DateTimeField label="Inicio" value={values.starts} onChange={(starts) => onChange({ starts })} />
      <DateTimeField
        label="Fin"
        value={values.ends}
        onChange={(ends) => onChange({ ends })}
        optional
        hint="Si es un solo día, deja el fin vacío."
      />
      <FieldLabel>Logo del evento</FieldLabel>
      <View className="flex-row items-center gap-4">
        <Image
          source={{ uri: eventLogo(values.logo) }}
          style={{ width: 72, height: 72, borderRadius: 18, backgroundColor: '#4334d6' }}
        />
        <View className="flex-1 gap-2">
          <AppButton label="Subir logo" onPress={() => void pickLogo()} />
          {values.logo ? (
            <AppButton
              label="Usar logo InvitaQR"
              variant="ghost"
              onPress={() => onChange({ logo: null })}
            />
          ) : (
            <Text className="text-center text-sm text-mute">Sin logo se usa el de InvitaQR.</Text>
          )}
        </View>
      </View>
      <FieldLabel>Plan</FieldLabel>
      <View className="flex-row gap-2">
        {PLANS.map((item) => {
          const active = values.plan === item
          return (
            <Pressable
              key={item}
              className={`rounded-full px-4 py-2.5 ${active ? 'bg-inkwell' : 'border border-line bg-white'}`}
              onPress={() => onChange({ plan: item })}
            >
              <Text
                className={active ? 'text-white' : 'text-inkwell'}
                style={{ fontFamily: 'Inter_600SemiBold' }}
              >
                {item}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

export function emptyEventEditorValues(): EventEditorValues {
  return {
    name: '',
    venueName: '',
    location: '',
    latitude: null,
    longitude: null,
    starts: '',
    ends: '',
    plan: 'FREE',
    type: 'social',
    hasTables: false,
    tableCount: '',
    hasZones: false,
    zones: '',
    logo: null,
  }
}

export function buildEventPayload(values: EventEditorValues) {
  const tableCount = Number(values.tableCount)
  return {
    name: values.name.trim(),
    venue_name: values.venueName.trim() || undefined,
    location: values.location.trim() || undefined,
    latitude:
      typeof values.latitude === 'number' && Number.isFinite(values.latitude)
        ? values.latitude
        : null,
    longitude:
      typeof values.longitude === 'number' && Number.isFinite(values.longitude)
        ? values.longitude
        : null,
    plan: values.plan,
    type: values.type,
    has_tables: values.type === 'social' ? values.hasTables : false,
    table_count:
      values.type === 'social' && values.hasTables && Number.isFinite(tableCount) && tableCount > 0
        ? tableCount
        : undefined,
    default_max_companions: 0,
    has_zones: values.type === 'entertainment' ? values.hasZones : false,
    zones:
      values.type === 'entertainment' && values.hasZones
        ? values.zones.trim() || undefined
        : undefined,
    logo: values.logo,
    capacity: values.plan === 'FREE' ? 50 : 100,
  }
}
