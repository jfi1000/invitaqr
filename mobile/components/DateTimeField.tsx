import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker'
import { createElement, useMemo, useState } from 'react'
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { AppButton } from './ui/AppButton'

interface DateTimeFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  optional?: boolean
  hint?: string
  /**
   * Earliest selectable moment. Defaults to now.
   * Pass null to allow dates in the past (editing an event that already started).
   */
  minimumDate?: Date | null
}

function toLocalInput(value: string): string {
  if (!value) return ''
  return value.includes('T') ? value.slice(0, 16) : value.replace(' ', 'T').slice(0, 16)
}

function fromDate(date: Date): string {
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function parseLocal(value: string): Date {
  const local = toLocalInput(value)
  if (!local) return new Date()
  const [datePart, timePart = '18:00'] = local.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hours, minutes] = timePart.split(':').map(Number)
  return new Date(year, month - 1, day, hours, minutes, 0, 0)
}

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

function formatDisplay(value: string): string {
  if (!value) return 'Elegir fecha y hora'
  const date = parseLocal(value)
  if (Number.isNaN(date.getTime())) return 'Elegir fecha y hora'
  const hours = date.getHours()
  const hour12 = hours % 12 || 12
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const period = hours < 12 ? 'a.m.' : 'p.m.'
  return `${date.getDate()} de ${MONTHS[date.getMonth()]} de ${date.getFullYear()}, ${hour12}:${minutes} ${period}`
}

function clampToMinimum(date: Date, minimum: Date): Date {
  return date.getTime() < minimum.getTime() ? new Date(minimum) : date
}

export function DateTimeField({
  label,
  value,
  onChange,
  optional = false,
  hint,
  minimumDate,
}: DateTimeFieldProps) {
  const [open, setOpen] = useState(false)
  const localValue = toLocalInput(value)
  const minimum = useMemo(
    () => (minimumDate === null ? null : minimumDate ?? new Date()),
    [minimumDate],
  )
  const minInput = minimum ? fromDate(minimum) : undefined

  function applyChange(next: string) {
    if (!next) {
      onChange('')
      return
    }
    const parsed = parseLocal(next)
    if (Number.isNaN(parsed.getTime())) return
    onChange(fromDate(minimum ? clampToMinimum(parsed, minimum) : parsed))
  }

  if (Platform.OS === 'web') {
    return (
      <View className="mt-4">
        <Text
          className="mb-2 text-sm text-indigo"
          style={{ fontFamily: 'Inter_600SemiBold', letterSpacing: 0.2 }}
        >
          {label}
          {optional ? ' (opcional)' : ''}
        </Text>
        {createElement('input', {
          type: 'datetime-local',
          value: localValue,
          min: minInput,
          onChange: (event: { target: { value: string } }) => applyChange(event.target.value),
          style: {
            width: '100%',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#e6e2f2',
            borderStyle: 'solid',
            backgroundColor: '#ffffff',
            padding: '14px 16px',
            fontSize: 16,
            color: '#2a2348',
            fontFamily: 'Inter, system-ui, sans-serif',
          },
        })}
        {hint ? <Text className="mt-2 text-sm text-mute">{hint}</Text> : null}
      </View>
    )
  }

  return (
    <View className="mt-4">
      <Text
        className="mb-2 text-sm text-indigo"
        style={{ fontFamily: 'Inter_600SemiBold', letterSpacing: 0.2 }}
      >
        {label}
        {optional ? ' (opcional)' : ''}
      </Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#e6e2f2',
          backgroundColor: '#ffffff',
          paddingHorizontal: 16,
          paddingVertical: 16,
        }}
      >
        <Text
          style={{
            fontFamily: 'Inter_500Medium',
            fontSize: 16,
            lineHeight: 22,
            color: localValue ? '#111111' : '#5c5670',
          }}
        >
          {formatDisplay(localValue)}
        </Text>
      </Pressable>
      {optional && localValue ? (
        <Pressable className="mt-2 self-start" onPress={() => onChange('')}>
          <Text className="text-sm text-indigo" style={{ fontFamily: 'Inter_600SemiBold' }}>
            Quitar fecha de fin
          </Text>
        </Pressable>
      ) : null}
      {hint ? <Text className="mt-2 text-sm text-mute">{hint}</Text> : null}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable
            accessibilityLabel="Cerrar selector de fecha"
            onPress={() => setOpen(false)}
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(17, 17, 17, 0.45)' }]}
          />
          <View
            style={{
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingHorizontal: 20,
              paddingTop: 10,
              paddingBottom: 28,
            }}
          >
            <View
              style={{
                alignSelf: 'center',
                width: 42,
                height: 4,
                borderRadius: 2,
                backgroundColor: '#e6e2f2',
                marginBottom: 14,
              }}
            />
            <Text
              style={{
                textAlign: 'center',
                fontFamily: 'Inter_600SemiBold',
                fontSize: 17,
                color: '#111111',
              }}
            >
              {label}
            </Text>
            <Text
              style={{
                marginTop: 4,
                marginBottom: 8,
                textAlign: 'center',
                fontFamily: 'Inter_500Medium',
                fontSize: 14,
                color: '#5c5670',
              }}
            >
              {formatDisplay(localValue)}
            </Text>
            <DateTimePicker
              value={
                minimum
                  ? clampToMinimum(parseLocal(localValue), minimum)
                  : parseLocal(localValue)
              }
              mode="datetime"
              display="spinner"
              locale="es-MX"
              {...(minimum ? { minimumDate: minimum } : {})}
              {...(Platform.OS === 'ios'
                ? { themeVariant: 'light' as const, textColor: '#111111' }
                : {
                    positiveButton: { label: 'Listo', textColor: '#4334d6' },
                    negativeButton: { label: 'Cancelar', textColor: '#5c5670' },
                  })}
              style={{ height: 216, backgroundColor: '#ffffff' }}
              onChange={(event: DateTimePickerEvent, date?: Date) => {
                if (event.type === 'dismissed') {
                  setOpen(false)
                  return
                }
                if (date) {
                  applyChange(fromDate(date))
                }
              }}
            />
            <AppButton className="mt-2" label="Listo" onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  )
}
