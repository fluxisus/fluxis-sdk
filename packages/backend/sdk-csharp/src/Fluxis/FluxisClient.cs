using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Fluxis.Errors;
using Fluxis.Models;
using Fluxis.Resources;

namespace Fluxis;

/// <summary>
/// Main client for interacting with the Fluxis API.
/// Handles authentication, token refresh, and provides typed access to all API resources.
/// </summary>
/// <example>
/// <code>
/// var client = new FluxisClient(new FluxisClientOptions
/// {
///     ApiKey = "fxs.stg.your-key-id",
///     ApiSecret = "your-secret"
/// });
///
/// var pos = await client.PointOfSale.ListAsync();
/// </code>
/// </example>
public sealed class FluxisClient : IDisposable
{
    private const string StagingBaseUrl = "https://api.stgfluxis.us/v1";
    private const string ProductionBaseUrl = "https://api.fluxis.us/v1";

    private static readonly TimeSpan TokenRefreshBuffer = TimeSpan.FromSeconds(60);

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly string _apiKey;
    private readonly string _apiSecret;
    private readonly string _baseUrl;
    private readonly HttpClient _httpClient;
    private readonly bool _ownsHttpClient;
    private readonly SemaphoreSlim _authLock = new(1, 1);

    private string? _accessToken;
    private DateTimeOffset? _tokenExpiresAt;
    private bool _disposed;

    /// <summary>Account management operations.</summary>
    public AccountsResource Accounts { get; }

    /// <summary>Organization-level operations.</summary>
    public OrganizationResource Organization { get; }

    /// <summary>Point of Sale operations (PoS, notifications, payment requests).</summary>
    public PointOfSaleResource PointOfSale { get; }

    /// <summary>NASPIP token operations (create and read/verify).</summary>
    public NaspipResource Naspip { get; }

    /// <summary>Refund operations.</summary>
    public RefundsResource Refunds { get; }

    /// <summary>Transaction listing and querying.</summary>
    public TransactionsResource Transactions { get; }

    /// <summary>
    /// Creates a new FluxisClient with a managed HttpClient.
    /// </summary>
    /// <param name="options">Client configuration options.</param>
    public FluxisClient(FluxisClientOptions options)
        : this(options, null)
    {
    }

    /// <summary>
    /// Creates a new FluxisClient with an externally managed HttpClient (for DI scenarios).
    /// </summary>
    /// <param name="options">Client configuration options.</param>
    /// <param name="httpClient">An existing HttpClient instance. The client will NOT dispose this.</param>
    public FluxisClient(FluxisClientOptions options, HttpClient? httpClient)
    {
        if (string.IsNullOrWhiteSpace(options.ApiKey))
            throw new ArgumentException("ApiKey is required.", nameof(options));
        if (string.IsNullOrWhiteSpace(options.ApiSecret))
            throw new ArgumentException("ApiSecret is required.", nameof(options));

        _apiKey = options.ApiKey;
        _apiSecret = options.ApiSecret;
        _baseUrl = InferBaseUrl(options.ApiKey);

        if (httpClient != null)
        {
            _httpClient = httpClient;
            _ownsHttpClient = false;
        }
        else
        {
            _httpClient = new HttpClient { Timeout = options.Timeout };
            _ownsHttpClient = true;
        }

        Accounts = new AccountsResource(this);
        Organization = new OrganizationResource(this);
        PointOfSale = new PointOfSaleResource(this);
        Naspip = new NaspipResource(this);
        Refunds = new RefundsResource(this);
        Transactions = new TransactionsResource(this);
    }

    private static string InferBaseUrl(string apiKey)
    {
        if (apiKey.StartsWith("fxs.stg.", StringComparison.Ordinal))
            return StagingBaseUrl;

        if (apiKey.StartsWith("fxs.prd.", StringComparison.Ordinal))
            return ProductionBaseUrl;

        throw new ArgumentException(
            "ApiKey must start with \"fxs.stg.\" or \"fxs.prd.\".",
            nameof(apiKey));
    }

