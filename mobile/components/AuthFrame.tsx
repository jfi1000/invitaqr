import { LinearGradient } from 'expo-linear-gradient'
import { ReactNode } from 'react'
import { Platform, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export function AuthFrame({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets()
  const onWeb = Platform.OS === 'web'

  return (
    <View
      className="flex-1 bg-white"
    >
      <View className="w-full flex-1 overflow-hidden bg-white">
        <LinearGradient
          colors={['#3a2adb', '#7c6bff']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={{
            alignItems: 'center',
            paddingTop: (onWeb ? 28 : insets.top + 20),
            paddingBottom: 58,
          }}
        >
          <View className="mb-3 h-11 w-11 flex-row flex-wrap content-between justify-between">
            <View className="h-4 w-4 rounded-md bg-white" />
            <View className="h-4 w-4 rounded-md bg-white opacity-80" />
            <View className="h-4 w-4 rounded-md bg-white opacity-80" />
            <View className="h-2.5 w-2.5 self-end rounded-sm bg-white" />
          </View>
          <Text
            className="text-white"
            style={{ fontFamily: 'Inter_600SemiBold', letterSpacing: 3.2, fontSize: 14 }}
          >
            INVITAQR
          </Text>
        </LinearGradient>
        <View
          className="-mt-8 w-full flex-1 items-center rounded-t-[42px] bg-white px-7 pt-8"
          style={{ paddingBottom: insets.bottom + 28 }}
        >
          <View className="w-full" style={{ maxWidth: 420 }}>
            {children}
          </View>
        </View>
      </View>
    </View>
  )
}
