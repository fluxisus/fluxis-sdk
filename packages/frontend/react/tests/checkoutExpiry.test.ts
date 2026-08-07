import { describe, expect, it } from 'vitest';
import { isCheckoutSessionPastExpiry } from '../src/utils/checkoutExpiry.js';

describe('isCheckoutSessionPastExpiry', () => {
  it('returns true when server-adjusted now is past expires_at', () => {
    const expiresAt = new Date(Date.now() - 60_000).toISOString();
    expect(isCheckoutSessionPastExpiry(expiresAt, 0)).toBe(true);
  });

  it('returns false when expires_at is still in the future', () => {
    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    expect(isCheckoutSessionPastExpiry(expiresAt, 0)).toBe(false);
  });

  it('applies offsetMs the same way as CountdownTimer', () => {
    const expiresAt = new Date(Date.now() + 30_000).toISOString();
    expect(isCheckoutSessionPastExpiry(expiresAt, 0)).toBe(false);
    expect(isCheckoutSessionPastExpiry(expiresAt, 60_000)).toBe(true);
  });
});
