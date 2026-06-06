using Fluxis.Models;

namespace Fluxis.Resources;

/// <summary>
/// Operations for managing Points of Sale and payment requests.
/// </summary>
public sealed class PointOfSaleResource
{
    private readonly FluxisClient _client;

    internal PointOfSaleResource(FluxisClient client) => _client = client;

    /// <summary>
    /// Lists Points of Sale with optional pagination and filtering.
    /// </summary>
    /// <param name="options">Query options (page, pageSize, accountId).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Paginated list of PoS entities.</returns>
    public async Task<PaginatedResponse<PointOfSale>> ListAsync(
        ListPointOfSaleOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        Dictionary<string, string>? query = null;

        if (options != null)
        {
            query = new Dictionary<string, string>();

            if (options.Page.HasValue)
                query["page"] = options.Page.Value.ToString();
            if (options.PageSize.HasValue)
                query["page_size"] = options.PageSize.Value.ToString();
            if (options.AccountId != null)
                query["accountID"] = options.AccountId;
        }

        return await _client.RequestAsync<PaginatedResponse<PointOfSale>>(
            HttpMethod.Get, "/pos", query: query, cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Gets a Point of Sale by ID.
    /// </summary>
    /// <param name="posId">The PoS ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The PoS entity.</returns>
    public async Task<PointOfSale> GetAsync(string posId, CancellationToken cancellationToken = default)
    {
        return await _client.RequestAsync<PointOfSale>(HttpMethod.Get, $"/pos/{posId}", cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Creates a new Point of Sale.
    /// </summary>
    /// <param name="request">PoS creation data.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The created PoS.</returns>
    public async Task<PointOfSale> CreateAsync(CreatePointOfSaleRequest request, CancellationToken cancellationToken = default)
    {
        return await _client.RequestAsync<PointOfSale>(HttpMethod.Post, "/pos", request, cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Updates an existing Point of Sale.
    /// </summary>
    /// <param name="posId">The PoS ID to update.</param>
    /// <param name="request">Fields to update.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The updated PoS.</returns>
    public async Task<PointOfSale> UpdateAsync(string posId, UpdatePointOfSaleRequest request, CancellationToken cancellationToken = default)
    {
        return await _client.RequestAsync<PointOfSale>(HttpMethod.Put, $"/pos/{posId}", request, cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Deletes a Point of Sale.
    /// </summary>
    /// <param name="posId">The PoS ID to delete.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    public async Task DeleteAsync(string posId, CancellationToken cancellationToken = default)
    {
        await _client.RequestAsync(HttpMethod.Delete, $"/pos/{posId}", cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Gets the current payment intention for an open PoS.
    /// </summary>
    /// <param name="posId">The PoS ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The current payment intention.</returns>
    public async Task<PaymentIntentionResponse> GetPaymentIntentionAsync(
        string posId,
        CancellationToken cancellationToken = default)
    {
        return await _client.RequestAsync<PaymentIntentionResponse>(
            HttpMethod.Get, $"/pos/{posId}/payment-intention", cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Creates a payment intention for an open PoS.
    /// </summary>
    /// <param name="posId">The PoS ID.</param>
    /// <param name="request">Payment intention data.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The created payment intention.</returns>
    public async Task<CreatePaymentIntentionResponse> CreatePaymentIntentionAsync(
        string posId,
        CreatePaymentIntentionRequest request,
        CancellationToken cancellationToken = default)
    {
        return await _client.RequestAsync<CreatePaymentIntentionResponse>(
            HttpMethod.Post, $"/pos/{posId}/payment-intention", request, cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Closes the current payment intention for an open PoS.
    /// </summary>
    /// <param name="posId">The PoS ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    public async Task ClosePaymentIntentionAsync(string posId, CancellationToken cancellationToken = default)
    {
        await _client.RequestAsync(
            HttpMethod.Post, $"/pos/{posId}/payment-intention/close", cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Gets the QR code for a PoS.
    /// </summary>
    /// <param name="posId">The PoS ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>QR code data.</returns>
    public async Task<GetQrResponse> GetQrAsync(string posId, CancellationToken cancellationToken = default)
    {
        return await _client.RequestAsync<GetQrResponse>(
            HttpMethod.Get, $"/pos/{posId}/qr", cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Creates a payment request using a specific crypto asset (unique_asset_id).
    /// Returns a NASPIP token that can be rendered as QR or transmitted via NFC.
    /// </summary>
    /// <param name="posId">The PoS ID.</param>
    /// <param name="request">Payment request data.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The payment request response containing the NASPIP token.</returns>
    public async Task<PaymentRequestResponse> CreatePaymentRequestAsync(
        string posId,
        CreatePaymentRequestRequest request,
        CancellationToken cancellationToken = default)
    {
        return await _client.RequestAsync<PaymentRequestResponse>(
            HttpMethod.Post, $"/pos/{posId}/payment-request", request, cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Gets the status of a payment request.
    /// </summary>
    /// <param name="posId">The PoS ID.</param>
    /// <param name="paymentRequestId">The payment request ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The payment request with current status.</returns>
    public async Task<PaymentRequestResponse> GetPaymentRequestAsync(
        string posId,
        string paymentRequestId,
        CancellationToken cancellationToken = default)
    {
        return await _client.RequestAsync<PaymentRequestResponse>(
            HttpMethod.Get, $"/pos/{posId}/payment-request/{paymentRequestId}", cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Creates a payment request with a hosted checkout URL (fiat flow with coin_code).
    /// Redirect the user to the checkout URL to complete payment.
    /// </summary>
    /// <param name="posId">The PoS ID.</param>
    /// <param name="request">Checkout payment request data.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The payment request response with checkout URL.</returns>
    public async Task<PaymentRequestCheckoutResponse> CreatePaymentRequestCheckoutAsync(
        string posId,
        CreatePaymentRequestCheckoutRequest request,
        CancellationToken cancellationToken = default)
    {
        return await _client.RequestAsync<PaymentRequestCheckoutResponse>(
            HttpMethod.Post, $"/pos/{posId}/payment-request-checkout", request, cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }
}
