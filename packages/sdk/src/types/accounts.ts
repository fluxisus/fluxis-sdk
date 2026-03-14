import type { SettlementAddress } from './common.js';

export interface CreateAccountRequest {
  name: string;
  externalId?: string;
}

export interface UpdateAccountRequest {
  name?: string;
  externalId?: string;
}

export interface Account {
  id: string;
  name: string;
  externalId?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
}

export interface AccountSettlementAddresses {
  addresses: SettlementAddress[];
}
