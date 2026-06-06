export interface PaymentIntention {
  id: string;
  amount: number;
  coinCode: string;
  externalId?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePaymentIntentionRequest {
  amount: number;
  coinCode: string;
  externalId?: string;
}

export interface CreatePaymentIntentionResponse extends PaymentIntention {}

export interface PaymentIntentionResponse extends PaymentIntention {}

export interface GetQrResponse {
  qrUrl?: string;
  token?: string;
}
