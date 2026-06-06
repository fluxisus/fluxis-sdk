using System.Text.Json.Serialization;

namespace Fluxis.Models;

/// <summary>Webhook event type values.</summary>
public static class WebhookEventTypes
{
    /// <summary>Payment request status updates.</summary>
    public const string PaymentRequest = "payment_request";
    /// <summary>Incoming transfer notifications.</summary>
    public const string IncomingTransfer = "incoming_transfer";
    /// <summary>Refund notifications.</summary>
    public const string Refund = "refund";
}

/// <summary>
/// Paginated API response wrapper.
/// </summary>
/// <typeparam name="T">Item type in the data array.</typeparam>
public sealed class PaginatedResponse<T>
{
    /// <summary>Page of results.</summary>
    [JsonPropertyName("data")]
    public List<T> Data { get; set; } = new();

    /// <summary>Current page number (1-based).</summary>
    [JsonPropertyName("page")]
    public int Page { get; set; }

    /// <summary>Number of items per page.</summary>
    [JsonPropertyName("page_size")]
    public int PageSize { get; set; }

    /// <summary>Total number of matching items.</summary>
    [JsonPropertyName("total")]
    public int Total { get; set; }

    /// <summary>Total number of pages.</summary>
    [JsonPropertyName("total_pages")]
    public int TotalPages { get; set; }
}

/// <summary>
/// Request body for creating an account-scoped webhook.
/// </summary>
public sealed class WebhookCreateRequest
{
    /// <summary>Webhook URL to receive events.</summary>
    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;

    /// <summary>Event type to subscribe to.</summary>
    [JsonPropertyName("event_type")]
    public string EventType { get; set; } = string.Empty;

    /// <summary>Optional description.</summary>
    [JsonPropertyName("description")]
    public string? Description { get; set; }
}

/// <summary>
/// Request body for updating a webhook URL.
/// </summary>
public sealed class WebhookUpdateUrlRequest
{
    /// <summary>New webhook URL.</summary>
    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;
}

/// <summary>
/// Webhook entity returned by the API.
/// </summary>
public sealed class Webhook
{
    /// <summary>Webhook ID.</summary>
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    /// <summary>Account ID this webhook belongs to.</summary>
    [JsonPropertyName("account_id")]
    public string? AccountId { get; set; }

    /// <summary>Webhook URL.</summary>
    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;

    /// <summary>Subscribed event type.</summary>
    [JsonPropertyName("event_type")]
    public string? EventType { get; set; }

    /// <summary>Whether the webhook is enabled.</summary>
    [JsonPropertyName("enabled")]
    public bool Enabled { get; set; }

    /// <summary>Optional description.</summary>
    [JsonPropertyName("description")]
    public string? Description { get; set; }

    /// <summary>HMAC secret for signature verification (returned on create).</summary>
    [JsonPropertyName("secret")]
    public string? Secret { get; set; }

    /// <summary>Creation timestamp.</summary>
    [JsonPropertyName("created_at")]
    public string? CreatedAt { get; set; }

    /// <summary>Last update timestamp.</summary>
    [JsonPropertyName("updated_at")]
    public string? UpdatedAt { get; set; }
}

/// <summary>
/// Webhook delivery log entry.
/// </summary>
public sealed class WebhookLog
{
    /// <summary>Log entry ID.</summary>
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    /// <summary>Account ID.</summary>
    [JsonPropertyName("account_id")]
    public string? AccountId { get; set; }

    /// <summary>Webhook ID.</summary>
    [JsonPropertyName("webhook_id")]
    public string? WebhookId { get; set; }

    /// <summary>Event type that was delivered.</summary>
    [JsonPropertyName("event_type")]
    public string? EventType { get; set; }

    /// <summary>HTTP response status from the webhook endpoint.</summary>
    [JsonPropertyName("response_status")]
    public int? ResponseStatus { get; set; }

    /// <summary>Response body from the webhook endpoint.</summary>
    [JsonPropertyName("response_body")]
    public string? ResponseBody { get; set; }

    /// <summary>Delivery duration in milliseconds.</summary>
    [JsonPropertyName("duration_ms")]
    public int? DurationMs { get; set; }

    /// <summary>Error message if delivery failed.</summary>
    [JsonPropertyName("error")]
    public string? Error { get; set; }

    /// <summary>Raw payload bytes.</summary>
    [JsonPropertyName("payload")]
    public List<int>? Payload { get; set; }

    /// <summary>Creation timestamp.</summary>
    [JsonPropertyName("created_at")]
    public string? CreatedAt { get; set; }
}
