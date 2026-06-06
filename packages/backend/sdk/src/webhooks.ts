import { createHmac, timingSafeEqual } from 'node:crypto';

const MAX_AGE_SECONDS = 10;

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

/**
 * Verify a Fluxis webhook signature.
 *
 * Fluxis signs webhook payloads using HMAC-SHA256 over
 * `"<timestamp>.<canonical_json>"`, where canonical JSON is the payload
 * with all object keys sorted recursively.
 *
 * Pass the parsed payload, the signature from `x-fluxis-signature`,
 * the timestamp from `x-fluxis-timestamp`, and the webhook secret obtained
 * when creating notification settings.
 */
export function verifyWebhookSignature(
  payload: unknown,
  signature: string,
  timestamp: string,
  secret: string,
): boolean {
  const requestTimestamp = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);

  if (Number.isNaN(requestTimestamp) || now - requestTimestamp > MAX_AGE_SECONDS) {
    return false;
  }

  const canonicalJson = JSON.stringify(sortKeys(payload));
  const signedString = `${timestamp}.${canonicalJson}`;
  const expectedSignature = createHmac('sha256', secret)
    .update(signedString)
    .digest('hex');

  if (signature.length !== expectedSignature.length) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );
}
