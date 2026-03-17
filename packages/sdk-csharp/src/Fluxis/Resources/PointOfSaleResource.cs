using Fluxis.Models;

namespace Fluxis.Resources;

/// <summary>
/// Operations for managing Points of Sale, notification settings, and payment requests.
/// </summary>
public sealed class PointOfSaleResource
{
    private readonly FluxisClient _client;

    internal PointOfSaleResource(FluxisClient client) => _client = client;

    /// <summary>
    /// Lists all Points of Sale in your organization.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A list of PoS entities.</returns>
    public async Task<List<PointOfSale>> ListAsync(CancellationToken cancellationToken = default)
    {
        return await _client.RequestAsync<List<PointOfSale>>(HttpMethod.Get, "/pos", cancellationToken: cancellationToken)
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
    /// Gets webhook notification settings for a PoS.
    /// </summary>
    /// <param name="posId">The PoS ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Current notification settings.</returns>
    public async Task<NotificationSettings> GetNotificationsAsync(string posId, CancellationToken cancellationToken = default)
    {
        return await _client.RequestAsync<NotificationSettings>(HttpMethod.Get, $"/pos/{posId}/notifications", cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Creates webhook notification settings for a PoS.
    /// The response includes a <c>Secret</c> that you must store — it's used to verify webhook signatures.
    /// </summary>
    /// <param name="posId">The PoS ID.</param>
    /// <param name="request">Notification settings.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The created notification settings (includes webhook secret).</returns>
    public async Task<CreateNotificationSettingsResponse> CreateNotificationsAsync(
        string posId,
        CreateNotificationSettingsRequest request,
        CancellationToken cancellationToken = default)
    {
        return await _client.RequestAsync<CreateNotificationSettingsResponse>(
            HttpMethod.Post, $"/pos/{posId}/notifications", request, cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Updates the webhook URL for a PoS.
    /// </summary>
    /// <param name="posId">The PoS ID.</param>
    /// <param name="request">Updated notification settings.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The updated notification settings.</returns>
    public async Task<UpdateNotificationSettingsResponse> UpdateNotificationsAsync(
        string posId,
        UpdateNotificationSettingsRequest request,
        CancellationToken cancellationToken = default)
    {
        return await _client.RequestAsync<UpdateNotificationSettingsResponse>(
            HttpMethod.Put, $"/pos/{posId}/notifications", request, cancellationToken: cancellationToken)
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
