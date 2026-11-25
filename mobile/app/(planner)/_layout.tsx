import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'

function tabIconColor(color: unknown): string {
  return typeof color === 'string' ? color : '#8d86a6'
}

export default function PlannerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4334d6',
        tabBarInactiveTintColor: '#8d86a6',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e6e2f2',
          height: 68,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: 'Inter_600SemiBold',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="events"
        options={{
          title: 'Eventos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={tabIconColor(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none', width: 0, height: 0 },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={tabIconColor(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="billing"
        options={{
          title: 'Facturación',
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none', width: 0, height: 0 },
        }}
      />
    </Tabs>
  )
}