    /// <summary>
    /// Sends an authenticated request to the Fluxis API.
    /// This method is intended for internal use by resource classes.
    /// </summary>
    internal async Task<T> RequestAsync<T>(
        HttpMethod method,
        string path,
        object? body = null,
        Dictionary<string, string>? query = null,
        CancellationToken cancellationToken = default)
    {
        return await ExecuteRequestAsync<T>(method, path, body, query, retryOn401: true, cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Sends an authenticated request that returns no body (e.g. DELETE).
    /// </summary>
    internal async Task RequestAsync(
        HttpMethod method,
        string path,
        object? body = null,
        Dictionary<string, string>? query = null,
        CancellationToken cancellationToken = default)
    {
        await ExecuteRequestAsync(method, path, body, query, retryOn401: true, cancellationToken)
            .ConfigureAwait(false);
    }

    private async Task<T> ExecuteRequestAsync<T>(
        HttpMethod method,
        string path,
        object? body,
        Dictionary<string, string>? query,
        bool retryOn401,
        CancellationToken cancellationToken)
    {
        await EnsureAuthenticatedAsync(cancellationToken).ConfigureAwait(false);

        var url = BuildUrl(path, query);

        using var request = new HttpRequestMessage(method, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _accessToken);
        request.Headers.Add("x-fluxis-api-key", _apiKey);

        if (body != null)
        {
            var json = JsonSerializer.Serialize(body, JsonOptions);
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");
        }

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.SendAsync(request, cancellationToken).ConfigureAwait(false);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            throw new FluxisException($"Request failed: {method} {path}", "NETWORK_ERROR", ex);
        }

        using (response)
        {
            var responseBody = await response.Content.ReadAsStringAsync(
#if NET6_0_OR_GREATER
                cancellationToken
#endif
            ).ConfigureAwait(false);

            if (!response.IsSuccessStatusCode)
            {
                if ((int)response.StatusCode == 401 && retryOn401)
                {
                    _accessToken = null;
                    _tokenExpiresAt = null;
                    return await ExecuteRequestAsync<T>(method, path, body, query, false, cancellationToken)
                        .ConfigureAwait(false);
                }

                ThrowOnError(responseBody, (int)response.StatusCode, method.Method, path);
            }

            if (string.IsNullOrEmpty(responseBody))
                return default(T)!;

            var apiResponse = JsonSerializer.Deserialize<ApiResponse<T>>(responseBody, JsonOptions);
            if (apiResponse?.Status == "error")
            {
                var errorResponse = JsonSerializer.Deserialize<ApiErrorResponse>(responseBody, JsonOptions);
                throw new FluxisException(
                    errorResponse?.Message ?? "Request failed",
                    errorResponse?.Code ?? "UNKNOWN_ERROR",
                    errorResponse?.Details,
                    (int)response.StatusCode,
                    method.Method,
                    path);
            }

            return apiResponse is not null ? apiResponse.Data! : default(T)!;
        }
    }

    private async Task ExecuteRequestAsync(
        HttpMethod method,
        string path,
        object? body,
        Dictionary<string, string>? query,
        bool retryOn401,
        CancellationToken cancellationToken)
    {
        await EnsureAuthenticatedAsync(cancellationToken).ConfigureAwait(false);

        var url = BuildUrl(path, query);

        using var request = new HttpRequestMessage(method, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _accessToken);
        request.Headers.Add("x-fluxis-api-key", _apiKey);

        if (body != null)
        {
            var json = JsonSerializer.Serialize(body, JsonOptions);
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");
        }

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.SendAsync(request, cancellationToken).ConfigureAwait(false);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            throw new FluxisException($"Request failed: {method} {path}", "NETWORK_ERROR", ex);
        }

        using (response)
        {
            if (!response.IsSuccessStatusCode)
            {
                if ((int)response.StatusCode == 401 && retryOn401)
                {
                    _accessToken = null;
                    _tokenExpiresAt = null;
                    await ExecuteRequestAsync(method, path, body, query, false, cancellationToken)
                        .ConfigureAwait(false);
                    return;
                }

                var responseBody = await response.Content.ReadAsStringAsync(
#if NET6_0_OR_GREATER
                    cancellationToken
#endif
                ).ConfigureAwait(false);
                ThrowOnError(responseBody, (int)response.StatusCode, method.Method, path);
            }
        }
    }

