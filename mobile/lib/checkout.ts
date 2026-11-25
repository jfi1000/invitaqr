import * as Linking from 'expo-linking'
import { Linking as NativeLinking, Platform } from 'react-native'

/** Direcciones a las que Stripe devuelve al usuario: la web o el esquema de la app. */
export function paymentReturnUrls(eventId: string, plan: 'BASIC' | 'PRO') {
  const event = encodeURIComponent(eventId)
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const origin = window.location.origin.replace(/\/$/, '')
    return {
      successUrl: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}&event_id=${event}&plan=${plan}`,
      cancelUrl: `${origin}/payment/cancel?event_id=${event}`,
    }
  }
  const successBase = Linking.createURL('/payment/success')
  const cancelBase = Linking.createURL('/payment/cancel')
  const withQuery = (base: string, query: string) =>
    `${base}${base.includes('?') ? '&' : '?'}${query}`
  return {
    successUrl: withQuery(
      successBase,
      `session_id={CHECKOUT_SESSION_ID}&event_id=${event}&plan=${plan}`,
    ),
    cancelUrl: withQuery(cancelBase, `event_id=${event}`),
  }
}

/** Abre Stripe Checkout. Al terminar, Stripe abre de nuevo esta app. */
export async function openStripeCheckout(url: string): Promise<void> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.assign(url)
    return
  }
  await NativeLinking.openURL(url)
}
