import type { ImperativeRouter } from 'expo-router'

/** Abre el evento sobre el listado. Si ya está en la pila, vuelve a esa copia. */
export function openEvent(router: ImperativeRouter, id: string) {
  router.navigate(`/(planner)/events/${id}`)
}

/** Sale de pago u otra pantalla suelta y deja solo el evento sobre el listado. */
export function returnToEvent(router: ImperativeRouter, id: string) {
  router.dismissTo(`/(planner)/events/${id}`)
}

/** Vuelve al listado y quita las pantallas del evento que hayan quedado encima. */
export function backToEventList(router: ImperativeRouter) {
  router.dismissTo('/(planner)/events')
}
