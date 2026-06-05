import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FluxisClient } from '../src/client.js';
import { AccountsResource } from '../src/resources/accounts.js';
import { OrganizationResource } from '../src/resources/organization.js';
import { PointOfSaleResource } from '../src/resources/pointOfSale.js';
import { NaspipResource } from '../src/resources/naspip.js';
import { RefundsResource } from '../src/resources/refunds.js';
import { TransactionsResource } from '../src/resources/transactions.js';

type RequestSpy = ReturnType<typeof vi.fn>;

function createMockClient(): FluxisClient & { request: RequestSpy } {
  const client = { request: vi.fn().mockResolvedValue(undefined) } as unknown as FluxisClient & { request: RequestSpy };
  return client;
}

describe('AccountsResource', () => {
  let client: ReturnType<typeof createMockClient>;
  let accounts: AccountsResource;

  beforeEach(() => {
    client = createMockClient();
    accounts = new AccountsResource(client);
  });

  it('list() calls GET /account', async () => {
    await accounts.list();
    expect(client.request).toHaveBeenCalledWith('GET', '/account');
  });

  it('get() calls GET /account/:id', async () => {
    await accounts.get('acc-1');
    expect(client.request).toHaveBeenCalledWith('GET', '/account/acc-1');
  });

  it('create() calls POST /account with body', async () => {
    const data = { name: 'Test' };
    await accounts.create(data);
    expect(client.request).toHaveBeenCalledWith('POST', '/account', data);
  });

  it('update() calls PUT /account/:id with body', async () => {
    const data = { name: 'Updated' };
    await accounts.update('acc-1', data);
    expect(client.request).toHaveBeenCalledWith('PUT', '/account/acc-1', data);
  });

  it('delete() calls DELETE /account/:id', async () => {
    await accounts.delete('acc-1');
    expect(client.request).toHaveBeenCalledWith('DELETE', '/account/acc-1');
  });

  it('getSettlementAddresses() calls GET /account/:id/settlement-addresses', async () => {
    await accounts.getSettlementAddresses('acc-1');
    expect(client.request).toHaveBeenCalledWith('GET', '/account/acc-1/settlement-addresses');
  });
});

describe('OrganizationResource', () => {
  let client: ReturnType<typeof createMockClient>;
  let org: OrganizationResource;

  beforeEach(() => {
    client = createMockClient();
    org = new OrganizationResource(client);
  });

  it('setSettlementAddresses() calls POST /organization/settlement-addresses', async () => {
    const data = [{ address: '0x1', network: 'polygon' }];
    await org.setSettlementAddresses(data);
    expect(client.request).toHaveBeenCalledWith('POST', '/organization/settlement-addresses', data);
  });

  it('updateSettlementAddresses() calls PUT /organization/settlement-addresses', async () => {
    const data = [{ address: '0x2', network: 'ethereum' }];
    await org.updateSettlementAddresses(data);
    expect(client.request).toHaveBeenCalledWith('PUT', '/organization/settlement-addresses', data);
  });
});

