import type { FluxisClient } from '../client.js';
import type {
  ListWebhookLogsOptions,
  ListWebhookLogsResponse,
  ListWebhooksResponse,
  Webhook,
  WebhookCreateRequest,
  WebhookUpdateUrlRequest,
} from '../types/webhooks.js';
import { toSnakeCase } from '../utils.js';

export class WebhooksResource {
  constructor(private readonly client: FluxisClient) {}

  async create(accountId: string, data: WebhookCreateRequest): Promise<Webhook> {
    return this.client.request<Webhook>('POST', `/account/${accountId}/webhook`, data);
  }

  async list(accountId: string): Promise<ListWebhooksResponse> {
    return this.client.request<ListWebhooksResponse>('GET', `/account/${accountId}/webhook/list`);
  }

  async logs(accountId: string, options?: ListWebhookLogsOptions): Promise<ListWebhookLogsResponse> {
    const query: Record<string, string | number | undefined> = {};
    if (options) {
      for (const [key, value] of Object.entries(options)) {
        if (value !== undefined) {
          query[toSnakeCase(key)] = value;
        }
      }
    }
    return this.client.request<ListWebhookLogsResponse>(
      'GET',
      `/account/${accountId}/webhook/logs`,
      undefined,
      query,
    );
  }

  async activate(accountId: string, webhookId: string): Promise<Webhook> {
    return this.client.request<Webhook>(
      'PATCH',
      `/account/${accountId}/webhook/${webhookId}/activate`,
    );
  }

  async deactivate(accountId: string, webhookId: string): Promise<Webhook> {
    return this.client.request<Webhook>(
      'PATCH',
      `/account/${accountId}/webhook/${webhookId}/deactivate`,
    );
  }

  async delete(accountId: string, webhookId: string): Promise<void> {
    await this.client.request<void>(
      'DELETE',
      `/account/${accountId}/webhook/${webhookId}/delete`,
    );
  }

  async test(accountId: string, webhookId: string): Promise<void> {
    await this.client.request<void>(
      'POST',
      `/account/${accountId}/webhook/${webhookId}/test`,
    );
  }

  async updateUrl(accountId: string, webhookId: string, data: WebhookUpdateUrlRequest): Promise<Webhook> {
    return this.client.request<Webhook>(
      'PUT',
      `/account/${accountId}/webhook/${webhookId}/url`,
      data,
    );
  }
}
