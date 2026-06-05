import type { TransactionStatus, TransactionType } from './common.js';

export interface ListTransactionsOptions {
  limit?: number;
  offset?: number;
  status?: TransactionStatus;
  sort?: string;
  order?: 'asc' | 'desc';
  accountId?: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  currency?: string;
  network?: string;
  uniqueAssetId?: string;
  grossAmount?: number;
  netAmount?: number;
  expectedAmount?: number;
  from?: string;
  fromType?: string;
  to?: string;
  toType?: string;
  transactionHash?: string;
  financialProvider?: string;
  accountExternalId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TransactionListResponse {
  data: Transaction[];
  total: number;
  limit: number;
  offset: number;
}
