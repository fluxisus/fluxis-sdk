using System.Text.Json.Serialization;

namespace Fluxis.Models;

/// <summary>
/// Payment data for creating a NASPIP token.
/// </summary>
public sealed class NaspipPaymentData
{
    /// <summary>Payment identifier.</summary>
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    /// <summary>Blockchain address to receive payment.</summary>
    [JsonPropertyName("address")]
    public string Address { get; set; } = string.Empty;

    /// <summary>Payment amount.</summary>
    [JsonPropertyName("amount")]
    public double Amount { get; set; }

    /// <summary>Unique asset identifier (e.g. "npolygon_t0x...").</summary>
    [JsonPropertyName("unique_asset_id")]
    public string UniqueAssetId { get; set; } = string.Empty;

    /// <summary>Expiration as a Unix timestamp.</summary>
    [JsonPropertyName("expires_at")]
    public long? ExpiresAt { get; set; }

    /// <summary>Whether this is an open (any amount) payment.</summary>
    [JsonPropertyName("is_open")]
    public bool? IsOpen { get; set; }
}

/// <summary>
/// Request body for POST /naspip/create.
/// </summary>
public sealed class CreateNaspipRequest
{
    /// <summary>Payment data to encode into a NASPIP token.</summary>
    [JsonPropertyName("payment")]
    public NaspipPaymentData Payment { get; set; } = new();
}

/// <summary>
/// Response from POST /naspip/create.
/// </summary>
public sealed class CreateNaspipResponse
{
    /// <summary>The generated NASPIP token (PASETO v4).</summary>
    [JsonPropertyName("token")]
    public string Token { get; set; } = string.Empty;
}

/// <summary>
/// Payment info decoded from a NASPIP token.
/// </summary>
public sealed class NaspipPaymentInfo
{
    /// <summary>Payment identifier.</summary>
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    /// <summary>Blockchain address.</summary>
    [JsonPropertyName("address")]
    public string? Address { get; set; }

    /// <summary>Payment amount.</summary>
    [JsonPropertyName("amount")]
    public double? Amount { get; set; }

    /// <summary>Unique asset identifier.</summary>
    [JsonPropertyName("unique_asset_id")]
    public string? UniqueAssetId { get; set; }

    /// <summary>Expiration as a Unix timestamp.</summary>
    [JsonPropertyName("expires_at")]
    public long? ExpiresAt { get; set; }

    /// <summary>Whether this is an open payment.</summary>
    [JsonPropertyName("is_open")]
    public bool? IsOpen { get; set; }
}

/// <summary>
/// Order info decoded from a NASPIP token.
/// </summary>
public sealed class NaspipOrderInfo
{
    /// <summary>Order total.</summary>
    [JsonPropertyName("total")]
    public string? Total { get; set; }

    /// <summary>Currency code.</summary>
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

/// <summary>
/// Response from POST /naspip/read (token verification and decoding).
/// </summary>
public sealed class ReadNaspipResponse
{
    /// <summary>Decoded payment information.</summary>
    [JsonPropertyName("payment")]
    public NaspipPaymentInfo? Payment { get; set; }

    /// <summary>Decoded order information.</summary>
    [JsonPropertyName("order")]
    public NaspipOrderInfo? Order { get; set; }

    /// <summary>Available payment options.</summary>
    [JsonPropertyName("payment_options")]
    public List<string>? PaymentOptions { get; set; }

    /// <summary>Payment URL.</summary>
    [JsonPropertyName("url")]
    public string? Url { get; set; }
}
