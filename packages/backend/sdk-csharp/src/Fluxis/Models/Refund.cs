using System.Text.Json.Serialization;

namespace Fluxis.Models;

/// <summary>
/// Request body for creating a refund.
/// </summary>
public sealed class CreateRefundRequest
{
    /// <summary>Blockchain address to send the refund to.</summary>
    [JsonPropertyName("refund_to_address")]
    public string RefundToAddress { get; set; } = string.Empty;

    /// <summary>Refund amount (optional — defaults to full amount).</summary>
    [JsonPropertyName("amount")]
    public string? Amount { get; set; }

    /// <summary>Reason for the refund.</summary>
    [JsonPropertyName("reason")]
    public string? Reason { get; set; }
}

/// <summary>
/// Response from creating a refund.
/// </summary>
public sealed class RefundResponse
{
    /// <summary>Refund ID.</summary>
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    /// <summary>Refund amount.</summary>
    [JsonPropertyName("amount")]
    public double Amount { get; set; }

    /// <summary>Destination address.</summary>
    [JsonPropertyName("refund_to_address")]
    public string RefundToAddress { get; set; } = string.Empty;

    /// <summary>Refund status.</summary>
    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;
}

/// <summary>
/// Detailed refund information.
/// </summary>
public sealed class RefundDetail
{
    /// <summary>Refund ID.</summary>
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    /// <summary>Associated payment request ID.</summary>
    [JsonPropertyName("payment_request_id")]
    public string? PaymentRequestId { get; set; }

    /// <summary>Refund amount.</summary>
    [JsonPropertyName("amount")]
    public double Amount { get; set; }

    /// <summary>Destination address.</summary>
    [JsonPropertyName("refund_to_address")]
    public string RefundToAddress { get; set; } = string.Empty;

    /// <summary>Refund status.</summary>
    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    /// <summary>Reason for the refund.</summary>
    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

    /// <summary>Blockchain network.</summary>
    [JsonPropertyName("network")]
    public string? Network { get; set; }

    /// <summary>Unique asset ID.</summary>
    [JsonPropertyName("unique_asset_id")]
    public string? UniqueAssetId { get; set; }

    /// <summary>Original payment transaction hash.</summary>
    [JsonPropertyName("payment_transaction_hash")]
    public string? PaymentTransactionHash { get; set; }

    /// <summary>Refund transaction hash.</summary>
    [JsonPropertyName("refund_transaction_hash")]
    public string? RefundTransactionHash { get; set; }

    /// <summary>ID of the entity that requested the refund.</summary>
    [JsonPropertyName("requested_by_entity_id")]
    public string? RequestedByEntityId { get; set; }

    /// <summary>Type of entity that requested the refund.</summary>
    [JsonPropertyName("requested_by_entity_type")]
    public string? RequestedByEntityType { get; set; }

    /// <summary>Creation timestamp.</summary>
    [JsonPropertyName("created_at")]
    public string? CreatedAt { get; set; }

    /// <summary>Last update timestamp.</summary>
    [JsonPropertyName("updated_at")]
    public string? UpdatedAt { get; set; }
}
