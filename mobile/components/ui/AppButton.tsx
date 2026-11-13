import { ReactNode } from 'react'
import { ActivityIndicator, Pressable, Text, ViewStyle } from 'react-native'

type Variant = 'primary' | 'secondary' | 'ghost' | 'soft'

interface AppButtonProps {
  label: string
  onPress?: () => void
  disabled?: boolean
  loading?: boolean
  variant?: Variant
  className?: string
  style?: ViewStyle
  icon?: ReactNode
}

const BOX: Record<Variant, string> = {
  primary: 'bg-indigo active:opacity-80',
  secondary: 'border border-line bg-white active:bg-mist',
  ghost: 'bg-transparent active:opacity-70',
  soft: 'bg-mist active:opacity-80',
}

const TEXT: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-inkwell',
  ghost: 'text-mute',
  soft: 'text-inkwell',
}

export function AppButton({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  className = '',
  style,
  icon,
}: AppButtonProps) {
  const dimmed = disabled || loading
  return (
    <Pressable
      accessibilityRole="button"
      disabled={dimmed}
      onPress={onPress}
      style={style}
      className={`flex-row items-center justify-center rounded-full px-5 py-4 ${BOX[variant]} ${dimmed ? 'opacity-50' : ''} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : '#4334d6'} />
      ) : (
        <>
          {icon}
          <Text
            className={`text-base ${TEXT[variant]}`}
            style={{ fontFamily: 'Inter_600SemiBold' }}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  )
}
