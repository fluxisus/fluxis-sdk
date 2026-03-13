export { FluxisClient } from './client.js';

// Errors
export { FluxisError, FluxisAuthError, FluxisNetworkError, FluxisResponseParseError } from './errors.js';

// Webhook utility
export { verifyWebhookSignature } from './webhooks.js';

// Types — Common
export type {
  ApiResponse,
  ApiErrorResponse,
  PaymentRequestStatus,
  TransactionType,
  TransactionStatus,
  CountryCode,
  EntityType,
  TransactionDetailType,
  Merchant,
  OrderItem,
  Order,
  SettlementAddress,
  Environment,
  FluxisClientOptions,
} from './types/common.js';

// Types — Auth
export type { AuthTokenRequest, AuthTokenResponse } from './types/auth.js';

// Types — Accounts
export type {
  CreateAccountRequest,
  UpdateAccountRequest,
  Account,
  AccountSettlementAddresses,
} from './types/accounts.js';

// Types — Organization
export type {
  SettlementAddressRequest,
  SettlementAddressResponse,
} from './types/organization.js';

// Types — Point of Sale
export type {
  CreatePointOfSaleRequest,
  UpdatePointOfSaleRequest,
  PointOfSaleConfig,
  PointOfSale,
  CreateNotificationSettingsRequest,
  NotificationSettings,
  CreateNotificationSettingsResponse,
  UpdateNotificationSettingsRequest,
  UpdateNotificationSettingsResponse,
  CreatePaymentRequestRequest,
  CreatePaymentRequestCheckoutRequest,
  PaymentRequestResponse,
  PaymentRequestCheckoutResponse,
} from './types/pointOfSale.js';

// Types — NASPIP
export type {
  NaspipPaymentData,
  CreateNaspipRequest,
  CreateNaspipResponse,
  ReadNaspipRequest,
  ReadNaspipResponse,
  NaspipPaymentInfo,
  NaspipOrderInfo,
} from './types/naspip.js';

// Types — Refunds
export type {
  CreateRefundRequest,
  RefundResponse,
  RefundDetail,
} from './types/refunds.js';

// Types — Transactions
export type {
  ListTransactionsOptions,
  Transaction,
  TransactionListResponse,
} from './types/transactions.js';
