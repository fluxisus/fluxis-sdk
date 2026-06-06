import type { CountryCode } from './common.js';

export interface Organization {
  id: string;
  name: string;
  country: CountryCode;
  ownerEmail: string;
  taxId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SettlementAddressRequest {
  address: string;
  network: string;
  addressTag?: string;
}

export interface SettlementAddressResponse {
  address: string;
  network: string;
  addressTag?: string;
}
