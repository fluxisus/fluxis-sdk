namespace Fluxis;

/// <summary>
/// Configuration options for <see cref="FluxisClient"/>.
/// </summary>
public sealed class FluxisClientOptions
{
    /// <summary>
    /// Your Fluxis API key (e.g. "fxs.stg.{uuid}").
    /// </summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>
    /// Your Fluxis API secret. This value is never exposed after initialization.
    /// </summary>
    public string ApiSecret { get; set; } = string.Empty;

    /// <summary>
    /// HTTP request timeout. Defaults to 30 seconds.
    /// </summary>
    public TimeSpan Timeout { get; set; } = TimeSpan.FromSeconds(30);
}
