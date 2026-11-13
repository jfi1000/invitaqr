import { ReactNode } from 'react'
import { Text, View } from 'react-native'

interface GuestItemProps {
  name: string
  detail?: string
  badge?: ReactNode
  action?: ReactNode
}

export function GuestItem({ name, detail, badge, action }: GuestItemProps) {
  return (
    <View className="mb-3 rounded-3xl border border-line bg-card px-4 py-4 shadow-sm">
      <View className="flex-row items-start justify-between gap-3">
        <View className="mr-2 flex-1">
          <Text
            className="text-lg text-inkwell"
            style={{ fontFamily: 'Inter_600SemiBold' }}
          >
            {name}
          </Text>
          {detail ? (
            <Text className="mt-1 text-sm text-mute" style={{ fontFamily: 'Inter_500Medium' }}>
              {detail}
            </Text>
          ) : null}
        </View>
        {badge}
      </View>
      {action ? <View className="mt-3">{action}</View> : null}
    </View>
  )
}
