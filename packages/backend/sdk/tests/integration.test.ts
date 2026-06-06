import { describe, expect, it } from 'vitest';
import { FluxisClient } from '../src/client.js';
import { getTestCredentials, loadTestEnv } from './testenv.js';

loadTestEnv();

const credentials = getTestCredentials();

function createIntegrationClient(): FluxisClient {
  if (!credentials) {
    throw new Error('Integration credentials are required');
  }

  return new FluxisClient({
    apiKey: credentials.apiKey,
    apiSecret: credentials.apiSecret,
  });
}

if (!credentials) {
  describe.skip('staging integration', () => {});
} else {
  describe('staging integration', () => {
    const client = createIntegrationClient();

    it('gets organization', async () => {
      const org = await client.organization.get();
      expect(org.id).toBeTruthy();
      expect(org.name).toBeTruthy();
    });

    it('lists accounts', async () => {
      const accounts = await client.accounts.list();
      expect(Array.isArray(accounts)).toBe(true);
    });

    it('lists point of sale entries', async () => {
      const result = await client.pointOfSale.list({ page: 1, pageSize: 10 });
      expect(result.page).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('lists transactions', async () => {
      const result = await client.transactions.list({ page: 1, pageSize: 10 });
      expect(result.page).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('rejects invalid NASPIP token via API', async () => {
      await expect(
        client.naspip.read('v4.local.invalid-token-for-integration-test'),
      ).rejects.toMatchObject({ name: 'FluxisError' });
    });

    it('creates and deletes a test account', async () => {
      const name = `sdk-ts-test-${crypto.randomUUID().slice(0, 8)}`;
      const account = await client.accounts.create({ name });
      expect(account.name).toBe(name);
      expect(account.id).toBeTruthy();
      await client.accounts.delete(account.id);
    });

    it('validates NASPIP token format locally', () => {
      expect(client.naspip.isValidTokenFormat('v4.local.placeholder')).toBe(true);
      expect(client.naspip.isValidTokenFormat('invalid')).toBe(false);
    });
  });
}
