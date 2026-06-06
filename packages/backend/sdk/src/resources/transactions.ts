import type { FluxisClient } from '../client.js';
import type { ListTransactionsOptions, TransactionListResponse } from '../types/transactions.js';
import { toSnakeCase } from '../utils.js';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;

const QUERY_KEY_OVERRIDES: Record<string, string> = {
  accountId: 'accountID',
};

export class TransactionsResource {
  constructor(private readonly client: FluxisClient) {}

  async list(options?: ListTransactionsOptions): Promise<TransactionListResponse> {
    const query: Record<string, string | number | undefined> = {
      page: options?.page ?? DEFAULT_PAGE,
      page_size: options?.pageSize ?? DEFAULT_PAGE_SIZE,
    };

    if (options) {
      for (const [key, value] of Object.entries(options)) {
        if (value !== undefined && key !== 'page' && key !== 'pageSize') {
          query[QUERY_KEY_OVERRIDES[key] ?? toSnakeCase(key)] = value;
        }
      }
    }

    return this.client.request<TransactionListResponse>('GET', '/transactions', undefined, query);
  }
}
