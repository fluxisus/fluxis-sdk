import type { FluxisClient } from '../client.js';
import type {
  Organization,
  SettlementAddressRequest,
  SettlementAddressResponse,
} from '../types/organization.js';

export class OrganizationResource {
  constructor(private readonly client: FluxisClient) {}

  async get(): Promise<Organization> {
    return this.client.request<Organization>('GET', '/organization');
  }

  async setSettlementAddress(data: SettlementAddressRequest): Promise<SettlementAddressResponse> {
    return this.client.request<SettlementAddressResponse>(
      'POST',
      '/organization/settlement-addresses',
      data,
    );
  }

  async updateSettlementAddress(data: SettlementAddressRequest): Promise<SettlementAddressResponse> {
    return this.client.request<SettlementAddressResponse>(
      'PUT',
      '/organization/settlement-addresses',
      data,
    );
  }

  async getSettlementAddresses(): Promise<SettlementAddressResponse[]> {
    return this.client.request<SettlementAddressResponse[]>(
      'GET',
      '/organization/settlement-addresses',
    );
  }

  async deleteSettlementAddress(network: string): Promise<void> {
    await this.client.request<void>(
      'DELETE',
      '/organization/settlement-addresses',
      undefined,
      { network },
    );
  }
}
