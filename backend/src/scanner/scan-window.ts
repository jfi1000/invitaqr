/** Minutos antes de `startsAt` en los que ya se puede escanear. */
export const SCAN_EARLY_MINUTES = 60;

export function scanOpensAt(startsAt: Date): Date {
  return new Date(startsAt.getTime() - SCAN_EARLY_MINUTES * 60 * 1000);
}

export function isWithinScanWindow(
  nowMs: number,
  startsAt: Date,
  endsAt: Date,
): boolean {
  const opensAt = scanOpensAt(startsAt).getTime();
  return nowMs >= opensAt && nowMs <= endsAt.getTime();
}
