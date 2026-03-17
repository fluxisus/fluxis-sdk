import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FluxisClient } from '../src/client.js';
import { FluxisAuthError, FluxisError, FluxisNetworkError, FluxisResponseParseError } from '../src/errors.js';

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function authSuccessResponse(expiresInMs = 3_600_000): Response {
  return jsonResponse({
    status: 'success',
    data: {
      token: 'v4.local.test-token',
      expired_at: new Date(Date.now() + expiresInMs).toISOString(),
    },
  });
}

function apiSuccessResponse(data: unknown, status = 200): Response {
  return jsonResponse({ status: 'success', data }, status);
}

function apiErrorResponse(code: string, message: string, status: number, details?: string): Response {
  return jsonResponse({ status: 'error', code, message, details }, status);
}

function createClient(): FluxisClient {
  return new FluxisClient({
    apiKey: 'fxs.stg.test-key',
    apiSecret: 'test-secret',
    environment: 'staging',
  });
}

describe('FluxisClient', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('authentication', () => {
    it('authenticates on first request and caches the token', async () => {
      fetchSpy
        .mockResolvedValueOnce(authSuccessResponse())
        .mockResolvedValueOnce(apiSuccessResponse([{ id: '1', name: 'Acc' }]))
        .mockResolvedValueOnce(apiSuccessResponse([{ id: '2', name: 'Acc2' }]));

      const client = createClient();
      await client.accounts.list();
      await client.accounts.list();

      // Auth called once, then two API calls
      expect(fetchSpy).toHaveBeenCalledTimes(3);
      const authCall = fetchSpy.mock.calls[0]!;
      expect(authCall[0]).toBe('https://api.stgfluxis.us/v1/auth/token');
    });

    it('refreshes token when expired', async () => {
      fetchSpy
        .mockResolvedValueOnce(authSuccessResponse(100)) // expires almost immediately
        .mockResolvedValueOnce(apiSuccessResponse([]))
        .mockResolvedValueOnce(authSuccessResponse()) // second auth
        .mockResolvedValueOnce(apiSuccessResponse([]));

      const client = createClient();
      await client.accounts.list();

      // Wait for token to expire (buffer is 60s, token expires in 100ms, so it's already expired)
      await new Promise((r) => setTimeout(r, 10));

      await client.accounts.list();

      expect(fetchSpy).toHaveBeenCalledTimes(4);
      expect(fetchSpy.mock.calls[0]![0]).toContain('/auth/token');
      expect(fetchSpy.mock.calls[2]![0]).toContain('/auth/token');
    });

    it('deduplicates concurrent auth requests', async () => {
      let authCallCount = 0;
      fetchSpy.mockImplementation((url) => {
        const urlStr = typeof url === 'string' ? url : (url as Request).url;
        if (urlStr.includes('/auth/token')) {
          authCallCount++;
          return Promise.resolve(authSuccessResponse());
        }
        return Promise.resolve(apiSuccessResponse([]));
      });

      const client = createClient();
      await Promise.all([
        client.accounts.list(),
        client.accounts.list(),
        client.accounts.list(),
      ]);

      expect(authCallCount).toBe(1);
    });
  });

  describe('401 retry', () => {
    it('retries once on 401 with fresh auth', async () => {
      fetchSpy
        .mockResolvedValueOnce(authSuccessResponse()) // initial auth
        .mockResolvedValueOnce(apiErrorResponse('AUTH_EXPIRED', 'Token expired', 401)) // first attempt
        .mockResolvedValueOnce(authSuccessResponse()) // re-auth
        .mockResolvedValueOnce(apiSuccessResponse({ id: '1' })); // retry succeeds

      const client = createClient();
      const result = await client.accounts.get('1');

      expect(result).toEqual({ id: '1' });
      expect(fetchSpy).toHaveBeenCalledTimes(4);
    });

    it('throws FluxisError (not FluxisAuthError) on second 401', async () => {
      fetchSpy
        .mockResolvedValueOnce(authSuccessResponse())
        .mockResolvedValueOnce(apiErrorResponse('AUTH_EXPIRED', 'Token expired', 401))
        .mockResolvedValueOnce(authSuccessResponse())
        .mockResolvedValueOnce(apiErrorResponse('AUTH_EXPIRED', 'Still expired', 401));

      const client = createClient();
      const err = await client.accounts.get('1').catch((e: unknown) => e);
      expect(err).toBeInstanceOf(FluxisError);
      expect(err).not.toBeInstanceOf(FluxisAuthError);
    });
  });

  describe('response parsing', () => {
    it('handles empty response body gracefully', async () => {
      fetchSpy
        .mockResolvedValueOnce(authSuccessResponse())
        .mockResolvedValueOnce(new Response('', { status: 200 }));

      const client = createClient();
      const result = await client.accounts.delete('123');
      expect(result).toBeUndefined();
    });

    it('handles 204 No Content', async () => {
      fetchSpy
        .mockResolvedValueOnce(authSuccessResponse())
        .mockResolvedValueOnce(new Response(null, { status: 204 }));

      const client = createClient();
      const result = await client.accounts.delete('123');
      expect(result).toBeUndefined();
    });

    it('throws FluxisResponseParseError on non-JSON response', async () => {
      fetchSpy
        .mockResolvedValueOnce(authSuccessResponse())
        .mockResolvedValueOnce(new Response('<html>502 Bad Gateway</html>', { status: 502 }));

      const client = createClient();

      try {
        await client.accounts.list();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(FluxisResponseParseError);
        const parseErr = err as FluxisResponseParseError;
        expect(parseErr.rawBody).toContain('502 Bad Gateway');
        expect(parseErr.statusCode).toBe(502);
        expect(parseErr.method).toBe('GET');
        expect(parseErr.path).toBe('/account');
      }
    });

    it('throws FluxisError with API error details', async () => {
      fetchSpy
        .mockResolvedValueOnce(authSuccessResponse())
        .mockResolvedValueOnce(apiErrorResponse('VAL001', 'Invalid amount', 400, 'Amount must be positive'));

      const client = createClient();

      try {
        await client.pointOfSale.createPaymentRequest('pos-1', {
          amount: '-1',
          uniqueAssetId: 'npolygon_t0x...',
        });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(FluxisError);
        const apiErr = err as FluxisError;
        expect(apiErr.code).toBe('VAL001');
        expect(apiErr.details).toBe('Amount must be positive');
        expect(apiErr.statusCode).toBe(400);
        expect(apiErr.method).toBe('POST');
        expect(apiErr.path).toBe('/pos/pos-1/payment-request');
        expect(apiErr.message).toContain('POST /pos/pos-1/payment-request');
        expect(apiErr.message).toContain('Invalid amount');
      }
    });
  });

  describe('network errors', () => {
    it('wraps fetch failures in FluxisNetworkError', async () => {
      fetchSpy
        .mockResolvedValueOnce(authSuccessResponse())
        .mockRejectedValueOnce(new TypeError('fetch failed'));

      const client = createClient();
      await expect(client.accounts.list()).rejects.toThrow(FluxisNetworkError);
    });

    it('wraps auth network failures in FluxisNetworkError', async () => {
      fetchSpy.mockRejectedValueOnce(new TypeError('fetch failed'));

      const client = createClient();
      await expect(client.accounts.list()).rejects.toThrow(FluxisNetworkError);
    });
  });

  describe('query string', () => {
    it('filters out undefined query params', async () => {
      fetchSpy
        .mockResolvedValueOnce(authSuccessResponse())
        .mockResolvedValueOnce(apiSuccessResponse({ data: [], total: 0, limit: 50, offset: 0 }));

      const client = createClient();
      await client.transactions.list({ limit: 10, status: undefined });

      const callUrl = fetchSpy.mock.calls[1]![0] as string;
      expect(callUrl).toContain('limit=10');
      expect(callUrl).not.toContain('status');
    });
  });

  describe('camelCase conversion', () => {
    it('converts response keys from snake_case to camelCase', async () => {
      fetchSpy
        .mockResolvedValueOnce(authSuccessResponse())
        .mockResolvedValueOnce(
          apiSuccessResponse({
            id: 'acc-1',
            external_id: 'ext-1',
            created_at: '2025-01-01',
          }),
        );

      const client = createClient();
      const account = await client.accounts.get('acc-1');
      expect(account).toEqual({
        id: 'acc-1',
        externalId: 'ext-1',
        createdAt: '2025-01-01',
      });
    });

    it('converts request body keys from camelCase to snake_case', async () => {
      fetchSpy
        .mockResolvedValueOnce(authSuccessResponse())
        .mockResolvedValueOnce(apiSuccessResponse({ id: 'pos-1', name: 'Store' }));

      const client = createClient();
      await client.pointOfSale.create({
        name: 'Store',
        accountId: 'acc-1',
        paymentOptions: ['asset-1'],
      });

      const requestBody = JSON.parse(fetchSpy.mock.calls[1]![1]!.body as string);
      expect(requestBody).toEqual({
        name: 'Store',
        account_id: 'acc-1',
        payment_options: ['asset-1'],
      });
    });
  });
});
