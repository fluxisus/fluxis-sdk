using System.Text.Json.Serialization;
using Fluxis.Utilities;

namespace Fluxis.Models;

/// <summary>
/// Options for listing transactions (query parameters).
/// </summary>
public sealed class ListTransactionsOptions
{
    /// <summary>Page number (1-based).</summary>
    public int? Page { get; set; }

    /// <summary>Number of items per page.</summary>
    public int? PageSize { get; set; }
}

/// <summary>
/// Transaction entity returned by the API.
/// </summary>
public sealed class Transaction
{
    /// <summary>Transaction ID.</summary>
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    /// <summary>Transaction type (deposit, withdraw, refund, etc.).</summary>
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    /// <summary>Transaction status.</summary>
    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    /// <summary>Currency identifier.</summary>
    [JsonPropertyName("currency")]
    public string? Currency { get; set; }

    /// <summary>Blockchain network.</summary>
    [JsonPropertyName("network")]
    public string? Network { get; set; }

    /// <summary>Unique asset ID.</summary>
    [JsonPropertyName("unique_asset_id")]
    public string? UniqueAssetId { get; set; }

    /// <summary>Gross amount.</summary>
    [JsonPropertyName("gross_amount")]
    [JsonConverter(typeof(FlexibleDoubleConverter))]
    public double? GrossAmount { get; set; }

    /// <summary>Net amount (after fees).</summary>
    [JsonPropertyName("net_amount")]
    [JsonConverter(typeof(FlexibleDoubleConverter))]
    public double? NetAmount { get; set; }

    /// <summary>Expected amount.</summary>
    [JsonPropertyName("expected_amount")]
    [JsonConverter(typeof(FlexibleDoubleConverter))]
    public double? ExpectedAmount { get; set; }

    /// <summary>Source entity/address.</summary>
    [JsonPropertyName("from")]
    public string? From { get; set; }

    /// <summary>Source entity type.</summary>
    [JsonPropertyName("from_type")]
    public string? FromType { get; set; }

    /// <summary>Destination entity/address.</summary>
    [JsonPropertyName("to")]
    public string? To { get; set; }

    /// <summary>Destination entity type.</summary>
    [JsonPropertyName("to_type")]
    public string? ToType { get; set; }

    /// <summary>On-chain transaction hash.</summary>
    [JsonPropertyName("transaction_hash")]
    public string? TransactionHash { get; set; }

    /// <summary>Financial provider used.</summary>
    [JsonPropertyName("financial_provider")]
    public string? FinancialProvider { get; set; }

    /// <summary>Account external ID.</summary>
    [JsonPropertyName("account_external_id")]
    public string? AccountExternalId { get; set; }

    /// <summary>Creation timestamp.</summary>
    [JsonPropertyName("created_at")]
    public string? CreatedAt { get; set; }

    /// <summary>Last update timestamp.</summary>
    [JsonPropertyName("updated_at")]
    public string? UpdatedAt { get; set; }
}
