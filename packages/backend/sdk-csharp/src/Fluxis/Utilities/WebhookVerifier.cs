using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Fluxis.Utilities;

/// <summary>
/// Utility for verifying Fluxis webhook signatures.
/// </summary>
public static class WebhookVerifier
{
    private const int MaxAgeSeconds = 10;

    /// <summary>
    /// Verifies a Fluxis webhook signature using HMAC-SHA256.
    /// </summary>
    /// <param name="payload">The parsed webhook payload.</param>
    /// <param name="signature">The signature from the <c>x-fluxis-signature</c> header.</param>
    /// <param name="timestamp">The timestamp from the <c>x-fluxis-timestamp</c> header.</param>
    /// <param name="secret">The webhook secret obtained when creating notification settings.</param>
    /// <returns><c>true</c> if the signature is valid; <c>false</c> otherwise.</returns>
    /// <example>
    /// <code>
    /// // In your ASP.NET Core controller:
    /// [HttpPost("webhook/fluxis")]
    /// public IActionResult HandleWebhook([FromBody] JsonElement payload)
    /// {
    ///     var signature = Request.Headers["x-fluxis-signature"].ToString();
    ///     var timestamp = Request.Headers["x-fluxis-timestamp"].ToString();
    ///
    ///     if (!WebhookVerifier.VerifySignature(payload, signature, timestamp, webhookSecret))
    ///         return Unauthorized();
    ///
    ///     // Process the webhook event...
    ///     return Ok();
    /// }
    /// </code>
    /// </example>
    public static bool VerifySignature(
        JsonElement payload,
        string signature,
        string timestamp,
        string secret)
    {
        if (!int.TryParse(timestamp, out var requestTimestamp))
            return false;

        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        if (now - requestTimestamp > MaxAgeSeconds)
            return false;

        var canonicalJson = JsonSerializer.Serialize(SortKeys(payload));
        var signedString = $"{timestamp}.{canonicalJson}";

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hashBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(signedString));
        var expectedSignature = Convert.ToHexString(hashBytes).ToLowerInvariant();

        if (signature.Length != expectedSignature.Length)
            return false;

        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(signature),
            Encoding.UTF8.GetBytes(expectedSignature));
    }

    private static object? SortKeys(JsonElement value)
    {
        return value.ValueKind switch
        {
            JsonValueKind.Array => value.EnumerateArray()
                .Select(SortKeys)
                .ToArray(),
            JsonValueKind.Object => value.EnumerateObject()
                .OrderBy(property => property.Name)
                .ToDictionary(
                    property => property.Name,
                    property => SortKeys(property.Value)),
            JsonValueKind.String => value.GetString(),
            JsonValueKind.Number => value.TryGetInt64(out var integer)
                ? integer
                : value.GetDouble(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Null => null,
            _ => value.GetRawText(),
        };
    }
}
