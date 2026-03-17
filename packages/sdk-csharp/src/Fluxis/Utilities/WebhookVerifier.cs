using System.Security.Cryptography;
using System.Text;

namespace Fluxis.Utilities;

/// <summary>
/// Utility for verifying Fluxis webhook signatures.
/// </summary>
public static class WebhookVerifier
{
    /// <summary>
    /// Verifies a Fluxis webhook signature using HMAC-SHA256.
    /// </summary>
    /// <param name="payload">The raw request body as a string.</param>
    /// <param name="signature">The signature from the <c>x-fluxis-signature</c> header.</param>
    /// <param name="secret">The webhook secret obtained when creating notification settings.</param>
    /// <returns><c>true</c> if the signature is valid; <c>false</c> otherwise.</returns>
    /// <example>
    /// <code>
    /// // In your ASP.NET Core controller:
    /// [HttpPost("webhook/fluxis")]
    /// public async Task&lt;IActionResult&gt; HandleWebhook()
    /// {
    ///     var payload = await new StreamReader(Request.Body).ReadToEndAsync();
    ///     var signature = Request.Headers["x-fluxis-signature"].ToString();
    ///
    ///     if (!WebhookVerifier.VerifySignature(payload, signature, webhookSecret))
    ///         return Unauthorized();
    ///
    ///     // Process the webhook event...
    ///     return Ok();
    /// }
    /// </code>
    /// </example>
    public static bool VerifySignature(string payload, string signature, string secret)
    {
        var keyBytes = Encoding.UTF8.GetBytes(secret);
        var payloadBytes = Encoding.UTF8.GetBytes(payload);

        using var hmac = new HMACSHA256(keyBytes);
        var hashBytes = hmac.ComputeHash(payloadBytes);
        var computed = Convert.ToHexString(hashBytes).ToLowerInvariant();

        // Constant-time comparison
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(computed),
            Encoding.UTF8.GetBytes(signature));
    }
}
