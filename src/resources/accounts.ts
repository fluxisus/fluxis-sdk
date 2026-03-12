import type { FluxisClient } from '../client.js';
import type { Account, AccountSettlementAddresses, CreateAccountRequest, UpdateAccountRequest } from '../types/accounts.js';

export class AccountsResource {
  constructor(private readonly client: FluxisClient) {}

  async list(): Promise<Account[]> {
    return this.client.request<Account[]>('GET', '/account');
  }

  async get(accountId: string): Promise<Account> {
    return this.client.request<Account>('GET', `/account/${accountId}`);
  }

  async create(data: CreateAccountRequest): Promise<Account> {
    return this.client.request<Account>('POST', '/account', data);
  }

  async update(accountId: string, data: UpdateAccountRequest): Promise<Account> {
    return this.client.request<Account>('PUT', `/account/${accountId}`, data);
  }

  async delete(accountId: string): Promise<void> {
    await this.client.request<void>('DELETE', `/account/${accountId}`);
  }

  async getSettlementAddresses(accountId: string): Promise<AccountSettlementAddresses> {
    return this.client.request<AccountSettlementAddresses>('GET', `/account/${accountId}/settlement-addresses`);
  }
}
