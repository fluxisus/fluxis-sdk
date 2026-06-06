import type { SettlementAddress } from './common.js';
import type { SettlementAddressRequest } from './organization.js';

export interface CreateAccountRequest {
  name: string;
  externalId?: string;
}

export interface UpdateAccountRequest {
  name?: string;
  externalId?: string;
}

export interface Account {
  name: string;
  externalId?: string;
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
}

export interface AccountSettlementAddresses {
  addresses: SettlementAddress[];
}

export type { SettlementAddressRequest };
