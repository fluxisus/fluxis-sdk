import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FluxisClient } from '../src/client.js';
import { AccountsResource } from '../src/resources/accounts.js';
import { OrganizationResource } from '../src/resources/organization.js';
import { PointOfSaleResource } from '../src/resources/pointOfSale.js';
import { NaspipResource } from '../src/resources/naspip.js';
import { TransactionsResource } from '../src/resources/transactions.js';
import { WebhooksResource } from '../src/resources/webhooks.js';

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

  it('setSettlementAddress() calls POST /account/:id/settlement-addresses', async () => {
    const data = { address: '0x1', network: 'polygon' };
    await accounts.setSettlementAddress('acc-1', data);
    expect(client.request).toHaveBeenCalledWith('POST', '/account/acc-1/settlement-addresses', data);
  });

  it('updateSettlementAddress() calls PUT /account/:id/settlement-addresses', async () => {
    const data = { address: '0x2', network: 'ethereum' };
    await accounts.updateSettlementAddress('acc-1', data);
    expect(client.request).toHaveBeenCalledWith('PUT', '/account/acc-1/settlement-addresses', data);
  });

  it('deleteSettlementAddress() calls DELETE with network query param', async () => {
    await accounts.deleteSettlementAddress('acc-1', 'polygon');
    expect(client.request).toHaveBeenCalledWith(
      'DELETE',
      '/account/acc-1/settlement-addresses',
      undefined,
      { network: 'polygon' },
    );
  });
});

describe('OrganizationResource', () => {
  let client: ReturnType<typeof createMockClient>;
  let org: OrganizationResource;

  beforeEach(() => {
    client = createMockClient();
    org = new OrganizationResource(client);
  });

  it('get() calls GET /organization', async () => {
    await org.get();
    expect(client.request).toHaveBeenCalledWith('GET', '/organization');
  });

  it('setSettlementAddress() calls POST /organization/settlement-addresses', async () => {
    const data = { address: '0x1', network: 'polygon' };
    await org.setSettlementAddress(data);
    expect(client.request).toHaveBeenCalledWith('POST', '/organization/settlement-addresses', data);
  });

  it('updateSettlementAddress() calls PUT /organization/settlement-addresses', async () => {
    const data = { address: '0x2', network: 'ethereum' };
    await org.updateSettlementAddress(data);
    expect(client.request).toHaveBeenCalledWith('PUT', '/organization/settlement-addresses', data);
  });

  it('getSettlementAddresses() calls GET /organization/settlement-addresses', async () => {
    await org.getSettlementAddresses();
    expect(client.request).toHaveBeenCalledWith('GET', '/organization/settlement-addresses');
  });

  it('deleteSettlementAddress() calls DELETE with network query param', async () => {
    await org.deleteSettlementAddress('polygon');
    expect(client.request).toHaveBeenCalledWith(
      'DELETE',
      '/organization/settlement-addresses',
      undefined,
      { network: 'polygon' },
    );
  });
});

