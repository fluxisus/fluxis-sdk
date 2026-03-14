using Fluxis.Models;

namespace Fluxis.Resources;

/// <summary>
/// Operations for creating and reading NASPIP tokens (PASETO v4).
/// </summary>
public sealed class NaspipResource
{
    private readonly FluxisClient _client;

    internal NaspipResource(FluxisClient client) => _client = client;

    /// <summary>
    /// Creates a NASPIP token from raw payment data.
    /// </summary>
    /// <param name="request">Payment data to encode.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The generated NASPIP token.</returns>
    public async Task<CreateNaspipResponse> CreateAsync(CreateNaspipRequest request, CancellationToken cancellationToken = default)
    {
        return await _client.RequestAsync<CreateNaspipResponse>(HttpMethod.Post, "/naspip/create", request, cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Verifies and decodes a NASPIP token via the Fluxis API.
    /// Do NOT attempt to decode PASETO tokens locally — always use this method.
    /// </summary>
    /// <param name="token">The NASPIP token string to verify and decode.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The decoded payment and order information.</returns>
    public async Task<ReadNaspipResponse> ReadAsync(string token, CancellationToken cancellationToken = default)
    {
        return await _client.RequestAsync<ReadNaspipResponse>(HttpMethod.Post, "/naspip/read", new { token }, cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Checks if a string looks like a valid NASPIP token (PASETO v4 format prefix).
    /// This does NOT verify the token — use <see cref="ReadAsync"/> for full verification.
    /// </summary>
    /// <param name="token">The token string to check.</param>
    /// <returns><c>true</c> if the token has the expected PASETO v4 prefix.</returns>
    public static bool IsValidTokenFormat(string token)
    {
        return token.StartsWith("v4.local.", StringComparison.Ordinal);
    }
}
