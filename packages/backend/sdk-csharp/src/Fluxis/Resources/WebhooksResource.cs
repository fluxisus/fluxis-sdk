using Fluxis.Models;

namespace Fluxis.Resources;

/// <summary>
/// Account-scoped webhook operations.
/// </summary>
public sealed class WebhooksResource
{
    private static readonly HttpMethod Patch = new("PATCH");

    private readonly FluxisClient _client;

    internal WebhooksResource(FluxisClient client) => _client = client;

    /// <summary>
    /// Creates a webhook for an account.
    /// The response includes a <c>Secret</c> that you must store — it's used to verify webhook signatures.
    /// </summary>
    /// <param name="accountId">The account ID.</param>
    /// <param name="request">Webhook creation data.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The created webhook (includes secret).</returns>
    public async Task<Webhook> CreateAsync(
        string accountId,
        WebhookCreateRequest request,
        CancellationToken cancellationToken = default)
    {
        return await _client.RequestAsync<Webhook>(
            HttpMethod.Post, $"/account/{accountId}/webhook", request, cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Lists all webhooks for an account.
    /// </summary>
    /// <param name="accountId">The account ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>All configured webhooks.</returns>
    public async Task<List<Webhook>> ListAsync(string accountId, CancellationToken cancellationToken = default)
    {
        return await _client.RequestAsync<List<Webhook>>(
            HttpMethod.Get, $"/account/{accountId}/webhook/list", cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Gets paginated webhook delivery logs for an account.
    /// </summary>
    /// <param name="accountId">The account ID.</param>
    /// <param name="page">Page number (1-based).</param>
    /// <param name="pageSize">Number of items per page.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Paginated webhook logs.</returns>
    public async Task<PaginatedResponse<WebhookLog>> GetLogsAsync(
        string accountId,
        int? page = null,
        int? pageSize = null,
        CancellationToken cancellationToken = default)
    {
        Dictionary<string, string>? query = null;

        if (page.HasValue || pageSize.HasValue)
        {
            query = new Dictionary<string, string>();
            if (page.HasValue)
                query["page"] = page.Value.ToString();
            if (pageSize.HasValue)
                query["page_size"] = pageSize.Value.ToString();
        }

        return await _client.RequestAsync<PaginatedResponse<WebhookLog>>(
            HttpMethod.Get, $"/account/{accountId}/webhook/logs", query: query, cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Activates a webhook.
    /// </summary>
    /// <param name="accountId">The account ID.</param>
    /// <param name="webhookId">The webhook ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The updated webhook.</returns>
    public async Task<Webhook> ActivateAsync(
        string accountId,
        string webhookId,
        CancellationToken cancellationToken = default)
    {
        return await _client.RequestAsync<Webhook>(
            Patch, $"/account/{accountId}/webhook/{webhookId}/activate", cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Deactivates a webhook.
    /// </summary>
    /// <param name="accountId">The account ID.</param>
    /// <param name="webhookId">The webhook ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The updated webhook.</returns>
    public async Task<Webhook> DeactivateAsync(
        string accountId,
        string webhookId,
        CancellationToken cancellationToken = default)
    {
        return await _client.RequestAsync<Webhook>(
            Patch, $"/account/{accountId}/webhook/{webhookId}/deactivate", cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Deletes a webhook.
    /// </summary>
    /// <param name="accountId">The account ID.</param>
    /// <param name="webhookId">The webhook ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    public async Task DeleteAsync(
        string accountId,
        string webhookId,
        CancellationToken cancellationToken = default)
    {
        await _client.RequestAsync(
            HttpMethod.Delete, $"/account/{accountId}/webhook/{webhookId}/delete", cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Sends a test event to a webhook.
    /// </summary>
    /// <param name="accountId">The account ID.</param>
    /// <param name="webhookId">The webhook ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    public async Task TestAsync(
        string accountId,
        string webhookId,
        CancellationToken cancellationToken = default)
    {
        await _client.RequestAsync(
            HttpMethod.Post, $"/account/{accountId}/webhook/{webhookId}/test", cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Updates the URL of a webhook.
    /// </summary>
    /// <param name="accountId">The account ID.</param>
    /// <param name="webhookId">The webhook ID.</param>
    /// <param name="request">Updated URL.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The updated webhook.</returns>
    public async Task<Webhook> UpdateUrlAsync(
        string accountId,
        string webhookId,
        WebhookUpdateUrlRequest request,
        CancellationToken cancellationToken = default)
    {
        return await _client.RequestAsync<Webhook>(
            HttpMethod.Put, $"/account/{accountId}/webhook/{webhookId}/url", request, cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }
}
