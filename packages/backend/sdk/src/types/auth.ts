export interface AuthTokenRequest {
  apiKey: string;
  apiSecret: string;
}

export interface AuthTokenResponse {
  token: string;
  expiredAt: string;
}
