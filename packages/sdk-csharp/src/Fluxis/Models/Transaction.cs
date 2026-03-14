using System.Text.Json.Serialization;

namespace Fluxis.Models;

/// <summary>
/// Options for listing transactions (query parameters).
/// </summary>
public sealed class ListTransactionsOptions
{
    /// <summary>Maximum number of results to return.</summary>
    public int? Limit { get; set; }

    /// <summary>Number of results to skip.</summary>
    public int? Offset { get; set; }

    /// <summary>Filter by transaction status.</summary>
    public string? Status { get; set; }

    /// <summary>Field to sort by.</summary>
    public string? Sort { get; set; }

    /// <summary>Sort direction ("asc" or "desc").</summary>
    public string? Order { get; set; }

    /// <summary>Filter by account ID.</summary>
    public string? AccountId { get; set; }
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
    public double? GrossAmount { get; set; }

    /// <summary>Net amount (after fees).</summary>
    [JsonPropertyName("net_amount")]
    public double? NetAmount { get; set; }

    /// <summary>Expected amount.</summary>
    [JsonPropertyName("expected_amount")]
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

/// <summary>
/// Paginated response from listing transactions.
/// </summary>
public sealed class TransactionListResponse
{
    /// <summary>List of transactions.</summary>
    [JsonPropertyName("data")]
    public List<Transaction> Data { get; set; } = new();

    /// <summary>Total number of matching transactions.</summary>
    [JsonPropertyName("total")]
    public int Total { get; set; }

    /// <summary>Limit used in the query.</summary>
    [JsonPropertyName("limit")]
    public int Limit { get; set; }

    /// <summary>Offset used in the query.</summary>
    [JsonPropertyName("offset")]
    public int Offset { get; set; }
}
