import type { FluxisClient } from '../client.js';
import type { CreateRefundRequest, RefundDetail, RefundResponse } from '../types/refunds.js';

export class RefundsResource {
  constructor(private readonly client: FluxisClient) {}

  async create(paymentRequestId: string, data: CreateRefundRequest): Promise<RefundResponse> {
    return this.client.request<RefundResponse>('POST', `/refunds/payment-request/${paymentRequestId}`, data);
  }

  async get(refundId: string): Promise<RefundDetail> {
    return this.client.request<RefundDetail>('GET', `/refunds/${refundId}`);
  }
}
