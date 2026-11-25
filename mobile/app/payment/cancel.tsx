import { useLocalSearchParams, useRouter } from 'expo-router'
import { Text } from 'react-native'
import { AppButton } from '../../components/ui/AppButton'
import { Screen } from '../../components/ui/Screen'
import { ScreenHeader } from '../../components/ui/ScreenHeader'

export default function PaymentCancelScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ event_id?: string }>()
  const eventId = Array.isArray(params.event_id) ? params.event_id[0] : params.event_id

  return (
    <Screen>
      <ScreenHeader title="Pago cancelado" eyebrow="InvitaQR" showBack={false} />
      <Text className="mt-4 text-base text-inkwell" style={{ fontFamily: 'Inter_500Medium' }}>
        No se hizo el cargo. El evento sigue en borrador y puedes intentar de nuevo.
      </Text>
      <AppButton
        className="mt-6"
        label={eventId ? 'Volver al evento' : 'Volver a mis eventos'}
        onPress={() => {
          if (eventId) {
            router.replace(`/(planner)/events/${eventId}`)
            return
          }
          router.replace('/(planner)')
        }}
      />
    </Screen>
  )
}
