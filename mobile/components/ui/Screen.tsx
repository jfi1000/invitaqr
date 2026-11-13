import { ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const SCREEN_PAD_X = 28
const SCREEN_PAD_TOP = 12
const SCREEN_PAD_BOTTOM = 40

interface ScreenProps {
  children: ReactNode
  scroll?: boolean
  className?: string
}

export function Screen({ children, scroll = false, className = '' }: ScreenProps) {
  if (scroll) {
    return (
      <SafeAreaView className={`flex-1 bg-paper ${className}`}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: SCREEN_PAD_X,
            paddingTop: SCREEN_PAD_TOP,
            paddingBottom: SCREEN_PAD_BOTTOM,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className={`flex-1 bg-paper ${className}`}>
      <View
        className="flex-1"
        style={{
          paddingHorizontal: SCREEN_PAD_X,
          paddingTop: SCREEN_PAD_TOP,
          paddingBottom: 8,
        }}
      >
        {children}
      </View>
    </SafeAreaView>
  )
}
