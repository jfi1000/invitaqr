import type { ImperativeRouter } from 'expo-router'

/** Abre un evento desde el listado sin acumular pantallas anteriores. */
export function openEvent(router: ImperativeRouter, id: string) {
  router.navigate(`/(planner)/events/${id}`)
}

/** Volver al listado de eventos (no al evento anterior del stack). */
export function backToEventList(router: ImperativeRouter) {
  router.navigate('/(planner)')
}
