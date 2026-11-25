import { View } from 'react-native'
import { Skeleton } from './Skeleton'

function EventCardSkeleton() {
  return (
    <View className="mb-3 rounded-3xl border border-line bg-card px-4 py-4">
      <View className="flex-row items-start gap-3">
        <Skeleton width={52} height={52} radius={14} />
        <View className="flex-1">
          <View className="flex-row items-center justify-between gap-3">
            <Skeleton width="62%" height={18} />
            <Skeleton width={72} height={22} radius={999} />
          </View>
          <Skeleton width="84%" height={12} style={{ marginTop: 10 }} />
          <Skeleton width="58%" height={12} style={{ marginTop: 8 }} />
        </View>
      </View>
      <View className="mt-4 flex-row">
        {[0, 1, 2].map((key) => (
          <View key={key} className="flex-1 items-center">
            <Skeleton width={36} height={26} />
            <Skeleton width={48} height={10} style={{ marginTop: 6 }} />
          </View>
        ))}
      </View>
    </View>
  )
}

export function EventListSkeleton() {
  return (
    <View>
      <EventCardSkeleton />
      <EventCardSkeleton />
      <EventCardSkeleton />
    </View>
  )
}

export function EventDetailSkeleton() {
  return (
    <View>
      <View className="items-center rounded-[28px] border border-line bg-card px-5 pb-6 pt-7">
        <Skeleton width={88} height={88} radius={24} />
        <Skeleton width="70%" height={28} style={{ marginTop: 16 }} />
        <View className="mt-4 flex-row gap-2">
          <Skeleton width={72} height={26} radius={999} />
          <Skeleton width={84} height={26} radius={999} />
          <Skeleton width={68} height={26} radius={999} />
        </View>
      </View>
      <View className="mt-4 rounded-[28px] border border-line bg-card px-5 py-5">
        <Skeleton width="88%" height={14} />
        <Skeleton width="64%" height={14} style={{ marginTop: 14 }} />
        <Skeleton width="76%" height={14} style={{ marginTop: 14 }} />
        <Skeleton width="42%" height={14} style={{ marginTop: 14 }} />
      </View>
      <View className="mt-4 rounded-[28px] border border-line bg-card px-5 py-5">
        <Skeleton width="46%" height={16} />
        <Skeleton width="92%" height={12} style={{ marginTop: 12 }} />
        <Skeleton width="70%" height={12} style={{ marginTop: 8 }} />
      </View>
      <Skeleton height={52} radius={999} style={{ marginTop: 20 }} />
      <Skeleton height={52} radius={999} style={{ marginTop: 12 }} />
      <Skeleton height={52} radius={999} style={{ marginTop: 12 }} />
    </View>
  )
}

function RowSkeleton({ withAction = false }: { withAction?: boolean }) {
  return (
    <View className="mb-3 rounded-3xl border border-line bg-card px-4 py-4">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Skeleton width="54%" height={18} />
          <Skeleton width="78%" height={12} style={{ marginTop: 8 }} />
        </View>
        <Skeleton width={78} height={24} radius={999} />
      </View>
      {withAction ? <Skeleton height={44} radius={999} style={{ marginTop: 14 }} /> : null}
    </View>
  )
}

export function GuestListSkeleton() {
  return (
    <View>
      <RowSkeleton />
      <RowSkeleton />
      <RowSkeleton />
      <RowSkeleton />
    </View>
  )
}

export function StaffListSkeleton() {
  return (
    <View>
      <RowSkeleton withAction />
      <RowSkeleton withAction />
      <RowSkeleton withAction />
    </View>
  )
}

export function PassListSkeleton() {
  return (
    <View>
      <RowSkeleton withAction />
      <RowSkeleton withAction />
      <RowSkeleton withAction />
    </View>
  )
}

export function BillingListSkeleton() {
  return (
    <View className="gap-3">
      {[0, 1].map((key) => (
        <View key={key} className="rounded-[28px] border border-line bg-card px-5 py-5">
          <View className="flex-row items-center justify-between gap-3">
            <Skeleton width="58%" height={18} />
            <Skeleton width={72} height={26} radius={999} />
          </View>
          <Skeleton width={120} height={28} style={{ marginTop: 16 }} />
          <Skeleton width="72%" height={14} style={{ marginTop: 12 }} />
          <Skeleton width="48%" height={12} style={{ marginTop: 8 }} />
        </View>
      ))}
    </View>
  )
}

export function ProfileSkeleton() {
  return (
    <View>
      <View className="mt-2 rounded-[28px] border border-line bg-card p-5">
        <Skeleton width={56} height={56} radius={16} />
        <Skeleton width="48%" height={22} style={{ marginTop: 16 }} />
        <Skeleton width="70%" height={14} style={{ marginTop: 10 }} />
        <Skeleton width={88} height={24} radius={999} style={{ marginTop: 16 }} />
      </View>
      <View className="mt-4 gap-2">
        {[0, 1, 2, 3, 4, 5].map((key) => (
          <View
            key={key}
            className="flex-row items-center rounded-2xl border border-line bg-card px-4 py-4"
          >
            <Skeleton width={40} height={40} radius={999} />
            <View className="ml-3 flex-1">
              <Skeleton width="62%" height={16} />
              {key === 1 ? <Skeleton width="46%" height={12} style={{ marginTop: 8 }} /> : null}
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

export function RsvpSkeleton() {
  return (
    <View className="flex-1 items-center pt-8">
      <Skeleton width={88} height={88} radius={22} />
      <Skeleton width={110} height={12} style={{ marginTop: 18 }} />
      <Skeleton width="78%" height={32} style={{ marginTop: 14 }} />
      <Skeleton width="64%" height={14} style={{ marginTop: 14 }} />
      <Skeleton width="52%" height={14} style={{ marginTop: 8 }} />
      <View className="mt-8 w-full">
        <Skeleton height={52} radius={999} />
        <Skeleton height={52} radius={999} style={{ marginTop: 12 }} />
      </View>
    </View>
  )
}

export function QrSkeleton() {
  return (
    <View className="mt-2 items-center rounded-[28px] border border-line bg-card p-6">
      <Skeleton width={72} height={72} radius={18} />
      <Skeleton width="60%" height={26} style={{ marginTop: 16 }} />
      <Skeleton width="46%" height={14} style={{ marginTop: 10 }} />
      <Skeleton width={220} height={220} radius={16} style={{ marginTop: 20 }} />
    </View>
  )
}

export function PlanLineSkeleton() {
  return (
    <View className="mt-3 items-center">
      <Skeleton width={220} height={28} radius={10} />
    </View>
  )
}
