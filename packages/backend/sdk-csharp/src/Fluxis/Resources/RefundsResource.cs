using Fluxis.Models;

namespace Fluxis.Resources;

/// <summary>
/// Operations for creating and querying refunds.
/// </summary>
public sealed class RefundsResource
{
    private readonly FluxisClient _client;

    internal RefundsResource(FluxisClient client) => _client = client;

    /// <summary>
    /// Creates a refund for a completed or overpaid payment request.
    /// </summary>
    /// <param name="paymentRequestId">The payment request ID to refund.</param>
    /// <param name="request">Refund details (address, amount, reason).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The created refund.</returns>
    public async Task<RefundResponse> CreateAsync(
        string paymentRequestId,
        CreateRefundRequest request,
        CancellationToken cancellationToken = default)
    {
        return await _client.RequestAsync<RefundResponse>(
            HttpMethod.Post, $"/refunds/payment-request/{paymentRequestId}", request, cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Gets detailed information about a refund.
    /// </summary>
    /// <param name="refundId">The refund ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Detailed refund information.</returns>
    public async Task<RefundDetail> GetAsync(string refundId, CancellationToken cancellationToken = default)
    {
        return await _client.RequestAsync<RefundDetail>(HttpMethod.Get, $"/refunds/{refundId}", cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }
}
