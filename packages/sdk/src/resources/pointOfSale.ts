import type { FluxisClient } from '../client.js';
import type {
  CreateNotificationSettingsRequest,
  CreateNotificationSettingsResponse,
  CreatePaymentRequestCheckoutRequest,
  CreatePaymentRequestRequest,
  CreatePointOfSaleRequest,
  NotificationSettings,
  PaymentRequestCheckoutResponse,
  PaymentRequestResponse,
  PointOfSale,
  UpdateNotificationSettingsRequest,
  UpdateNotificationSettingsResponse,
  UpdatePointOfSaleRequest,
} from '../types/pointOfSale.js';

export class PointOfSaleResource {
  constructor(private readonly client: FluxisClient) {}

  async list(): Promise<PointOfSale[]> {
    return this.client.request<PointOfSale[]>('GET', '/pos');
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

  async getNotifications(posId: string): Promise<NotificationSettings> {
    return this.client.request<NotificationSettings>('GET', `/pos/${posId}/notifications`);
  }

  async createNotifications(posId: string, data: CreateNotificationSettingsRequest): Promise<CreateNotificationSettingsResponse> {
    return this.client.request<CreateNotificationSettingsResponse>('POST', `/pos/${posId}/notifications`, data);
  }

  async updateNotifications(posId: string, data: UpdateNotificationSettingsRequest): Promise<UpdateNotificationSettingsResponse> {
    return this.client.request<UpdateNotificationSettingsResponse>('PUT', `/pos/${posId}/notifications`, data);
  }

  async createPaymentRequest(posId: string, data: CreatePaymentRequestRequest): Promise<PaymentRequestResponse> {
    return this.client.request<PaymentRequestResponse>('POST', `/pos/${posId}/payment-request`, data);
  }

  async getPaymentRequest(posId: string, paymentRequestId: string): Promise<PaymentRequestResponse> {
    return this.client.request<PaymentRequestResponse>('GET', `/pos/${posId}/payment-request/${paymentRequestId}`);
  }

  async createPaymentRequestCheckout(posId: string, data: CreatePaymentRequestCheckoutRequest): Promise<PaymentRequestCheckoutResponse> {
    return this.client.request<PaymentRequestCheckoutResponse>('POST', `/pos/${posId}/payment-request-checkout`, data);
  }
}
