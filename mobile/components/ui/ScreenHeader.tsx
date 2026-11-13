import { useRouter } from 'expo-router'
import { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { type as typography } from '../../lib/typography'

interface ScreenHeaderProps {
  title: string
  subtitle?: string
  eyebrow?: string
  showBack?: boolean
  onBack?: () => void
  backLabel?: string
  right?: ReactNode
}

export function PageTitle({
  title,
  subtitle,
  eyebrow,
}: {
  title: string
  subtitle?: string
  eyebrow?: string
}) {
  return (
    <View className="pr-2">
      {eyebrow ? (
        <Text style={[typography.label, { marginBottom: 6 }]}>{eyebrow.toUpperCase()}</Text>
      ) : null}
      <Text style={typography.display}>{title}</Text>
      {subtitle ? <Text style={[typography.body, { marginTop: 8 }]}>{subtitle}</Text> : null}
    </View>
  )
}

export function ScreenHeader({
  title,
  subtitle,
  eyebrow,
  showBack = true,
  onBack,
  backLabel = 'Volver',
  right,
}: ScreenHeaderProps) {
  const router = useRouter()

  function handleBack() {
    if (onBack) {
      onBack()
      return
    }
    router.back()
  }

  return (
    <View className="mb-6 mt-2">
      {showBack ? (
        <Pressable
          onPress={handleBack}
          hitSlop={12}
          className="mb-4 min-h-[40px] flex-row items-center self-start rounded-full bg-mist px-4 py-2 active:opacity-80"
        >
          <Text style={[typography.label, { fontSize: 14 }]}>← {backLabel}</Text>
        </Pressable>
      ) : null}
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <PageTitle title={title} subtitle={subtitle} eyebrow={eyebrow} />
        </View>
        {right}
      </View>
    </View>
  )
}
