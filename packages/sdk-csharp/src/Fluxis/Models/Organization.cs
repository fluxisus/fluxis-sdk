using System.Text.Json.Serialization;

namespace Fluxis.Models;

/// <summary>
/// Request body for setting or updating organization settlement addresses.
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
