import type { FluxisClient } from '../client.js';
import type {
  Account,
  AccountSettlementAddresses,
  CreateAccountRequest,
  SettlementAddressRequest,
  UpdateAccountRequest,
} from '../types/accounts.js';
import type { SettlementAddressResponse } from '../types/organization.js';

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
    return this.client.request<AccountSettlementAddresses>(
      'GET',
      `/account/${accountId}/settlement-addresses`,
    );
  }

  async setSettlementAddress(
    accountId: string,
    data: SettlementAddressRequest,
  ): Promise<SettlementAddressResponse> {
    return this.client.request<SettlementAddressResponse>(
      'POST',
      `/account/${accountId}/settlement-addresses`,
      data,
    );
  }

  async updateSettlementAddress(
    accountId: string,
    data: SettlementAddressRequest,
  ): Promise<SettlementAddressResponse> {
    return this.client.request<SettlementAddressResponse>(
      'PUT',
      `/account/${accountId}/settlement-addresses`,
      data,
    );
  }

  async deleteSettlementAddress(accountId: string, network: string): Promise<void> {
    await this.client.request<void>(
      'DELETE',
      `/account/${accountId}/settlement-addresses`,
      undefined,
      { network },
    );
  }
}
