import { ReactNode } from 'react'
import { Text, View } from 'react-native'

interface GuestItemProps {
  name: string
  detail?: string
  badge?: ReactNode
}

export function GuestItem({ name, detail, badge }: GuestItemProps) {
  return (
    <View className="mb-3 flex-row items-center justify-between rounded-2xl border border-line bg-card px-4 py-3">
      <View className="mr-3 flex-1">
        <Text className="text-lg font-bold text-ink">{name}</Text>
        {detail ? <Text className="mt-1 text-base text-stone-600">{detail}</Text> : null}
      </View>
      {badge}
    </View>
  )
}
