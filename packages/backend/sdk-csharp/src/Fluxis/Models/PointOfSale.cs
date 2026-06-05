using System.Text.Json.Serialization;

namespace Fluxis.Models;

/// <summary>
/// Request body for creating a Point of Sale.
/// </summary>
public sealed class CreatePointOfSaleRequest
{
    /// <summary>PoS name.</summary>
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>Account ID to associate with this PoS.</summary>
    [JsonPropertyName("account_id")]
    public string? AccountId { get; set; }

    /// <summary>Merchant information.</summary>
    [JsonPropertyName("merchant")]
    public Merchant? Merchant { get; set; }

    /// <summary>Accepted unique asset IDs.</summary>
    [JsonPropertyName("payment_options")]
    public List<string>? PaymentOptions { get; set; }
}

/// <summary>
/// Request body for updating a Point of Sale.
/// </summary>
public sealed class UpdatePointOfSaleRequest
{
    /// <summary>Updated PoS name.</summary>
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    /// <summary>Updated merchant information.</summary>
    [JsonPropertyName("merchant")]
    public Merchant? Merchant { get; set; }

    /// <summary>Updated accepted asset IDs.</summary>
    [JsonPropertyName("payment_options")]
    public List<string>? PaymentOptions { get; set; }
}

/// <summary>
/// PoS configuration (merchant + payment options).
/// </summary>
public sealed class PointOfSaleConfig
{
    /// <summary>Merchant information.</summary>
    [JsonPropertyName("merchant")]
    public Merchant? Merchant { get; set; }

    /// <summary>Accepted unique asset IDs.</summary>
    [JsonPropertyName("payment_options")]
    public List<string>? PaymentOptions { get; set; }
}

/// <summary>
/// Point of Sale entity returned by the API.
/// </summary>
public sealed class PointOfSale
{
    /// <summary>Unique PoS ID.</summary>
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    /// <summary>PoS name.</summary>
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>Organization ID.</summary>
    [JsonPropertyName("organization_id")]
    public string? OrganizationId { get; set; }

    /// <summary>Organization name.</summary>
    [JsonPropertyName("organization_name")]
    public string? OrganizationName { get; set; }

    /// <summary>Account ID.</summary>
    [JsonPropertyName("account_id")]
    public string? AccountId { get; set; }

    /// <summary>Account name.</summary>
    [JsonPropertyName("account_name")]
    public string? AccountName { get; set; }

    /// <summary>PoS configuration.</summary>
    [JsonPropertyName("config")]
    public PointOfSaleConfig? Config { get; set; }

    /// <summary>Creation timestamp.</summary>
    [JsonPropertyName("created_at")]
    public string? CreatedAt { get; set; }

    /// <summary>Last update timestamp.</summary>
    [JsonPropertyName("updated_at")]
    public string? UpdatedAt { get; set; }
}

/// <summary>
/// Request to create webhook notification settings.
/// </summary>
public sealed class CreateNotificationSettingsRequest
{
    /// <summary>URL to receive webhook notifications.</summary>
    [JsonPropertyName("webhook_url")]
    public string WebhookUrl { get; set; } = string.Empty;
}

/// <summary>
/// Current notification settings for a PoS.
/// </summary>
public sealed class NotificationSettings
{
    /// <summary>Configured webhook URL.</summary>
    [JsonPropertyName("webhook_url")]
    public string WebhookUrl { get; set; } = string.Empty;
}

/// <summary>
/// Response from creating notification settings (includes secret).
/// </summary>
public sealed class CreateNotificationSettingsResponse
{
    /// <summary>Configured webhook URL.</summary>
    [JsonPropertyName("webhook_url")]
    public string WebhookUrl { get; set; } = string.Empty;

    /// <summary>HMAC secret for verifying webhook signatures. Store this securely.</summary>
    [JsonPropertyName("secret")]
    public string Secret { get; set; } = string.Empty;
}

/// <summary>
/// Request to update webhook notification settings.
/// </summary>
public sealed class UpdateNotificationSettingsRequest
{
    /// <summary>New webhook URL.</summary>
    [JsonPropertyName("webhook_url")]
    public string WebhookUrl { get; set; } = string.Empty;
}

/// <summary>
/// Response from updating notification settings.
/// </summary>
public sealed class UpdateNotificationSettingsResponse
{
    /// <summary>Updated webhook URL.</summary>
    [JsonPropertyName("webhook_url")]
    public string WebhookUrl { get; set; } = string.Empty;
}

/// <summary>
/// Request body for creating a payment request (crypto flow with unique_asset_id).
/// </summary>
public sealed class CreatePaymentRequestRequest
{
    /// <summary>Payment amount as a string (e.g. "1234.99").</summary>
    [JsonPropertyName("amount")]
    public string Amount { get; set; } = string.Empty;

    /// <summary>Unique asset identifier (e.g. "npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359").</summary>
    [JsonPropertyName("unique_asset_id")]
    public string UniqueAssetId { get; set; } = string.Empty;

    /// <summary>Your internal order/reference ID for reconciliation.</summary>
    [JsonPropertyName("reference_id")]
    public string? ReferenceId { get; set; }

    /// <summary>Order details (items, merchant, description).</summary>
    [JsonPropertyName("order")]
    public Order? Order { get; set; }
}

/// <summary>
/// Request body for creating a checkout payment request (fiat flow with coin_code).
/// </summary>
public sealed class CreatePaymentRequestCheckoutRequest
{
    /// <summary>Payment amount as a string (e.g. "1234.99").</summary>
    [JsonPropertyName("amount")]
    public string Amount { get; set; } = string.Empty;

    /// <summary>Fiat currency code (e.g. "USD").</summary>
    [JsonPropertyName("coin_code")]
    public string CoinCode { get; set; } = string.Empty;

    /// <summary>Your internal order/reference ID for reconciliation.</summary>
    [JsonPropertyName("reference_id")]
    public string? ReferenceId { get; set; }

    /// <summary>Order details.</summary>
    [JsonPropertyName("order")]
    public Order? Order { get; set; }
}

/// <summary>
/// Response from creating a payment request.
/// </summary>
public sealed class PaymentRequestResponse
{
    /// <summary>Payment request ID.</summary>
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    /// <summary>Current status (created, processing, completed, etc.).</summary>
    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    /// <summary>NASPIP token (PASETO v4) — render as QR or transmit via NFC.</summary>
    [JsonPropertyName("token")]
    public string Token { get; set; } = string.Empty;

    /// <summary>Your reference ID (echoed back).</summary>
    [JsonPropertyName("reference_id")]
    public string? ReferenceId { get; set; }

    /// <summary>Expiration as a Unix timestamp.</summary>
    [JsonPropertyName("expiration")]
    public long? Expiration { get; set; }
}

/// <summary>
/// Response from creating a checkout payment request (includes checkout URL).
/// </summary>
public sealed class PaymentRequestCheckoutResponse
{
    /// <summary>Payment request ID.</summary>
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    /// <summary>Current status.</summary>
    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    /// <summary>NASPIP token.</summary>
    [JsonPropertyName("token")]
    public string Token { get; set; } = string.Empty;

    /// <summary>Your reference ID.</summary>
    [JsonPropertyName("reference_id")]
    public string? ReferenceId { get; set; }

    /// <summary>Expiration as a Unix timestamp.</summary>
    [JsonPropertyName("expiration")]
    public long? Expiration { get; set; }

    /// <summary>Hosted checkout URL — redirect the user here to complete payment.</summary>
    [JsonPropertyName("checkout_url")]
    public string? CheckoutUrl { get; set; }
}
