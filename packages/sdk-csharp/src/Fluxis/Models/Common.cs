using System.Text.Json.Serialization;

namespace Fluxis.Models;

/// <summary>
/// Standard API response envelope.
/// </summary>
/// <typeparam name="T">The type of the data payload.</typeparam>
public sealed class ApiResponse<T>
{
    /// <summary>Response status ("success" or "error").</summary>
    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    /// <summary>Response data payload.</summary>
    [JsonPropertyName("data")]
    public T? Data { get; set; }
}

/// <summary>
/// API error response body.
/// </summary>
public sealed class ApiErrorResponse
{
    /// <summary>Response status (always "error").</summary>
    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    /// <summary>Machine-readable error code (e.g. "AK0001").</summary>
    [JsonPropertyName("code")]
    public string? Code { get; set; }

    /// <summary>Human-readable error message.</summary>
    [JsonPropertyName("message")]
    public string? Message { get; set; }

    /// <summary>Additional error details.</summary>
    [JsonPropertyName("details")]
    public string? Details { get; set; }
}

/// <summary>Payment request status values.</summary>
public static class PaymentRequestStatus
{
    /// <summary>Just created, awaiting payment.</summary>
    public const string Created = "created";
    /// <summary>Deposit detected, confirming.</summary>
    public const string Processing = "processing";
    /// <summary>NASPIP token expired, no payment received.</summary>
    public const string Expired = "expired";
    /// <summary>Fully paid.</summary>
    public const string Completed = "completed";
    /// <summary>Received more than requested.</summary>
    public const string Overpaid = "overpaid";
    /// <summary>Received less than requested.</summary>
    public const string Underpaid = "underpaid";
    /// <summary>Payment processing failed.</summary>
    public const string Failed = "failed";
}

/// <summary>Transaction type values.</summary>
public static class TransactionTypes
{
    /// <summary>Deposit transaction.</summary>
    public const string Deposit = "deposit";
    /// <summary>Withdrawal transaction.</summary>
    public const string Withdraw = "withdraw";
    /// <summary>Refund transaction.</summary>
    public const string Refund = "refund";
    /// <summary>Adjustment transaction.</summary>
    public const string Adjustment = "adjustment";
    /// <summary>Swap transaction.</summary>
    public const string Swap = "swap";
    /// <summary>Incoming payment.</summary>
    public const string PaymentIn = "payment_in";
    /// <summary>Outgoing payment.</summary>
    public const string PaymentOut = "payment_out";
    /// <summary>Dry run (test) transaction.</summary>
    public const string DryRun = "dry_run";
}

/// <summary>Transaction status values.</summary>
public static class TransactionStatuses
{
    /// <summary>Preview/draft state.</summary>
    public const string Preview = "preview";
    /// <summary>Pending confirmation.</summary>
    public const string Pending = "pending";
    /// <summary>Created.</summary>
    public const string Created = "created";
    /// <summary>Being processed.</summary>
    public const string Processing = "processing";
    /// <summary>Error occurred.</summary>
    public const string Error = "error";
    /// <summary>Transaction expired.</summary>
    public const string Expired = "expired";
    /// <summary>Transaction failed.</summary>
    public const string Failed = "failed";
    /// <summary>Transaction completed successfully.</summary>
    public const string Completed = "completed";
}

/// <summary>Merchant information for orders.</summary>
public sealed class Merchant
{
    /// <summary>Merchant name.</summary>
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    /// <summary>Merchant description.</summary>
    [JsonPropertyName("description")]
    public string? Description { get; set; }
}

/// <summary>Individual line item in an order.</summary>
public sealed class OrderItem
{
    /// <summary>Item description.</summary>
    [JsonPropertyName("description")]
    public string? Description { get; set; }

    /// <summary>Item quantity.</summary>
    [JsonPropertyName("quantity")]
    public int? Quantity { get; set; }

    /// <summary>Unit price as a string (e.g. "12.50").</summary>
    [JsonPropertyName("unit_price")]
    public string? UnitPrice { get; set; }

    /// <summary>Total amount for this line item.</summary>
    [JsonPropertyName("amount")]
    public string? Amount { get; set; }

    /// <summary>Currency code (e.g. "USD").</summary>
    [JsonPropertyName("coin_code")]
    public string? CoinCode { get; set; }
}

/// <summary>Order details for a payment request.</summary>
public sealed class Order
{
    /// <summary>Order total as a string.</summary>
    [JsonPropertyName("total")]
    public string? Total { get; set; }

    /// <summary>Currency code (e.g. "USD").</summary>
    [JsonPropertyName("coin_code")]
    public string? CoinCode { get; set; }

    /// <summary>Order description.</summary>
    [JsonPropertyName("description")]
    public string? Description { get; set; }

    /// <summary>Merchant info.</summary>
    [JsonPropertyName("merchant")]
    public Merchant? Merchant { get; set; }

    /// <summary>Line items.</summary>
    [JsonPropertyName("items")]
    public List<OrderItem>? Items { get; set; }
}

/// <summary>Settlement address configuration.</summary>
public sealed class SettlementAddress
{
    /// <summary>Blockchain address for settlement.</summary>
    [JsonPropertyName("settlement_address")]
    public string? Address { get; set; }

    /// <summary>Address tag/memo (for networks that require it).</summary>
    [JsonPropertyName("address_tag")]
    public string? AddressTag { get; set; }

    /// <summary>Address type.</summary>
    [JsonPropertyName("address_type")]
    public string? AddressType { get; set; }

    /// <summary>Owner entity type.</summary>
    [JsonPropertyName("owner")]
    public string? Owner { get; set; }

    /// <summary>Settlement type.</summary>
    [JsonPropertyName("settlement_type")]
    public string? SettlementType { get; set; }
}

/// <summary>Fluxis environment (staging or production).</summary>
public enum FluxisEnvironment
{
    /// <summary>Staging sandbox environment.</summary>
    Staging,

    /// <summary>Production environment.</summary>
    Production
}
