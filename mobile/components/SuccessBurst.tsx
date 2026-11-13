import { useEffect, useMemo, useRef, useState } from 'react'
import { Dimensions, Modal, Pressable, Text, View } from 'react-native'
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { type as typography } from '../lib/typography'

const PAPER = '#f7f6fb'
/** Soft Monarch-like palette — discrete, celebratory */
const COLORS = [
  '#F6A88A',
  '#E8B4C8',
  '#A8C5F0',
  '#7EB8E8',
  '#B8A9F0',
  '#F0D56A',
  '#8FD4A8',
  '#F2A0B8',
  '#9BB8E8',
  '#D4A5F0',
]

type PieceShape = 'bar' | 'pill' | 'dot'

interface Piece {
  id: number
  color: string
  angle: number
  distance: number
  width: number
  height: number
  rotate: number
  delay: number
  shape: PieceShape
  drift: number
}

function ConfettiPiece({ piece, active }: { piece: Piece; active: boolean }) {
  const progress = useSharedValue(0)

  useEffect(() => {
    if (!active) {
      progress.value = 0
      return
    }
    progress.value = withDelay(
      piece.delay,
      withTiming(1, { duration: 1600, easing: Easing.out(Easing.cubic) }),
    )
  }, [active, piece.delay, progress])

  const style = useAnimatedStyle(() => {
    const t = progress.value
    const rad = (piece.angle * Math.PI) / 180
    const burst = interpolate(t, [0, 0.55, 1], [0, 1, 1])
    const fall = interpolate(t, [0, 0.55, 1], [0, 0, 28 + piece.drift])
    const x = Math.cos(rad) * piece.distance * burst + piece.drift * t * 0.35
    const y = Math.sin(rad) * piece.distance * burst + fall
    return {
      opacity: interpolate(t, [0, 0.08, 0.2, 1], [0, 1, 1, 0.92]),
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${piece.rotate * interpolate(t, [0, 0.5, 1], [0, 1, 1.08])}deg` },
        { scale: interpolate(t, [0, 0.15, 1], [0.35, 1, 1]) },
      ],
    }
  })

  const radius =
    piece.shape === 'pill' ? piece.height / 2 : piece.shape === 'dot' ? piece.width / 2 : 2.5

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: piece.width,
          height: piece.height,
          borderRadius: radius,
          backgroundColor: piece.color,
        },
        style,
      ]}
    />
  )
}

function buildPieces(): Piece[] {
  const { width, height } = Dimensions.get('window')
  const reach = Math.min(width, height) * 0.42
  const shapes: PieceShape[] = ['bar', 'pill', 'bar', 'dot', 'pill', 'bar']

  return Array.from({ length: 36 }, (_, id) => {
    const shape = shapes[id % shapes.length]
    const base = 7 + (id % 5) * 2.2
    const widthPx = shape === 'dot' ? base * 0.7 : shape === 'pill' ? base * 1.8 : base * 1.35
    const heightPx = shape === 'dot' ? base * 0.7 : shape === 'pill' ? base * 0.55 : base * 0.42

    return {
      id,
      color: COLORS[id % COLORS.length],
      angle: (360 / 36) * id + (id % 4) * 7 - 12,
      distance: reach * (0.55 + (id % 6) * 0.09) + (id % 3) * 12,
      width: widthPx,
      height: heightPx,
      rotate: -120 + (id % 9) * 28,
      delay: 40 + (id % 9) * 28 + (id % 3) * 12,
      shape,
      drift: ((id % 5) - 2) * 10,
    }
  })
}

interface SuccessBurstProps {
  visible: boolean
  title: string
  subtitle: string
  buttonLabel?: string
  onContinue: () => void
  onExited?: () => void
}

export function SuccessBurst({
  visible,
  title,
  subtitle,
  buttonLabel = 'Continuar',
  onContinue,
  onExited,
}: SuccessBurstProps) {
  const check = useSharedValue(0)
  const fade = useSharedValue(0)
  const content = useSharedValue(0)
  const confetti = useSharedValue(0)
  const [exiting, setExiting] = useState(false)
  const continueCalled = useRef(false)
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pieces = useMemo(() => buildPieces(), [])

  useEffect(() => {
    if (!visible) {
      setExiting(false)
      continueCalled.current = false
      if (exitTimer.current) {
        clearTimeout(exitTimer.current)
        exitTimer.current = null
      }
      check.value = 0
      fade.value = 0
      content.value = 0
      confetti.value = 0
      return
    }
    setExiting(false)
    continueCalled.current = false
    fade.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) })
    confetti.value = withDelay(
      80,
      withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }),
    )
    content.value = withDelay(
      40,
      withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }),
    )
    check.value = withDelay(120, withSpring(1, { damping: 10, stiffness: 140 }))
  }, [visible, check, fade, content, confetti])

  useEffect(() => {
    return () => {
      if (exitTimer.current) clearTimeout(exitTimer.current)
    }
  }, [])

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
  }))

  const confettiLayerStyle = useAnimatedStyle(() => ({
    opacity: confetti.value,
  }))

  const contentStyle = useAnimatedStyle(() => ({
    opacity: content.value,
    transform: [
      { translateY: interpolate(content.value, [0, 1], [10, 0]) },
      { scale: interpolate(content.value, [0, 1], [0.96, 1]) },
    ],
  }))

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: check.value }],
    opacity: check.value,
  }))

  function fireContinue() {
    if (continueCalled.current) return
    continueCalled.current = true
    onContinue()
  }

  function finishExit() {
    onExited?.()
  }

  function handleContinue() {
    if (exiting || !visible) return
    setExiting(true)

    content.value = withTiming(0, { duration: 280, easing: Easing.inOut(Easing.cubic) })
    check.value = withTiming(0, { duration: 240, easing: Easing.in(Easing.cubic) })
    confetti.value = withTiming(0, { duration: 300, easing: Easing.in(Easing.cubic) })

    exitTimer.current = setTimeout(() => {
      fireContinue()
      fade.value = withTiming(0, { duration: 420, easing: Easing.inOut(Easing.cubic) }, (finished) => {
        if (finished) {
          runOnJS(finishExit)()
        }
      })
    }, 300)
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleContinue}>
      <Animated.View
        style={[
          {
            flex: 1,
            backgroundColor: PAPER,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 28,
          },
          backdropStyle,
        ]}
        pointerEvents={visible && !exiting ? 'auto' : 'none'}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
            },
            confettiLayerStyle,
          ]}
        >
          {pieces.map((piece) => (
            <ConfettiPiece key={piece.id} piece={piece} active={visible} />
          ))}
        </Animated.View>

        <Animated.View style={[{ alignItems: 'center' }, contentStyle]}>
          <View
            style={{
              width: 120,
              height: 120,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 8,
            }}
          >
            <Animated.View
              style={[
                {
                  width: 88,
                  height: 88,
                  borderRadius: 44,
                  backgroundColor: '#34c759',
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                checkStyle,
              ]}
            >
              <Text style={{ color: '#fff', fontSize: 44, fontFamily: 'Inter_700Bold', marginTop: -4 }}>
                ✓
              </Text>
            </Animated.View>
          </View>

          <Text style={[typography.display, { textAlign: 'center' }]}>{title}</Text>
          <Text style={[typography.body, { textAlign: 'center', marginTop: 10, maxWidth: 300 }]}>
            {subtitle}
          </Text>
          <Pressable
            onPress={handleContinue}
            className="mt-8 items-center rounded-full bg-indigo px-10 py-4 active:opacity-85"
          >
            <Text style={typography.button}>{buttonLabel}</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  )
}