import type { FluxisClient } from '../client.js';
import type { ListTransactionsOptions, TransactionListResponse } from '../types/transactions.js';
import { toSnakeCase } from '../utils.js';

export class TransactionsResource {
  constructor(private readonly client: FluxisClient) {}

  async list(options?: ListTransactionsOptions): Promise<TransactionListResponse> {
    const query: Record<string, string | number | undefined> = {};
    if (options) {
      for (const [key, value] of Object.entries(options)) {
        if (value !== undefined) {
          query[toSnakeCase(key)] = value;
        }
      }
    }
    return this.client.request<TransactionListResponse>('GET', '/transactions', undefined, query);
  }
}
