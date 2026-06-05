export interface CreateRefundRequest {
  refundToAddress: string;
  amount?: string;
  reason?: string;
}

export interface RefundResponse {
  id: string;
  amount: number;
  refundToAddress: string;
  status: string;
}

export interface RefundDetail {
  id: string;
  paymentRequestId?: string;
  amount: number;
  refundToAddress: string;
  status: string;
  reason?: string;
  network?: string;
  uniqueAssetId?: string;
  paymentTransactionHash?: string;
  refundTransactionHash?: string;
  requestedByEntityId?: string;
  requestedByEntityType?: string;
  createdAt?: string;
  updatedAt?: string;
}
