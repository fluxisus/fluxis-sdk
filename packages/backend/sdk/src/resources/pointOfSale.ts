import type { FluxisClient } from '../client.js';
import type {
  CreatePaymentIntentionRequest,
  CreatePaymentIntentionResponse,
  GetQrResponse,
  PaymentIntentionResponse,
} from '../types/paymentIntention.js';
import type {
  CreatePaymentRequestCheckoutRequest,
  CreatePaymentRequestRequest,
  CreatePointOfSaleRequest,
  ListPointOfSaleOptions,
  ListPointOfSaleResponse,
  PaymentRequestCheckoutResponse,
  PaymentRequestResponse,
  PointOfSale,
  UpdatePointOfSaleRequest,
} from '../types/pointOfSale.js';
import { toSnakeCase } from '../utils.js';

const QUERY_KEY_OVERRIDES: Record<string, string> = {
  accountId: 'accountID',
};

export class PointOfSaleResource {
  constructor(private readonly client: FluxisClient) {}

  async list(options?: ListPointOfSaleOptions): Promise<ListPointOfSaleResponse> {
    const query: Record<string, string | number | undefined> = {};
    if (options) {
      for (const [key, value] of Object.entries(options)) {
        if (value !== undefined) {
          query[QUERY_KEY_OVERRIDES[key] ?? toSnakeCase(key)] = value;
        }
      }
    }
    return this.client.request<ListPointOfSaleResponse>('GET', '/pos', undefined, query);
  }

  async get(posId: string): Promise<PointOfSale> {
    return this.client.request<PointOfSale>('GET', `/pos/${posId}`);
  }

  async create(data: CreatePointOfSaleRequest): Promise<PointOfSale> {
    return this.client.request<PointOfSale>('POST', '/pos', data);
  }

  async update(posId: string, data: UpdatePointOfSaleRequest): Promise<PointOfSale> {
    return this.client.request<PointOfSale>('PUT', `/pos/${posId}`, data);
  }

  async delete(posId: string): Promise<void> {
    await this.client.request<void>('DELETE', `/pos/${posId}`);
  }

  async getPaymentIntention(posId: string): Promise<PaymentIntentionResponse> {
    return this.client.request<PaymentIntentionResponse>('GET', `/pos/${posId}/payment-intention`);
  }

  async createPaymentIntention(
    posId: string,
    data: CreatePaymentIntentionRequest,
  ): Promise<CreatePaymentIntentionResponse> {
    return this.client.request<CreatePaymentIntentionResponse>(
      'POST',
      `/pos/${posId}/payment-intention`,
      data,
    );
  }

  async closePaymentIntention(posId: string): Promise<void> {
    await this.client.request<void>('POST', `/pos/${posId}/payment-intention/close`);
  }

  async getQr(posId: string): Promise<GetQrResponse> {
    return this.client.request<GetQrResponse>('GET', `/pos/${posId}/qr`);
  }

  async createPaymentRequest(posId: string, data: CreatePaymentRequestRequest): Promise<PaymentRequestResponse> {
    return this.client.request<PaymentRequestResponse>('POST', `/pos/${posId}/payment-request`, data);
  }

  async getPaymentRequest(posId: string, paymentRequestId: string): Promise<PaymentRequestResponse> {
    return this.client.request<PaymentRequestResponse>('GET', `/pos/${posId}/payment-request/${paymentRequestId}`);
  }

  async createPaymentRequestCheckout(
    posId: string,
    data: CreatePaymentRequestCheckoutRequest,
  ): Promise<PaymentRequestCheckoutResponse> {
    return this.client.request<PaymentRequestCheckoutResponse>(
      'POST',
      `/pos/${posId}/payment-request-checkout`,
      data,
    );
  }
}
