using Fluxis.Models;

namespace Fluxis.Resources;

/// <summary>
/// Operations for listing and querying transactions.
/// </summary>
public sealed class TransactionsResource
{
    private readonly FluxisClient _client;

    internal TransactionsResource(FluxisClient client) => _client = client;

    /// <summary>
    /// Lists transactions with optional filtering and pagination.
    /// </summary>
    /// <param name="options">Query options (limit, offset, status, sort, order, accountId).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Paginated list of transactions.</returns>
    public async Task<TransactionListResponse> ListAsync(
        ListTransactionsOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        Dictionary<string, string>? query = null;

        if (options != null)
        {
            query = new Dictionary<string, string>();

            if (options.Limit.HasValue)
                query["limit"] = options.Limit.Value.ToString();
            if (options.Offset.HasValue)
                query["offset"] = options.Offset.Value.ToString();
            if (options.Status != null)
                query["status"] = options.Status;
            if (options.Sort != null)
                query["sort"] = options.Sort;
            if (options.Order != null)
                query["order"] = options.Order;
            if (options.AccountId != null)
                query["accountID"] = options.AccountId;
        }

        return await _client.RequestAsync<TransactionListResponse>(
            HttpMethod.Get, "/transactions", query: query, cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }
}
