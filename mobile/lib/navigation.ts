import { CommonActions, type NavigationProp, type ParamListBase } from '@react-navigation/native'
import type { Router } from 'expo-router'

type Nav = NavigationProp<ParamListBase>

/** Limpia el stack oculto de `events` (tabs lo conservan al volver al listado). */
export function resetEventsStack(navigation: Nav) {
  const tabNav = navigation.getParent() ?? navigation
  const state = tabNav.getState()
  if (!state?.routes?.some((route) => route.name === 'events')) {
    return
  }

  tabNav.dispatch(
    CommonActions.reset({
      ...state,
      routes: state.routes.map((route) =>
        route.name === 'events' ? { name: 'events', key: route.key } : route,
      ),
    }),
  )
}

/** Abre un evento desde el listado sin acumular pantallas anteriores. */
export function openEvent(navigation: Nav, router: Router, id: string) {
  resetEventsStack(navigation)
  // Esperar al reset del tab stack antes de empujar la pantalla nueva.
  requestAnimationFrame(() => {
    router.push(`/(planner)/events/${id}`)
  })
}

/** Volver al listado de eventos (no al evento anterior del stack). */
export function backToEventList(router: Router) {
  router.navigate('/(planner)/')
}
