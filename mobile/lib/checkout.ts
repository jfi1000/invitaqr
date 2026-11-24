import { Linking, Platform } from 'react-native'

/** Abre Stripe Checkout. En web sale de la app y regresa a /payment/success o /payment/cancel. */
export async function openStripeCheckout(url: string): Promise<void> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.assign(url)
    return
  }
  await Linking.openURL(url)
}
