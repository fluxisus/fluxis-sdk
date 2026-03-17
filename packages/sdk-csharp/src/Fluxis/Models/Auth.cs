using System.Text.Json.Serialization;

namespace Fluxis.Models;

/// <summary>
/// Request body for POST /auth/token.
/// </summary>
internal sealed class AuthTokenRequest
{
    [JsonPropertyName("api_key")]
    public string ApiKey { get; set; } = string.Empty;

    [JsonPropertyName("api_secret")]
    public string ApiSecret { get; set; } = string.Empty;
}

/// <summary>
/// Response from POST /auth/token.
/// </summary>
internal sealed class AuthTokenResponse
{
    [JsonPropertyName("token")]
    public string Token { get; set; } = string.Empty;

    [JsonPropertyName("expired_at")]
    public string ExpiredAt { get; set; } = string.Empty;
}
