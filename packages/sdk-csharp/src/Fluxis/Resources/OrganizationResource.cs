using Fluxis.Models;

namespace Fluxis.Resources;

/// <summary>
/// Organization-level operations (settlement addresses).
/// </summary>
public sealed class OrganizationResource
{
    private readonly FluxisClient _client;

    internal OrganizationResource(FluxisClient client) => _client = client;

    /// <summary>
    /// Sets settlement addresses for the organization.
    /// </summary>
    /// <param name="addresses">Settlement addresses to set.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The configured settlement addresses.</returns>
    public async Task<List<SettlementAddressResponse>> SetSettlementAddressesAsync(
        List<SettlementAddressRequest> addresses,
        CancellationToken cancellationToken = default)
    {
        return await _client.RequestAsync<List<SettlementAddressResponse>>(
            HttpMethod.Post, "/organization/settlement-addresses", addresses, cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Updates settlement addresses for the organization.
    /// </summary>
    /// <param name="addresses">Updated settlement addresses.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The updated settlement addresses.</returns>
    public async Task<List<SettlementAddressResponse>> UpdateSettlementAddressesAsync(
        List<SettlementAddressRequest> addresses,
        CancellationToken cancellationToken = default)
    {
        return await _client.RequestAsync<List<SettlementAddressResponse>>(
            HttpMethod.Put, "/organization/settlement-addresses", addresses, cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }
}
