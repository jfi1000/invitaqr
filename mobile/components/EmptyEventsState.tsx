import { useEffect } from 'react'
import { Pressable, Text, View } from 'react-native'
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

interface EmptyEventsStateProps {
  onCreate: () => void
}

function Twinkle({
  delay,
  size,
  color,
  style,
}: {
  delay: number
  size: number
  color: string
  style: object
}) {
  const pulse = useSharedValue(0.35)

  useEffect(() => {
    pulse.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      ),
    )
  }, [delay, pulse])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: interpolate(pulse.value, [0.3, 1], [0.75, 1.15]) }],
  }))

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
        animatedStyle,
      ]}
    />
  )
}

function Star({
  delay,
  size,
  style,
}: {
  delay: number
  size: number
  style: object
}) {
  const spin = useSharedValue(0)

  useEffect(() => {
    spin.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 4200, easing: Easing.linear }), -1, false),
    )
  }, [delay, spin])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(spin.value, [0, 0.5, 1], [0.35, 1, 0.35]),
    transform: [{ rotate: `${spin.value * 90}deg` }, { scale: interpolate(spin.value, [0, 0.5, 1], [0.85, 1.1, 0.85]) }],
  }))

  return (
    <Animated.View style={[{ position: 'absolute', width: size, height: size }, style, animatedStyle]}>
      <View
        style={{
          position: 'absolute',
          left: size / 2 - 1.5,
          top: 0,
          width: 3,
          height: size,
          borderRadius: 2,
          backgroundColor: '#f5c542',
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size / 2 - 1.5,
          left: 0,
          width: size,
          height: 3,
          borderRadius: 2,
          backgroundColor: '#f5c542',
        }}
      />
    </Animated.View>
  )
}

function Mascot() {
  const float = useSharedValue(0)
  const wave = useSharedValue(0)

  useEffect(() => {
    float.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    )
    wave.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1200 }),
        ),
        -1,
        false,
      ),
    )
  }, [float, wave])

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(float.value, [0, 1], [0, -10]) }],
  }))

  const armStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(wave.value, [0, 1], [-18, 28])}deg` },
      { translateY: interpolate(wave.value, [0, 1], [0, -4]) },
    ],
  }))

  return (
    <Animated.View style={[{ alignItems: 'center', justifyContent: 'center' }, bodyStyle]}>
      <View
        style={{
          width: 128,
          height: 128,
          borderRadius: 44,
          backgroundColor: '#7c6bff',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#4334d6',
          shadowOpacity: 0.25,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
        }}
      >
        <View style={{ position: 'absolute', top: 42, left: 34, width: 14, height: 14, borderRadius: 7, backgroundColor: '#1a1528' }} />
        <View style={{ position: 'absolute', top: 42, right: 34, width: 14, height: 14, borderRadius: 7, backgroundColor: '#1a1528' }} />
        <View
          style={{
            position: 'absolute',
            bottom: 38,
            width: 36,
            height: 18,
            borderBottomLeftRadius: 18,
            borderBottomRightRadius: 18,
            borderWidth: 3,
            borderColor: '#1a1528',
            borderTopWidth: 0,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: 22,
            left: 22,
            width: 22,
            height: 22,
            borderRadius: 6,
            backgroundColor: 'rgba(255,255,255,0.9)',
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: 22,
            right: 22,
            width: 22,
            height: 22,
            borderRadius: 6,
            backgroundColor: 'rgba(255,255,255,0.55)',
          }}
        />
        <View
          style={{
            position: 'absolute',
            bottom: 22,
            left: 22,
            width: 22,
            height: 22,
            borderRadius: 6,
            backgroundColor: 'rgba(255,255,255,0.55)',
          }}
        />
        <View
          style={{
            position: 'absolute',
            bottom: 26,
            right: 26,
            width: 14,
            height: 14,
            borderRadius: 4,
            backgroundColor: 'rgba(255,255,255,0.9)',
          }}
        />
      </View>
      <Animated.View
        style={[
          {
            position: 'absolute',
            right: -10,
            top: 46,
            width: 18,
            height: 42,
            borderRadius: 12,
            backgroundColor: '#9b8cff',
          },
          armStyle,
        ]}
      />
    </Animated.View>
  )
}

export function EmptyEventsState({ onCreate }: EmptyEventsStateProps) {
  const enter = useSharedValue(0)

  useEffect(() => {
    enter.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) })
  }, [enter])

  const enterStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: interpolate(enter.value, [0, 1], [18, 0]) }],
  }))

  return (
    <Animated.View style={[{ marginTop: 28, alignItems: 'center', paddingHorizontal: 8 }, enterStyle]}>
      <View
        style={{
          width: '100%',
          maxWidth: 340,
          alignItems: 'center',
          borderRadius: 32,
          backgroundColor: '#ffffff',
          borderWidth: 1,
          borderColor: '#e6e2f2',
          paddingVertical: 36,
          paddingHorizontal: 24,
        }}
      >
        <View style={{ width: 220, height: 180, alignItems: 'center', justifyContent: 'center' }}>
          <Twinkle delay={0} size={10} color="#f6b7c6" style={{ top: 18, left: 28 }} />
          <Twinkle delay={300} size={8} color="#7c6bff" style={{ top: 40, right: 24 }} />
          <Twinkle delay={650} size={12} color="#f5c542" style={{ bottom: 28, left: 36 }} />
          <Star delay={100} size={16} style={{ top: 8, right: 48 }} />
          <Star delay={500} size={12} style={{ bottom: 20, right: 30 }} />
          <View
            style={{
              position: 'absolute',
              top: 28,
              left: 52,
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: '#4334d6',
              opacity: 0.2,
            }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: 36,
              right: 54,
              width: 18,
              height: 18,
              borderRadius: 9,
              borderWidth: 3,
              borderColor: '#7c6bff',
              opacity: 0.35,
            }}
          />
          <Mascot />
        </View>

        <Text
          style={{
            marginTop: 8,
            fontFamily: 'Inter_700Bold',
            fontSize: 28,
            letterSpacing: -0.4,
            color: '#4334d6',
            textAlign: 'center',
          }}
        >
          invitaqr
        </Text>
        <Text
          style={{
            marginTop: 10,
            fontFamily: 'Inter_400Regular',
            fontSize: 15,
            lineHeight: 22,
            color: '#5f5f5f',
            textAlign: 'center',
          }}
        >
          Aún no tienes eventos.{'\n'}Crea el primero y empieza a invitar.
        </Text>

        <Pressable
          onPress={onCreate}
          className="mt-7 w-full items-center rounded-full bg-indigo py-4 active:opacity-85"
        >
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#ffffff' }}>
            Crear evento
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  )
}
