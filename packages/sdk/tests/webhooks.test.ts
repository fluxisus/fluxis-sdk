import { describe, expect, it } from 'vitest';
import { verifyWebhookSignature } from '../src/webhooks.js';

async function computeHmac(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

describe('verifyWebhookSignature', () => {
  const secret = 'webhook-test-secret-123';

  it('returns true for a valid signature', async () => {
    const payload = JSON.stringify({ id: 'pay-1', status: 'completed' });
    const signature = await computeHmac(payload, secret);

    const result = await verifyWebhookSignature(payload, signature, secret);
    expect(result).toBe(true);
  });

  it('returns false for a tampered payload', async () => {
    const payload = JSON.stringify({ id: 'pay-1', status: 'completed' });
    const signature = await computeHmac(payload, secret);

    const tampered = JSON.stringify({ id: 'pay-1', status: 'failed' });
    const result = await verifyWebhookSignature(tampered, signature, secret);
    expect(result).toBe(false);
  });

  it('returns false for a wrong secret', async () => {
    const payload = JSON.stringify({ id: 'pay-1', status: 'completed' });
    const signature = await computeHmac(payload, 'wrong-secret');

    const result = await verifyWebhookSignature(payload, signature, secret);
    expect(result).toBe(false);
  });

  it('returns false for mismatched length signatures', async () => {
    const payload = JSON.stringify({ id: 'pay-1' });
    const result = await verifyWebhookSignature(payload, 'abc', secret);
    expect(result).toBe(false);
  });

  it('returns false for an empty signature', async () => {
    const payload = JSON.stringify({ id: 'pay-1' });
    const result = await verifyWebhookSignature(payload, '', secret);
    expect(result).toBe(false);
  });

  it('handles empty payload without crashing', async () => {
    const signature = await computeHmac('', secret);
    const result = await verifyWebhookSignature('', signature, secret);
    expect(result).toBe(true);
  });
});
