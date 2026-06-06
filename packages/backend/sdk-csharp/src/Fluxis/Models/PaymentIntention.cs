using System.Text.Json.Serialization;

namespace Fluxis.Models;

/// <summary>
/// Payment intention data for an open PoS.
/// </summary>
public sealed class PaymentIntention
{
    /// <summary>Payment amount.</summary>
    [JsonPropertyName("amount")]
    public double? Amount { get; set; }

    /// <summary>Reference currency code (e.g. "USD").</summary>
    [JsonPropertyName("reference_currency")]
    public string? ReferenceCurrency { get; set; }

    /// <summary>External reference ID.</summary>
    [JsonPropertyName("external_id")]
    public string? ExternalId { get; set; }

    /// <summary>Associated payment request ID.</summary>
    [JsonPropertyName("payment_request_id")]
    public string? PaymentRequestId { get; set; }

    /// <summary>Point of sale ID.</summary>
    [JsonPropertyName("point_of_sale_id")]
    public string? PointOfSaleId { get; set; }

    /// <summary>Current status.</summary>
    [JsonPropertyName("status")]
    public string? Status { get; set; }

    /// <summary>NASPIP token.</summary>
    [JsonPropertyName("token")]
    public string? Token { get; set; }

    /// <summary>Expiration timestamp.</summary>
    [JsonPropertyName("expired_at")]
    public string? ExpiredAt { get; set; }
}

/// <summary>
/// Request body for creating a payment intention.
/// </summary>
public sealed class CreatePaymentIntentionRequest
{
    /// <summary>Requested payment amount.</summary>
    [JsonPropertyName("amount")]
    public double Amount { get; set; }

    /// <summary>Reference currency code (e.g. "USD").</summary>
    [JsonPropertyName("coin_code")]
    public string CoinCode { get; set; } = string.Empty;

    /// <summary>Optional external reference ID.</summary>
    [JsonPropertyName("external_id")]
    public string? ExternalId { get; set; }
}

/// <summary>
/// Response from creating a payment intention.
/// </summary>
public sealed class CreatePaymentIntentionResponse
{
    /// <summary>NASPIP token containing the payment intention payload.</summary>
    [JsonPropertyName("token")]
    public string? Token { get; set; }

    /// <summary>Payment request expiration timestamp.</summary>
    [JsonPropertyName("expiration")]
    public string? Expiration { get; set; }

    /// <summary>Payment intention details.</summary>
    [JsonPropertyName("payment")]
    public PaymentIntention? Payment { get; set; }
}

/// <summary>
/// Response from getting the current payment intention.
/// </summary>
public sealed class PaymentIntentionResponse
{
    /// <summary>NASPIP token.</summary>
    [JsonPropertyName("token")]
    public string? Token { get; set; }

    /// <summary>Payment intention details.</summary>
    [JsonPropertyName("payment")]
    public PaymentIntention? Payment { get; set; }

    /// <summary>Associated payment request.</summary>
    [JsonPropertyName("payment_request")]
    public PaymentRequestResponse? PaymentRequest { get; set; }
}

/// <summary>
/// Response from getting a PoS QR code.
/// </summary>
public sealed class GetQrResponse
{
    /// <summary>QR code data (typically a base64-encoded image or URL).</summary>
    [JsonPropertyName("qr")]
    public string? Qr { get; set; }
}
