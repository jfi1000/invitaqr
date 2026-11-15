import type { Router } from 'expo-router'

/** Abre un evento desde el listado sin acumular pantallas anteriores. */
export function openEvent(router: Router, id: string) {
  router.navigate(`/(planner)/events/${id}`)
}

/** Volver al listado de eventos (no al evento anterior del stack). */
export function backToEventList(router: Router) {
  router.navigate('/(planner)/')
}
