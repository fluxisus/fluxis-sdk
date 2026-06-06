import type { Paginated, WebhookEventType } from './common.js';

export type { WebhookEventType };

export interface WebhookCreateRequest {
  url: string;
  eventTypes: WebhookEventType[];
}

export interface WebhookUpdateUrlRequest {
  url: string;
}

export interface Webhook {
  id: string;
  url: string;
  eventTypes: WebhookEventType[];
  active: boolean;
  secret?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WebhookLog {
  id: string;
  webhookId: string;
  eventType: WebhookEventType;
  statusCode?: number;
  responseBody?: string;
  createdAt?: string;
}

export type ListWebhooksResponse = Webhook[];

export interface ListWebhookLogsOptions {
  page?: number;
  pageSize?: number;
}

export type ListWebhookLogsResponse = Paginated<WebhookLog>;
