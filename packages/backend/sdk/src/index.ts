export { FluxisClient } from "./client.js";

// Errors
export {
  FluxisError,
  FluxisAuthError,
  FluxisNetworkError,
  FluxisResponseParseError,
} from "./errors.js";

// Webhook utility
export { verifyWebhookSignature } from "./webhooks.js";

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
  PointOfSaleType,
  PaymentRequestType,
  WebhookEventType,
  Paginated,
  Merchant,
  OrderItem,
  Order,
  SettlementAddress,
  FluxisClientOptions,
} from "./types/common.js";

// Types — Auth
export type { AuthTokenRequest, AuthTokenResponse } from "./types/auth.js";

// Types — Accounts
export type {
  CreateAccountRequest,
  UpdateAccountRequest,
  Account,
  AccountSettlementAddresses,
  SettlementAddressRequest,
} from "./types/accounts.js";

// Types — Organization
export type {
  Organization,
  SettlementAddressResponse,
} from "./types/organization.js";

// Types — Point of Sale
export type {
  CreatePointOfSaleRequest,
  UpdatePointOfSaleRequest,
  PointOfSaleConfig,
  PointOfSale,
  ListPointOfSaleOptions,
  ListPointOfSaleResponse,
  CreatePaymentRequestRequest,
  CreatePaymentRequestCheckoutRequest,
  PaymentRequestResponse,
  PaymentRequestCheckoutResponse,
} from "./types/pointOfSale.js";

// Types — Payment Intention
export type {
  PaymentIntention,
  CreatePaymentIntentionRequest,
  CreatePaymentIntentionResponse,
  PaymentIntentionResponse,
  GetQrResponse,
} from "./types/paymentIntention.js";

// Types — Webhooks
export type {
  WebhookCreateRequest,
  WebhookUpdateUrlRequest,
  Webhook,
  WebhookLog,
  ListWebhooksResponse,
  ListWebhookLogsOptions,
  ListWebhookLogsResponse,
} from "./types/webhooks.js";

// Types — NASPIP
export type {
  NaspipPaymentData,
  CreateNaspipRequest,
  CreateNaspipResponse,
  ReadNaspipRequest,
  ReadNaspipResponse,
  NaspipPaymentInfo,
  NaspipOrderInfo,
} from "./types/naspip.js";

// Types — Transactions
export type {
  ListTransactionsOptions,
  Transaction,
  TransactionListResponse,
} from "./types/transactions.js";