describe('PointOfSaleResource', () => {
  let client: ReturnType<typeof createMockClient>;
  let pos: PointOfSaleResource;

  beforeEach(() => {
    client = createMockClient();
    pos = new PointOfSaleResource(client);
  });

  it('list() calls GET /pos', async () => {
    await pos.list();
    expect(client.request).toHaveBeenCalledWith('GET', '/pos');
  });

  it('get() calls GET /pos/:id', async () => {
    await pos.get('pos-1');
    expect(client.request).toHaveBeenCalledWith('GET', '/pos/pos-1');
  });

  it('create() calls POST /pos with body', async () => {
    const data = { name: 'Store' };
    await pos.create(data);
    expect(client.request).toHaveBeenCalledWith('POST', '/pos', data);
  });

  it('update() calls PUT /pos/:id with body', async () => {
    const data = { name: 'Updated' };
    await pos.update('pos-1', data);
    expect(client.request).toHaveBeenCalledWith('PUT', '/pos/pos-1', data);
  });

  it('getNotifications() calls GET /pos/:id/notifications', async () => {
    await pos.getNotifications('pos-1');
    expect(client.request).toHaveBeenCalledWith('GET', '/pos/pos-1/notifications');
  });

  it('createNotifications() calls POST /pos/:id/notifications', async () => {
    const data = { webhookUrl: 'https://example.com/hook' };
    await pos.createNotifications('pos-1', data);
    expect(client.request).toHaveBeenCalledWith('POST', '/pos/pos-1/notifications', data);
  });

  it('updateNotifications() sends webhookUrl (not url)', async () => {
    const data = { webhookUrl: 'https://example.com/hook-v2' };
    await pos.updateNotifications('pos-1', data);
    expect(client.request).toHaveBeenCalledWith('PUT', '/pos/pos-1/notifications', data);
    const body = client.request.mock.calls[0]![2] as Record<string, unknown>;
    expect(body).toHaveProperty('webhookUrl');
    expect(body).not.toHaveProperty('url');
  });

  it('createPaymentRequest() calls POST /pos/:id/payment-request', async () => {
    const data = { amount: '10.00', uniqueAssetId: 'npolygon_t0x...' };
    await pos.createPaymentRequest('pos-1', data);
    expect(client.request).toHaveBeenCalledWith('POST', '/pos/pos-1/payment-request', data);
  });

  it('getPaymentRequest() calls GET /pos/:posId/payment-request/:prId', async () => {
    await pos.getPaymentRequest('pos-1', 'pr-1');
    expect(client.request).toHaveBeenCalledWith('GET', '/pos/pos-1/payment-request/pr-1');
  });

  it('createPaymentRequestCheckout() calls POST /pos/:id/payment-request-checkout', async () => {
    const data = { amount: '49.99', coinCode: 'USD' };
    await pos.createPaymentRequestCheckout('pos-1', data);
    expect(client.request).toHaveBeenCalledWith('POST', '/pos/pos-1/payment-request-checkout', data);
  });
});

describe('NaspipResource', () => {
  let client: ReturnType<typeof createMockClient>;
  let naspip: NaspipResource;

  beforeEach(() => {
    client = createMockClient();
    naspip = new NaspipResource(client);
  });

  it('create() calls POST /naspip/create', async () => {
    const data = { payment: { address: '0x1', amount: 10, uniqueAssetId: 'asset' } };
    await naspip.create(data);
    expect(client.request).toHaveBeenCalledWith('POST', '/naspip/create', data);
  });

  it('read() calls POST /naspip/read with token', async () => {
    await naspip.read('v4.local.test');
    expect(client.request).toHaveBeenCalledWith('POST', '/naspip/read', { token: 'v4.local.test' });
  });
});

describe('RefundsResource', () => {
  let client: ReturnType<typeof createMockClient>;
  let refunds: RefundsResource;

  beforeEach(() => {
    client = createMockClient();
    refunds = new RefundsResource(client);
  });

  it('create() calls POST /refunds/payment-request/:id', async () => {
    const data = { refundToAddress: '0x123' };
    await refunds.create('pr-1', data);
    expect(client.request).toHaveBeenCalledWith('POST', '/refunds/payment-request/pr-1', data);
  });

  it('get() calls GET /refunds/:id', async () => {
    await refunds.get('ref-1');
    expect(client.request).toHaveBeenCalledWith('GET', '/refunds/ref-1');
  });
});

describe('TransactionsResource', () => {
  let client: ReturnType<typeof createMockClient>;
  let txns: TransactionsResource;

  beforeEach(() => {
    client = createMockClient();
    txns = new TransactionsResource(client);
  });

  it('list() calls GET /transactions with no query when no options', async () => {
    await txns.list();
    expect(client.request).toHaveBeenCalledWith('GET', '/transactions', undefined, {});
  });

  it('list() maps accountId to accountID query param', async () => {
    await txns.list({ accountId: 'acc-1', limit: 10 });
    const query = client.request.mock.calls[0]![3] as Record<string, unknown>;
    expect(query).toHaveProperty('accountID', 'acc-1');
    expect(query).not.toHaveProperty('account_id');
    expect(query).toHaveProperty('limit', 10);
  });

  it('list() converts other options to snake_case', async () => {
    await txns.list({ status: 'completed', sort: 'created_at', order: 'desc' });
    const query = client.request.mock.calls[0]![3] as Record<string, unknown>;
    expect(query).toHaveProperty('status', 'completed');
    expect(query).toHaveProperty('sort', 'created_at');
    expect(query).toHaveProperty('order', 'desc');
  });
});
