import type { ApiErrorResponse, ApiResponse, Environment, FluxisClientOptions } from './types/common.js';
import { FluxisAuthError, FluxisError, FluxisNetworkError } from './errors.js';
import { keysToCamelCase, keysToSnakeCase } from './utils.js';
import { AccountsResource } from './resources/accounts.js';
import { OrganizationResource } from './resources/organization.js';
import { PointOfSaleResource } from './resources/pointOfSale.js';
import { NaspipResource } from './resources/naspip.js';
import { RefundsResource } from './resources/refunds.js';
import { TransactionsResource } from './resources/transactions.js';

const BASE_URLS: Record<Environment, string> = {
  staging: 'https://api.stgfluxis.us/v1',
  production: 'https://api.fluxis.us/v1',
};

const TOKEN_REFRESH_BUFFER_MS = 60_000; // Refresh 1 minute before expiry

export class FluxisClient {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;
  private authPromise: Promise<void> | null = null;

  readonly accounts: AccountsResource;
  readonly organization: OrganizationResource;
  readonly pointOfSale: PointOfSaleResource;
  readonly naspip: NaspipResource;
  readonly refunds: RefundsResource;
  readonly transactions: TransactionsResource;

  constructor(options: FluxisClientOptions) {
    this.apiKey = options.apiKey;
    this.apiSecret = options.apiSecret;
    this.timeout = options.timeout ?? 30_000;

    if (options.baseUrl) {
      this.baseUrl = options.baseUrl;
    } else {
      const env = options.environment ?? 'staging';
      this.baseUrl = BASE_URLS[env];
    }

    this.accounts = new AccountsResource(this);
    this.organization = new OrganizationResource(this);
    this.pointOfSale = new PointOfSaleResource(this);
    this.naspip = new NaspipResource(this);
    this.refunds = new RefundsResource(this);
    this.transactions = new TransactionsResource(this);
  }

  private isTokenExpired(): boolean {
    if (!this.accessToken || !this.tokenExpiresAt) return true;
    return Date.now() >= this.tokenExpiresAt.getTime() - TOKEN_REFRESH_BUFFER_MS;
  }

  private async authenticate(): Promise<void> {
    const url = `${this.baseUrl}/auth/token`;
    const body = JSON.stringify({
      api_key: this.apiKey,
      api_secret: this.apiSecret,
    });

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(this.timeout),
      });
    } catch (err) {
      throw new FluxisNetworkError('Failed to connect to Fluxis API for authentication', err as Error);
    }

    const json = (await response.json()) as ApiResponse<{ token: string; expired_at: string }> | ApiErrorResponse;

    if (!response.ok || json.status === 'error') {
      const errorJson = json as ApiErrorResponse;
      throw new FluxisAuthError(
        errorJson.message ?? 'Authentication failed',
        errorJson.code ?? 'AUTH_ERROR',
        errorJson.details,
      );
    }

    const successJson = json as ApiResponse<{ token: string; expired_at: string }>;
    this.accessToken = successJson.data.token;
    this.tokenExpiresAt = new Date(successJson.data.expired_at);
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.isTokenExpired()) return;

    // Deduplicate concurrent auth requests
    if (!this.authPromise) {
      this.authPromise = this.authenticate().finally(() => {
        this.authPromise = null;
      });
    }
    await this.authPromise;
  }

  /** @internal */
  async request<T>(method: string, path: string, body?: unknown, query?: Record<string, string | number | undefined>): Promise<T> {
    await this.ensureAuthenticated();

    let url = `${this.baseUrl}${path}`;
    if (query) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          params.set(key, String(value));
        }
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`,
      'x-fluxis-api-key': this.apiKey,
    };

    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.timeout),
    };

    if (body !== undefined) {
      fetchOptions.body = JSON.stringify(keysToSnakeCase(body));
    }

    let response: Response;
    try {
      response = await fetch(url, fetchOptions);
    } catch (err) {
      throw new FluxisNetworkError(`Request failed: ${method} ${path}`, err as Error);
    }

    const json = (await response.json()) as ApiResponse<unknown> | ApiErrorResponse;

    if (!response.ok || json.status === 'error') {
      const errorJson = json as ApiErrorResponse;

      if (response.status === 401) {
        // Token might have expired between check and request — retry once
        this.accessToken = null;
        this.tokenExpiresAt = null;
        await this.ensureAuthenticated();
        return this.requestWithoutRetry<T>(method, path, body, query);
      }

      throw new FluxisError(
        errorJson.message ?? `Request failed with status ${response.status}`,
        errorJson.code ?? 'UNKNOWN_ERROR',
        errorJson.details,
        response.status,
      );
    }

    const successJson = json as ApiResponse<unknown>;
    return keysToCamelCase(successJson.data) as T;
  }

  private async requestWithoutRetry<T>(method: string, path: string, body?: unknown, query?: Record<string, string | number | undefined>): Promise<T> {
    let url = `${this.baseUrl}${path}`;
    if (query) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          params.set(key, String(value));
        }
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`,
      'x-fluxis-api-key': this.apiKey,
    };

    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.timeout),
    };

    if (body !== undefined) {
      fetchOptions.body = JSON.stringify(keysToSnakeCase(body));
    }

    let response: Response;
    try {
      response = await fetch(url, fetchOptions);
    } catch (err) {
      throw new FluxisNetworkError(`Request failed: ${method} ${path}`, err as Error);
    }

    const json = (await response.json()) as ApiResponse<unknown> | ApiErrorResponse;

    if (!response.ok || json.status === 'error') {
      const errorJson = json as ApiErrorResponse;
      throw new FluxisError(
        errorJson.message ?? `Request failed with status ${response.status}`,
        errorJson.code ?? 'UNKNOWN_ERROR',
        errorJson.details,
        response.status,
      );
    }

    const successJson = json as ApiResponse<unknown>;
    return keysToCamelCase(successJson.data) as T;
  }
}
