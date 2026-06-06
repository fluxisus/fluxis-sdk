using Fluxis.Models;

namespace Fluxis.Resources;

/// <summary>
/// Operations for listing and querying transactions.
/// </summary>
public sealed class TransactionsResource
{
    private const int DefaultPage = 1;
    private const int DefaultPageSize = 50;

    private readonly FluxisClient _client;

    internal TransactionsResource(FluxisClient client) => _client = client;

    /// <summary>
    /// Lists transactions with pagination.
    /// </summary>
    /// <param name="options">Query options (page, pageSize).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Paginated list of transactions.</returns>
    public async Task<PaginatedResponse<Transaction>> ListAsync(
        ListTransactionsOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        var query = new Dictionary<string, string>
        {
            ["page"] = (options?.Page ?? DefaultPage).ToString(),
            ["page_size"] = (options?.PageSize ?? DefaultPageSize).ToString(),
        };

        return await _client.RequestAsync<PaginatedResponse<Transaction>>(
            HttpMethod.Get, "/transactions", query: query, cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }
}
