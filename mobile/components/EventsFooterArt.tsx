import { Text, View } from 'react-native'
import { type as typography } from '../lib/typography'
import { AppButton } from './ui/AppButton'

interface EventsFooterArtProps {
  onCreate: () => void
}

export function EventsFooterArt({ onCreate }: EventsFooterArtProps) {
  return (
    <View className="mb-4 mt-2 overflow-hidden rounded-[28px] border border-line bg-card px-5 py-6">
      <View style={{ height: 150, alignItems: 'center', justifyContent: 'center' }}>
        {/* Calendar */}
        <View
          style={{
            position: 'absolute',
            left: 18,
            top: 28,
            width: 72,
            height: 78,
            borderRadius: 14,
            backgroundColor: '#f4f1f8',
            borderWidth: 2,
            borderColor: '#d8d2ef',
            overflow: 'hidden',
          }}
        >
          <View style={{ height: 18, backgroundColor: '#4334d6' }} />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: '#7c6bff',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 18 }}>+</Text>
            </View>
          </View>
        </View>

        {/* QR block */}
        <View
          style={{
            position: 'absolute',
            right: 16,
            top: 18,
            width: 64,
            height: 64,
            borderRadius: 12,
            backgroundColor: '#2a2348',
            padding: 8,
            transform: [{ rotate: '8deg' }],
          }}
        >
          <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
            {[1, 0.7, 0.85, 0.55, 1, 0.65, 0.9, 0.5, 1].map((opacity, index) => (
              <View
                key={index}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  backgroundColor: `rgba(255,255,255,${opacity})`,
                }}
              />
            ))}
          </View>
        </View>

        {/* Person */}
        <View style={{ alignItems: 'center', marginTop: 8 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: '#7c6bff',
              marginBottom: 4,
            }}
          />
          <View
            style={{
              width: 54,
              height: 48,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              backgroundColor: '#4334d6',
            }}
          />
          <View
            style={{
              position: 'absolute',
              right: -18,
              top: 28,
              width: 18,
              height: 28,
              borderRadius: 6,
              backgroundColor: '#1a1528',
            }}
          />
        </View>

        {/* Ticket */}
        <View
          style={{
            position: 'absolute',
            right: 42,
            bottom: 8,
            width: 54,
            height: 28,
            borderRadius: 8,
            backgroundColor: '#f6b7c6',
            transform: [{ rotate: '-18deg' }],
            borderWidth: 1,
            borderColor: '#f0a0b4',
          }}
        />
      </View>

      <Text style={[typography.section, { textAlign: 'center', marginTop: 8 }]}>
        ¡Crea tu evento o gestiona los borradores!
      </Text>
      <Text style={[typography.body, { textAlign: 'center', marginTop: 8 }]}>
        Organiza invitados, confirma asistencia y controla el acceso con QR.
      </Text>
      <AppButton className="mt-5" label="Comenzar evento nuevo" onPress={onCreate} />
    </View>
  )
}
