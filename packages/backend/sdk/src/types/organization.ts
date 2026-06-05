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
