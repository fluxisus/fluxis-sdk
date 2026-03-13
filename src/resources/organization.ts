import type { FluxisClient } from '../client.js';
import type { SettlementAddressRequest, SettlementAddressResponse } from '../types/organization.js';

export class OrganizationResource {
  constructor(private readonly client: FluxisClient) {}

  // Swagger documents a single-object response, but the API may return an array.
  // Keeping array return type as the safer contract until confirmed otherwise.
  async setSettlementAddresses(data: SettlementAddressRequest[]): Promise<SettlementAddressResponse[]> {
    return this.client.request<SettlementAddressResponse[]>('POST', '/organization/settlement-addresses', data);
  }

  async updateSettlementAddresses(data: SettlementAddressRequest[]): Promise<SettlementAddressResponse[]> {
    return this.client.request<SettlementAddressResponse[]>('PUT', '/organization/settlement-addresses', data);
  }
}
