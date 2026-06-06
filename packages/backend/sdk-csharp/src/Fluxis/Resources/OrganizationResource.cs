using Fluxis.Models;

namespace Fluxis.Resources;

/// <summary>
/// Organization-level operations.
/// </summary>
public sealed class OrganizationResource
{
    private readonly FluxisClient _client;

    internal OrganizationResource(FluxisClient client) => _client = client;

    /// <summary>
    /// Gets the current organization.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The organization.</returns>
    public async Task<Organization> GetAsync(CancellationToken cancellationToken = default)
    {
        return await _client.RequestAsync<Organization>(HttpMethod.Get, "/organization", cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Sets a settlement address for the organization.
    /// </summary>
    /// <param name="request">Settlement address data.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The configured settlement address.</returns>
    public async Task<SettlementAddressResponse> SetSettlementAddressAsync(
        SettlementAddressRequest request,
        CancellationToken cancellationToken = default)
    {
        return await _client.RequestAsync<SettlementAddressResponse>(
            HttpMethod.Post, "/organization/settlement-addresses", request, cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Updates a settlement address for the organization.
    /// </summary>
    /// <param name="request">Updated settlement address data.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The updated settlement address.</returns>
    public async Task<SettlementAddressResponse> UpdateSettlementAddressAsync(
        SettlementAddressRequest request,
        CancellationToken cancellationToken = default)
    {
        return await _client.RequestAsync<SettlementAddressResponse>(
            HttpMethod.Put, "/organization/settlement-addresses", request, cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Gets all settlement addresses for the organization.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Configured settlement addresses.</returns>
    public async Task<List<SettlementAddressResponse>> GetSettlementAddressesAsync(
        CancellationToken cancellationToken = default)
    {
        return await _client.RequestAsync<List<SettlementAddressResponse>>(
            HttpMethod.Get, "/organization/settlement-addresses", cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Deletes a settlement address for the organization by network.
    /// </summary>
    /// <param name="network">Blockchain network identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    public async Task DeleteSettlementAddressAsync(string network, CancellationToken cancellationToken = default)
    {
        await _client.RequestAsync(
            HttpMethod.Delete,
            "/organization/settlement-addresses",
            query: new Dictionary<string, string> { ["network"] = network },
            cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }
}
