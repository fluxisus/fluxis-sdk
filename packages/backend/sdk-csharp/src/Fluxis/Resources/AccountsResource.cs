using Fluxis.Models;

namespace Fluxis.Resources;

/// <summary>
/// Operations for managing accounts under your organization.
/// </summary>
public sealed class AccountsResource
{
    private readonly FluxisClient _client;

    internal AccountsResource(FluxisClient client) => _client = client;

    /// <summary>
    /// Lists all accounts in your organization.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A list of accounts.</returns>
    public async Task<List<Account>> ListAsync(CancellationToken cancellationToken = default)
    {
        return await _client.RequestAsync<List<Account>>(HttpMethod.Get, "/account", cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Gets an account by ID.
    /// </summary>
    /// <param name="accountId">The account ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The account.</returns>
    public async Task<Account> GetAsync(string accountId, CancellationToken cancellationToken = default)
    {
        return await _client.RequestAsync<Account>(HttpMethod.Get, $"/account/{accountId}", cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Creates a new account.
    /// </summary>
    /// <param name="request">Account creation data.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The created account.</returns>
    public async Task<Account> CreateAsync(CreateAccountRequest request, CancellationToken cancellationToken = default)
    {
        return await _client.RequestAsync<Account>(HttpMethod.Post, "/account", request, cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Updates an existing account.
    /// </summary>
    /// <param name="accountId">The account ID to update.</param>
    /// <param name="request">Fields to update.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The updated account.</returns>
    public async Task<Account> UpdateAsync(string accountId, UpdateAccountRequest request, CancellationToken cancellationToken = default)
    {
        return await _client.RequestAsync<Account>(HttpMethod.Put, $"/account/{accountId}", request, cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Deletes an account.
    /// </summary>
    /// <param name="accountId">The account ID to delete.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    public async Task DeleteAsync(string accountId, CancellationToken cancellationToken = default)
    {
        await _client.RequestAsync(HttpMethod.Delete, $"/account/{accountId}", cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Gets settlement addresses for an account.
    /// </summary>
    /// <param name="accountId">The account ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The account's settlement addresses.</returns>
    public async Task<AccountSettlementAddresses> GetSettlementAddressesAsync(string accountId, CancellationToken cancellationToken = default)
    {
        return await _client.RequestAsync<AccountSettlementAddresses>(HttpMethod.Get, $"/account/{accountId}/settlement-addresses", cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }
}
