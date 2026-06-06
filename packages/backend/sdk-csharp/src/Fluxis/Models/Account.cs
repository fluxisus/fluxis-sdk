using System.Text.Json.Serialization;

namespace Fluxis.Models;

/// <summary>
/// Request body for creating an account.
/// </summary>
public sealed class CreateAccountRequest
{
    /// <summary>Account name.</summary>
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>External identifier for this account in your system.</summary>
    [JsonPropertyName("external_id")]
    public string? ExternalId { get; set; }
}

/// <summary>
/// Request body for updating an account.
/// </summary>
public sealed class UpdateAccountRequest
{
    /// <summary>Updated account name.</summary>
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    /// <summary>Updated external identifier.</summary>
    [JsonPropertyName("external_id")]
    public string? ExternalId { get; set; }
}

/// <summary>
/// Account entity returned by the API.
/// </summary>
public sealed class Account
{
    /// <summary>Account ID.</summary>
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    /// <summary>Account name.</summary>
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>External identifier.</summary>
    [JsonPropertyName("external_id")]
    public string? ExternalId { get; set; }
}

/// <summary>
/// Settlement addresses for an account.
/// </summary>
public sealed class AccountSettlementAddresses
{
    /// <summary>List of settlement addresses.</summary>
    [JsonPropertyName("addresses")]
    public List<SettlementAddress> Addresses { get; set; } = new();
}
