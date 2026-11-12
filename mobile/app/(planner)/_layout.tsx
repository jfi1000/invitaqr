import { Tabs } from 'expo-router'

export default function PlannerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1c1915',
        tabBarInactiveTintColor: '#8a8175',
        tabBarStyle: {
          backgroundColor: '#fffaf3',
          borderTopColor: '#e4d8c4',
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 14, fontWeight: '700' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Eventos' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
      <Tabs.Screen name="events" options={{ href: null }} />
    </Tabs>
  )
}
