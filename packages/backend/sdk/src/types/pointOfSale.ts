import type { Merchant, Order, Paginated, PaymentRequestStatus, PointOfSaleType } from './common.js';

export type { PointOfSaleType };

export interface CreatePointOfSaleRequest {
  name: string;
  referenceCurrency: string;
  type: PointOfSaleType;
  accountId?: string;
  merchant?: Merchant;
  paymentOptions?: string[];
}

export interface UpdatePointOfSaleRequest {
  referenceCurrency: string;
  name?: string;
  merchant?: Merchant;
  paymentOptions?: string[];
}

export interface PointOfSaleConfig {
  referenceCurrency?: string;
  merchant?: Merchant;
  paymentOptions?: string[];
}

export interface PointOfSale {
  id: string;
  name: string;
  type?: PointOfSaleType;
  organizationId?: string;
  organizationName?: string;
  accountId?: string;
  accountName?: string;
  config?: PointOfSaleConfig;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListPointOfSaleOptions {
  page?: number;
  pageSize?: number;
  accountId?: string;
}

export type ListPointOfSaleResponse = Paginated<PointOfSale>;

export interface CreatePaymentRequestRequest {
  amount: string;
  uniqueAssetId: string;
  referenceId?: string;
  order?: Order;
}

export interface CreatePaymentRequestCheckoutRequest {
  amount: number;
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
