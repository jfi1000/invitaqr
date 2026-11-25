import { useEffect } from 'react'
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native'

const pulse = new Animated.Value(0.4)
let pulseStarted = false

function startPulse() {
  if (pulseStarted) return
  pulseStarted = true
  Animated.loop(
    Animated.sequence([
      Animated.timing(pulse, {
        toValue: 1,
        duration: 750,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(pulse, {
        toValue: 0.4,
        duration: 750,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
    ]),
  ).start()
}

interface SkeletonProps {
  width?: number | `${number}%`
  height: number
  radius?: number
  style?: StyleProp<ViewStyle>
}

export function Skeleton({ width = '100%', height, radius = 12, style }: SkeletonProps) {
  useEffect(() => {
    startPulse()
  }, [])

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: '#e6e2f2',
          opacity: pulse,
        },
        style,
      ]}
    />
  )
}
