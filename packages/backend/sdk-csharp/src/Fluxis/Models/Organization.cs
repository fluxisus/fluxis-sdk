using System.Text.Json.Serialization;

namespace Fluxis.Models;

/// <summary>
/// Organization entity returned by the API.
/// </summary>
public sealed class Organization
{
    /// <summary>Organization ID.</summary>
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    /// <summary>Organization name.</summary>
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>ISO 3166-1 alpha-2 country code.</summary>
    [JsonPropertyName("country")]
    public string Country { get; set; } = string.Empty;

    /// <summary>Owner email address.</summary>
    [JsonPropertyName("owner_email")]
    public string OwnerEmail { get; set; } = string.Empty;

    /// <summary>Tax identification number.</summary>
    [JsonPropertyName("tax_id")]
    public string? TaxId { get; set; }

    /// <summary>Creation timestamp.</summary>
    [JsonPropertyName("created_at")]
    public string? CreatedAt { get; set; }

    /// <summary>Last update timestamp.</summary>
    [JsonPropertyName("updated_at")]
    public string? UpdatedAt { get; set; }
}

/// <summary>
/// Request body for setting or updating settlement addresses.
/// </summary>
public sealed class SettlementAddressRequest
{
    /// <summary>Blockchain address.</summary>
    [JsonPropertyName("address")]
    public string Address { get; set; } = string.Empty;

    /// <summary>Blockchain network identifier.</summary>
    [JsonPropertyName("network")]
    public string Network { get; set; } = string.Empty;

    /// <summary>Address tag/memo (for networks that require it).</summary>
    [JsonPropertyName("address_tag")]
    public string? AddressTag { get; set; }
}

/// <summary>
/// Response from settlement address operations.
/// </summary>
public sealed class SettlementAddressResponse
{
    /// <summary>Blockchain address.</summary>
    [JsonPropertyName("address")]
    public string Address { get; set; } = string.Empty;

    /// <summary>Blockchain network identifier.</summary>
    [JsonPropertyName("network")]
    public string Network { get; set; } = string.Empty;

    /// <summary>Address tag/memo.</summary>
    [JsonPropertyName("address_tag")]
    public string? AddressTag { get; set; }
}