    private bool IsTokenExpired()
    {
        if (_accessToken == null || _tokenExpiresAt == null)
            return true;
        return DateTimeOffset.UtcNow >= _tokenExpiresAt.Value - TokenRefreshBuffer;
    }

    private async Task EnsureAuthenticatedAsync(CancellationToken cancellationToken)
    {
        if (!IsTokenExpired())
            return;

        await _authLock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            // Double-check after acquiring lock
            if (!IsTokenExpired())
                return;

            await AuthenticateAsync(cancellationToken).ConfigureAwait(false);
        }
        finally
        {
            _authLock.Release();
        }
    }

    private async Task AuthenticateAsync(CancellationToken cancellationToken)
    {
        var url = $"{_baseUrl}/auth/token";
        var authBody = new AuthTokenRequest
        {
            ApiKey = _apiKey,
            ApiSecret = _apiSecret,
        };

        var json = JsonSerializer.Serialize(authBody, JsonOptions);

        using var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json"),
        };

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.SendAsync(request, cancellationToken).ConfigureAwait(false);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            throw new FluxisException("Failed to connect to Fluxis API for authentication", "NETWORK_ERROR", ex);
        }

        using (response)
        {
            var responseBody = await response.Content.ReadAsStringAsync(
#if NET6_0_OR_GREATER
                cancellationToken
#endif
            ).ConfigureAwait(false);

            if (!response.IsSuccessStatusCode)
            {
                ApiErrorResponse? errorResponse = null;
                try
                {
                    errorResponse = JsonSerializer.Deserialize<ApiErrorResponse>(responseBody, JsonOptions);
                }
                catch (JsonException) { }

                throw new FluxisAuthException(
                    errorResponse?.Message ?? "Authentication failed",
                    errorResponse?.Code ?? "AUTH_ERROR",
                    errorResponse?.Details);
            }

            var authResponse = JsonSerializer.Deserialize<ApiResponse<AuthTokenResponse>>(responseBody, JsonOptions);
            if (authResponse?.Data == null)
                throw new FluxisAuthException("Invalid authentication response — no token received");

            _accessToken = authResponse.Data.Token;

            if (DateTimeOffset.TryParse(authResponse.Data.ExpiredAt, out var expiresAt))
                _tokenExpiresAt = expiresAt;
            else
                throw new FluxisAuthException("Invalid authentication response — could not parse expiration");
        }
    }

    private string BuildUrl(string path, Dictionary<string, string>? query)
    {
        var url = $"{_baseUrl}{path}";
        if (query != null && query.Count > 0)
        {
            var qs = string.Join("&", query
                .Where(kv => kv.Value != null)
                .Select(kv => $"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value)}"));
            if (!string.IsNullOrEmpty(qs))
                url += $"?{qs}";
        }
        return url;
    }

    private static void ThrowOnError(string responseBody, int statusCode, string method, string path)
    {
        ApiErrorResponse? errorResponse = null;
        try
        {
            errorResponse = JsonSerializer.Deserialize<ApiErrorResponse>(responseBody, JsonOptions);
        }
        catch (JsonException) { }

        throw new FluxisException(
            errorResponse?.Message ?? $"Request failed with status {statusCode}",
            errorResponse?.Code ?? "UNKNOWN_ERROR",
            errorResponse?.Details,
            statusCode,
            method,
            path);
    }

    /// <inheritdoc/>
    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;

        if (_ownsHttpClient)
            _httpClient.Dispose();

        _authLock.Dispose();
    }
}
