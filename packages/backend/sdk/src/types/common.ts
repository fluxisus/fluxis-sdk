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
  | 'pending'
  | 'processing'
  | 'confirmed'
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

/** ISO 3166-1 alpha-2 country code (e.g. "AR", "BR", "US"). */
export type CountryCode = string;

export type EntityType = 'organization' | 'account' | 'financial_provider' | 'point_of_sale';

export type PointOfSaleType = 'cashier_fixed' | 'online_fixed' | 'cashier_open';

export type PaymentRequestType = 'fixed' | 'dynamic' | 'pre_loaded' | 'open';

export type WebhookEventType = 'payment_request' | 'incoming_transfer' | 'refund';

export type TransactionDetailType =
  | 'base'
  | 'fee'
  | 'tax'
  | 'other'
  | 'payment_net_amount'
  | 'payment_service_fee'
  | 'payment_developer_fee'
  | 'payment_revenue_shared_fee';

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

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

export interface FluxisClientOptions {
  apiKey: string;
  apiSecret: string;
  timeout?: number;
}
