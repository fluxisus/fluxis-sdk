/** True when server-adjusted now is at or past expiresAt (same clock basis as CountdownTimer). */
export function isCheckoutSessionPastExpiry(expiresAt: string, offsetMs: number): boolean {
  const expiryMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiryMs)) return false;
  return Date.now() + offsetMs >= expiryMs;
}

/** Overlay fallback when polling has not flipped status to expired yet. */
export const EXPIRED_OVERLAY_FALLBACK_MS = 45_000;
