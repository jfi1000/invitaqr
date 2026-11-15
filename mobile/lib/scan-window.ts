/** Debe coincidir con backend/src/scanner/scan-window.ts */
export const SCAN_EARLY_MINUTES = 60

export function scanOpensAt(startsAtIso: string): Date {
  return new Date(new Date(startsAtIso).getTime() - SCAN_EARLY_MINUTES * 60 * 1000)
}
