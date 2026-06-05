import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyWebhookSignature } from '../src/webhooks.js';

function computeSignature(
  payload: unknown,
  timestamp: string,
  secret: string,
): string {
  function sortKeys(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map(sortKeys);
    }
    if (value !== null && typeof value === 'object') {
      return Object.keys(value as object)
        .sort()
        .reduce(
          (acc, key) => {
            acc[key] = sortKeys((value as Record<string, unknown>)[key]);
            return acc;
          },
          {} as Record<string, unknown>,
        );
    }
    return value;
  }

  const canonicalJson = JSON.stringify(sortKeys(payload));
  const signedString = `${timestamp}.${canonicalJson}`;
  return createHmac('sha256', secret).update(signedString).digest('hex');
}

describe('verifyWebhookSignature', () => {
  const secret = 'webhook-test-secret-123';
  const timestamp = () => Math.floor(Date.now() / 1000).toString();

  it('returns true for a valid signature', () => {
    const payload = { id: 'pay-1', status: 'completed' };
    const ts = timestamp();
    const signature = computeSignature(payload, ts, secret);

    expect(verifyWebhookSignature(payload, signature, ts, secret)).toBe(true);
  });

  it('returns true when payload keys are in a different order', () => {
    const payload = { status: 'completed', id: 'pay-1' };
    const ts = timestamp();
    const signature = computeSignature({ id: 'pay-1', status: 'completed' }, ts, secret);

    expect(verifyWebhookSignature(payload, signature, ts, secret)).toBe(true);
  });

  it('returns false for a tampered payload', () => {
    const payload = { id: 'pay-1', status: 'completed' };
    const ts = timestamp();
    const signature = computeSignature(payload, ts, secret);

    expect(
      verifyWebhookSignature({ id: 'pay-1', status: 'failed' }, signature, ts, secret),
    ).toBe(false);
  });

  it('returns false for a wrong secret', () => {
    const payload = { id: 'pay-1', status: 'completed' };
    const ts = timestamp();
    const signature = computeSignature(payload, ts, 'wrong-secret');

    expect(verifyWebhookSignature(payload, signature, ts, secret)).toBe(false);
  });

  it('returns false for an expired timestamp', () => {
    const payload = { id: 'pay-1', status: 'completed' };
    const ts = (Math.floor(Date.now() / 1000) - 11).toString();
    const signature = computeSignature(payload, ts, secret);

    expect(verifyWebhookSignature(payload, signature, ts, secret)).toBe(false);
  });

  it('returns false for an invalid timestamp', () => {
    const payload = { id: 'pay-1', status: 'completed' };
    const signature = computeSignature(payload, timestamp(), secret);

    expect(verifyWebhookSignature(payload, signature, 'not-a-timestamp', secret)).toBe(false);
  });

  it('returns false for mismatched length signatures', () => {
    const payload = { id: 'pay-1' };
    expect(verifyWebhookSignature(payload, 'abc', timestamp(), secret)).toBe(false);
  });

  it('returns false for an empty signature', () => {
    const payload = { id: 'pay-1' };
    expect(verifyWebhookSignature(payload, '', timestamp(), secret)).toBe(false);
  });

  it('handles nested objects with sorted keys', () => {
    const payload = {
      event: 'payment.completed',
      data: { z: 1, a: { y: 2, b: 3 } },
    };
    const ts = timestamp();
    const signature = computeSignature(payload, ts, secret);

    expect(verifyWebhookSignature(payload, signature, ts, secret)).toBe(true);
  });
});
