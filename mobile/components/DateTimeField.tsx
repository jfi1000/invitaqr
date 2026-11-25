import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker'
import { createElement, useMemo, useState } from 'react'
import { Platform, Pressable, Text, View } from 'react-native'

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

function formatDisplay(value: string): string {
  if (!value) return 'Elegir fecha y hora'
  const date = parseLocal(value)
  if (Number.isNaN(date.getTime())) return 'Elegir fecha y hora'
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
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
      {open ? (
        <View
          style={{
            marginTop: 8,
            borderRadius: 16,
            backgroundColor: '#ffffff',
            borderWidth: 1,
            borderColor: '#e6e2f2',
            overflow: 'hidden',
          }}
        >
          <DateTimePicker
            value={minimum ? clampToMinimum(parseLocal(localValue), minimum) : parseLocal(localValue)}
            mode="datetime"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            {...(minimum ? { minimumDate: minimum } : {})}
            themeVariant="light"
            textColor="#111111"
            accentColor="#4334d6"
            style={
              Platform.OS === 'ios'
                ? { height: 216, backgroundColor: '#ffffff' }
                : { backgroundColor: '#ffffff' }
            }
            onChange={(event: DateTimePickerEvent, date?: Date) => {
              if (Platform.OS !== 'ios') {
                setOpen(false)
              }
              if (event.type === 'dismissed') {
                setOpen(false)
                return
              }
              if (date) {
                applyChange(fromDate(date))
              }
            }}
          />
          {Platform.OS === 'ios' ? (
            <Pressable className="mt-2 self-end" onPress={() => setOpen(false)}>
              <Text className="text-base text-indigo" style={{ fontFamily: 'Inter_600SemiBold' }}>
                Listo
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}
