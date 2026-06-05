import type { Merchant, Order, PaymentRequestStatus } from './common.js';

export interface CreatePointOfSaleRequest {
  name: string;
  accountId?: string;
  merchant?: Merchant;
  paymentOptions?: string[];
}

export interface UpdatePointOfSaleRequest {
  name?: string;
  merchant?: Merchant;
  paymentOptions?: string[];
}

export interface PointOfSaleConfig {
  merchant?: Merchant;
  paymentOptions?: string[];
}

export interface PointOfSale {
  id: string;
  name: string;
  organizationId?: string;
  organizationName?: string;
  accountId?: string;
  accountName?: string;
  config?: PointOfSaleConfig;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateNotificationSettingsRequest {
  webhookUrl: string;
}

export interface NotificationSettings {
  webhookUrl: string;
}

export interface CreateNotificationSettingsResponse {
  webhookUrl: string;
  secret: string;
}

export interface UpdateNotificationSettingsRequest {
  webhookUrl: string;
}

export interface UpdateNotificationSettingsResponse {
  webhookUrl: string;
}

export interface CreatePaymentRequestRequest {
  amount: string;
  uniqueAssetId: string;
  referenceId?: string;
  order?: Order;
}

export interface CreatePaymentRequestCheckoutRequest {
  amount: string;
  coinCode: string;
  referenceId?: string;
  order?: Order;
}

export interface PaymentRequestResponse {
  id: string;
  status: PaymentRequestStatus;
  token: string;
  referenceId?: string;
  expiration?: number;
}

export interface PaymentRequestCheckoutResponse extends PaymentRequestResponse {
  checkoutUrl?: string;
}
