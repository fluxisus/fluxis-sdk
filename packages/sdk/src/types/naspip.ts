export interface NaspipPaymentData {
  id?: string;
  address: string;
  amount: number;
  uniqueAssetId: string;
  expiresAt?: number;
  isOpen?: boolean;
}

export interface CreateNaspipRequest {
  payment: NaspipPaymentData;
}

export interface CreateNaspipResponse {
  token: string;
}

export interface ReadNaspipRequest {
  token: string;
}

export interface NaspipPaymentInfo {
  id?: string;
  address?: string;
  amount?: number;
  uniqueAssetId?: string;
  expiresAt?: number;
  isOpen?: boolean;
}

export interface NaspipOrderInfo {
  total?: string;
  coinCode?: string;
  description?: string;
  merchant?: {
    name?: string;
    description?: string;
  };
  items?: Array<{
    description?: string;
    quantity?: number;
    unitPrice?: string;
    amount?: string;
    coinCode?: string;
  }>;
}

export interface ReadNaspipResponse {
  payment?: NaspipPaymentInfo;
  order?: NaspipOrderInfo;
  paymentOptions?: string[];
  url?: string;
}
