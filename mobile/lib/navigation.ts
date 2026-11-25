import type { ImperativeRouter } from 'expo-router'

/** Empuja el evento sobre el listado para que el gesto de volver funcione. */
export function openEvent(router: ImperativeRouter, id: string) {
  router.push(`/(planner)/events/${id}`)
}

/** Vuelve al listado de eventos, que queda debajo en la misma pila. */
export function backToEventList(router: ImperativeRouter) {
  if (router.canGoBack()) {
    router.back()
    return
  }
  router.navigate('/(planner)/events')
}
