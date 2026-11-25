import { useQuery } from '@tanstack/react-query'
import { ScrollView, Text, View } from 'react-native'
import { StatusBadge } from '../../components/StatusBadge'
import { Screen } from '../../components/ui/Screen'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { BillingListSkeleton } from '../../components/ui/screen-skeletons'
import { apiErrorMessage, getPurchases } from '../../lib/api'
import { formatWhen } from '../../lib/format'
import { queryKeys } from '../../lib/query'
import { type as typography } from '../../lib/typography'
import type { PurchaseRecord } from '../../lib/types'

const PEOPLE: Record<PurchaseRecord['plan'], number> = {
  BASIC: 150,
  PRO: 500,
}

function money(amount: number, currency: string): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency || 'MXN',
    maximumFractionDigits: 0,
  }).format(amount / 100)
}

export default function BillingScreen() {
  const purchases = useQuery({
    queryKey: queryKeys.purchases,
    queryFn: getPurchases,
  })

  return (
    <Screen>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="Plan y facturación"
          eyebrow="Facturación"
          subtitle="Paquetes contratados, un pago por evento"
        />
        {purchases.isPending ? <BillingListSkeleton /> : null}
        {purchases.isError ? (
          <Text className="text-base text-red-700">{apiErrorMessage(purchases.error)}</Text>
        ) : null}
        {purchases.data && purchases.data.length === 0 ? (
          <View className="items-center rounded-[28px] border border-line bg-card px-5 py-8">
            <Text className="text-center" style={typography.section}>
              Todavía no hay paquetes contratados
            </Text>
            <Text className="mt-2 text-center" style={typography.body}>
              BASIC y PRO aparecen aquí cuando el pago queda confirmado.
            </Text>
          </View>
        ) : null}
        <View className="gap-3">
          {(purchases.data ?? []).map((item) => (
            <View key={item.id} className="rounded-[28px] border border-line bg-card px-5 py-5">
              <View className="flex-row items-start justify-between gap-3">
                <Text className="flex-1" style={typography.section}>
                  {item.eventName}
                </Text>
                <StatusBadge value={item.plan} large />
              </View>
              <Text className="mt-3 text-indigo" style={typography.title}>
                {money(item.amount, item.currency)}
              </Text>
              <Text className="mt-2" style={typography.body}>
                {`Paquete ${item.plan} · hasta ${PEOPLE[item.plan]} personas`}
              </Text>
              <Text className="mt-1" style={typography.caption}>
                {item.paidAt ? `Pagado el ${formatWhen(item.paidAt)}` : 'Pago confirmado'}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  )
}
