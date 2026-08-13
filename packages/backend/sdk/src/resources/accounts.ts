import type { FluxisClient } from '../client.js';
import type {
  Account,
  AccountSettlementAddresses,
  CreateAccountRequest,
  SettlementAddressRequest,
  UpdateAccountRequest,
} from '../types/accounts.js';
import type { SettlementAddressResponse } from '../types/organization.js';

/** Canonical read path on core-api (`GET /account/{accountId}/settlement-addresses`). */
function accountSettlementReadPath(accountId: string): string {
  return `/account/${accountId}/settlement-addresses`;
}

/**
 * Write path on core-api. POST/PUT/DELETE (and a redundant GET) live under
 * `/account/settlement/{accountID}/settlement-addresses`.
 */
function accountSettlementWritePath(accountId: string): string {
  return `/account/settlement/${accountId}/settlement-addresses`;
}

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
      accountSettlementReadPath(accountId),
    );
  }

  async setSettlementAddress(
    accountId: string,
    data: SettlementAddressRequest,
  ): Promise<SettlementAddressResponse> {
    return this.client.request<SettlementAddressResponse>(
      'POST',
      accountSettlementWritePath(accountId),
      data,
    );
  }

  async updateSettlementAddress(
    accountId: string,
    data: SettlementAddressRequest,
  ): Promise<SettlementAddressResponse> {
    return this.client.request<SettlementAddressResponse>(
      'PUT',
      accountSettlementWritePath(accountId),
      data,
    );
  }

  async deleteSettlementAddress(accountId: string, network: string): Promise<void> {
    await this.client.request<void>(
      'DELETE',
      accountSettlementWritePath(accountId),
      undefined,
      { network },
    );
  }
}