describe('PointOfSaleResource', () => {
  let client: ReturnType<typeof createMockClient>;
  let pos: PointOfSaleResource;

  beforeEach(() => {
    client = createMockClient();
    pos = new PointOfSaleResource(client);
  });

  it('list() calls GET /pos with no query when no options', async () => {
    await pos.list();
    expect(client.request).toHaveBeenCalledWith('GET', '/pos', undefined, {});
  });

  it('list() passes pagination and accountId query params', async () => {
    await pos.list({ page: 2, pageSize: 25, accountId: 'acc-1' });
    const query = client.request.mock.calls[0]![3] as Record<string, unknown>;
    expect(query).toEqual({ page: 2, page_size: 25, accountID: 'acc-1' });
  });

  it('get() calls GET /pos/:id', async () => {
    await pos.get('pos-1');
    expect(client.request).toHaveBeenCalledWith('GET', '/pos/pos-1');
  });

  it('create() calls POST /pos with body', async () => {
    const data = {
      name: 'Store',
      referenceCurrency: 'USD',
      type: 'online_fixed' as const,
    };
    await pos.create(data);
    expect(client.request).toHaveBeenCalledWith('POST', '/pos', data);
  });

  it('update() calls PUT /pos/:id with body', async () => {
    const data = { referenceCurrency: 'USD', name: 'Updated' };
    await pos.update('pos-1', data);
    expect(client.request).toHaveBeenCalledWith('PUT', '/pos/pos-1', data);
  });

  it('delete() calls DELETE /pos/:id', async () => {
    await pos.delete('pos-1');
    expect(client.request).toHaveBeenCalledWith('DELETE', '/pos/pos-1');
  });

  it('getPaymentIntention() calls GET /pos/:id/payment-intention', async () => {
    await pos.getPaymentIntention('pos-1');
    expect(client.request).toHaveBeenCalledWith('GET', '/pos/pos-1/payment-intention');
  });

  it('createPaymentIntention() calls POST /pos/:id/payment-intention', async () => {
    const data = { amount: 25, coinCode: 'USD' };
    await pos.createPaymentIntention('pos-1', data);
    expect(client.request).toHaveBeenCalledWith('POST', '/pos/pos-1/payment-intention', data);
  });

  it('closePaymentIntention() calls POST /pos/:id/payment-intention/close', async () => {
    await pos.closePaymentIntention('pos-1');
    expect(client.request).toHaveBeenCalledWith('POST', '/pos/pos-1/payment-intention/close');
  });

  it('getQr() calls GET /pos/:id/qr', async () => {
    await pos.getQr('pos-1');
    expect(client.request).toHaveBeenCalledWith('GET', '/pos/pos-1/qr');
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
    const data = { amount: 49.99, coinCode: 'USD' };
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

describe('WebhooksResource', () => {
  let client: ReturnType<typeof createMockClient>;
  let webhooks: WebhooksResource;

  beforeEach(() => {
    client = createMockClient();
    webhooks = new WebhooksResource(client);
  });

  it('create() calls POST /account/:id/webhook', async () => {
    const data = { url: 'https://example.com/hook', eventTypes: ['payment_request'] as const };
    await webhooks.create('acc-1', data);
    expect(client.request).toHaveBeenCalledWith('POST', '/account/acc-1/webhook', data);
  });

  it('list() calls GET /account/:id/webhook/list', async () => {
    await webhooks.list('acc-1');
    expect(client.request).toHaveBeenCalledWith('GET', '/account/acc-1/webhook/list');
  });

  it('logs() calls GET /account/:id/webhook/logs with pagination', async () => {
    await webhooks.logs('acc-1', { page: 1, pageSize: 20 });
    expect(client.request).toHaveBeenCalledWith(
      'GET',
      '/account/acc-1/webhook/logs',
      undefined,
      { page: 1, page_size: 20 },
    );
  });

  it('activate() calls PATCH /account/:id/webhook/:webhookId/activate', async () => {
    await webhooks.activate('acc-1', 'wh-1');
    expect(client.request).toHaveBeenCalledWith('PATCH', '/account/acc-1/webhook/wh-1/activate');
  });

  it('deactivate() calls PATCH /account/:id/webhook/:webhookId/deactivate', async () => {
    await webhooks.deactivate('acc-1', 'wh-1');
    expect(client.request).toHaveBeenCalledWith('PATCH', '/account/acc-1/webhook/wh-1/deactivate');
  });

  it('delete() calls DELETE /account/:id/webhook/:webhookId/delete', async () => {
    await webhooks.delete('acc-1', 'wh-1');
    expect(client.request).toHaveBeenCalledWith('DELETE', '/account/acc-1/webhook/wh-1/delete');
  });

  it('test() calls POST /account/:id/webhook/:webhookId/test', async () => {
    await webhooks.test('acc-1', 'wh-1');
    expect(client.request).toHaveBeenCalledWith('POST', '/account/acc-1/webhook/wh-1/test');
  });

  it('updateUrl() calls PUT /account/:id/webhook/:webhookId/url', async () => {
    const data = { url: 'https://example.com/hook-v2' };
    await webhooks.updateUrl('acc-1', 'wh-1', data);
    expect(client.request).toHaveBeenCalledWith('PUT', '/account/acc-1/webhook/wh-1/url', data);
  });
});

describe('TransactionsResource', () => {
  let client: ReturnType<typeof createMockClient>;
  let txns: TransactionsResource;

  beforeEach(() => {
    client = createMockClient();
    txns = new TransactionsResource(client);
  });

  it('list() applies default page and pageSize when no options', async () => {
    await txns.list();
    expect(client.request).toHaveBeenCalledWith('GET', '/transactions', undefined, {
      page: 1,
      page_size: 50,
    });
  });

  it('list() maps accountId to accountID query param', async () => {
    await txns.list({ accountId: 'acc-1', page: 2, pageSize: 10 });
    const query = client.request.mock.calls[0]![3] as Record<string, unknown>;
    expect(query).toHaveProperty('accountID', 'acc-1');
    expect(query).not.toHaveProperty('account_id');
    expect(query).toHaveProperty('page', 2);
    expect(query).toHaveProperty('page_size', 10);
  });

  it('list() converts other options to snake_case', async () => {
    await txns.list({ status: 'completed', sort: 'created_at', order: 'desc' });
    const query = client.request.mock.calls[0]![3] as Record<string, unknown>;
    expect(query).toHaveProperty('status', 'completed');
    expect(query).toHaveProperty('sort', 'created_at');
    expect(query).toHaveProperty('order', 'desc');
    expect(query).toHaveProperty('page', 1);
    expect(query).toHaveProperty('page_size', 50);
  });
});
