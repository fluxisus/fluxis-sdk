import type { FluxisClient } from '../client.js';
import type { CreateNaspipRequest, CreateNaspipResponse, ReadNaspipResponse } from '../types/naspip.js';

export class NaspipResource {
  constructor(private readonly client: FluxisClient) {}

  async create(data: CreateNaspipRequest): Promise<CreateNaspipResponse> {
    return this.client.request<CreateNaspipResponse>('POST', '/naspip/create', data);
  }

  async read(token: string): Promise<ReadNaspipResponse> {
    return this.client.request<ReadNaspipResponse>('POST', '/naspip/read', { token });
  }

  /**
   * Check if a string looks like a valid NASPIP token (PASETO v4 format).
   */
  isValidTokenFormat(token: string): boolean {
    return token.startsWith('v4.local.');
  }
}
