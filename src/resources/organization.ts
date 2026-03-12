import type { FluxisClient } from '../client.js';
import type { SettlementAddressRequest, SettlementAddressResponse } from '../types/organization.js';

export class OrganizationResource {
  constructor(private readonly client: FluxisClient) {}

  async setSettlementAddresses(data: SettlementAddressRequest[]): Promise<SettlementAddressResponse[]> {
    return this.client.request<SettlementAddressResponse[]>('POST', '/organization/settlement-addresses', data);
  }

  async updateSettlementAddresses(data: SettlementAddressRequest[]): Promise<SettlementAddressResponse[]> {
    return this.client.request<SettlementAddressResponse[]>('PUT', '/organization/settlement-addresses', data);
  }
}
