export type ResponseStatus = 'success' | 'error';

export interface ApiResponse<T> {
  status: ResponseStatus;
  data: T;
}

export interface ApiErrorResponse {
  status: 'error';
  code: string;
  message: string;
  details?: string;
}

export type PaymentRequestStatus =
  | 'created'
  | 'processing'
  | 'expired'
  | 'completed'
  | 'overpaid'
  | 'underpaid'
  | 'failed';

export type TransactionType =
  | 'deposit'
  | 'withdraw'
  | 'refund'
  | 'adjustment'
  | 'swap'
  | 'payment_in'
  | 'payment_out'
  | 'dry_run';

export type TransactionStatus =
  | 'preview'
  | 'pending'
  | 'created'
  | 'processing'
  | 'error'
  | 'expired'
  | 'failed'
  | 'completed';

export type CountryCode = 'AR' | 'BR' | 'DK';

export type EntityType = 'organization' | 'account' | 'financial_provider' | 'point_of_sale';

export type TransactionDetailType =
  | 'base'
  | 'fee'
  | 'tax'
  | 'other'
  | 'payment_net_amount'
  | 'payment_service_fee'
  | 'payment_developer_fee'
  | 'payment_revenue_shared_fee';

export interface Merchant {
  name?: string;
  description?: string;
}

export interface OrderItem {
  description?: string;
  quantity?: number;
  unitPrice?: string;
  amount?: string;
  coinCode?: string;
}

export interface Order {
  total?: string;
  coinCode?: string;
  description?: string;
  merchant?: Merchant;
  items?: OrderItem[];
}

export interface SettlementAddress {
  settlementAddress?: string;
  addressTag?: string;
  addressType?: string;
  owner?: EntityType;
  settlementType?: TransactionDetailType;
}

export type Environment = 'staging' | 'production';

export interface FluxisClientOptions {
  apiKey: string;
  apiSecret: string;
  environment?: Environment;
  baseUrl?: string;
  timeout?: number;
}
