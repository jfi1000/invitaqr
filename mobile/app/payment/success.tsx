import { useGlobalSearchParams, useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect } from 'react'
import { Platform, Text, View } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { AppButton } from '../../components/ui/AppButton'
import { PlanLineSkeleton } from '../../components/ui/screen-skeletons'
import { Screen } from '../../components/ui/Screen'
import { useEvent } from '../../hooks/useEvents'
import { returnToEvent } from '../../lib/navigation'
import { queryKeys } from '../../lib/query'
import { type as typography } from '../../lib/typography'
import { useAuthStore } from '../../stores/auth.store'

function one(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value
  return raw?.trim() ?? ''
}

function asPlan(value: string | null | undefined): 'BASIC' | 'PRO' | '' {
  const chosen = (value ?? '').toUpperCase()
  return chosen === 'BASIC' || chosen === 'PRO' ? chosen : ''
}

function planFromAddress(): string {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return ''
  return new URLSearchParams(window.location.search).get('plan') ?? ''
}

export default function PaymentSuccessScreen() {
  const router = useRouter()
  const client = useQueryClient()
  const name = useAuthStore((state) => state.user?.name?.trim()) || ''
  const params = useLocalSearchParams<{ event_id?: string; plan?: string }>()
  const globalParams = useGlobalSearchParams<{ event_id?: string; plan?: string }>()
  const eventId = one(params.event_id) || one(globalParams.event_id)
  const eventQuery = useEvent(eventId)
  const event = eventQuery.data
  const plan =
    asPlan(one(params.plan)) ||
    asPlan(one(globalParams.plan)) ||
    asPlan(planFromAddress()) ||
    asPlan(event?.paidPlan) ||
    asPlan(event?.plan)

  useEffect(() => {
    void client.invalidateQueries({ queryKey: queryKeys.events })
    if (eventId) {
      void client.invalidateQueries({ queryKey: queryKeys.event(eventId) })
    }
  }, [client, eventId])

  useEffect(() => {
    if (!eventId || plan) return
    const timer = setInterval(() => {
      void client.invalidateQueries({ queryKey: queryKeys.event(eventId) })
    }, 1000)
    return () => clearInterval(timer)
  }, [client, eventId, plan])

  return (
    <Screen>
      <View className="flex-1 items-center justify-center">
        <View className="w-full items-center" style={{ maxWidth: 420 }}>
          <Text style={typography.label}>INVITAQR</Text>
          <Text className="mt-4 text-center" style={typography.display}>
            Pago recibido
          </Text>
          <Text
            className="mt-8 text-center text-inkwell"
            style={{ fontFamily: 'Inter_600SemiBold', fontSize: 22, lineHeight: 30 }}
          >
            {name ? `Gracias, ${name}.` : 'Gracias.'}
          </Text>
          {plan ? (
            <Text
              className="mt-3 text-center text-indigo"
              style={{ fontFamily: 'Inter_700Bold', fontSize: 28, lineHeight: 34 }}
            >
              {`Tienes el plan ${plan}.`}
            </Text>
          ) : eventId ? (
            <PlanLineSkeleton />
          ) : null}
          <View className="mt-10 w-full">
            <AppButton
              label={eventId ? 'Volver al evento' : 'Volver a mis eventos'}
              onPress={() => {
                if (eventId) {
                  returnToEvent(router, eventId)
                  return
                }
                router.dismissTo('/(planner)/events')
              }}
            />
          </View>
        </View>
      </View>
    </Screen>
  )
}
