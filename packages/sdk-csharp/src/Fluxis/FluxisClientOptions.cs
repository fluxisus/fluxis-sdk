using Fluxis.Models;

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
    /// Target environment. Defaults to <see cref="FluxisEnvironment.Staging"/>.
    /// Ignored if <see cref="BaseUrl"/> is set.
    /// </summary>
    public FluxisEnvironment Environment { get; set; } = FluxisEnvironment.Staging;

    /// <summary>
    /// Custom base URL (overrides <see cref="Environment"/>).
    /// Must include the version path (e.g. "https://api.stgfluxis.us/v1").
    /// </summary>
    public string? BaseUrl { get; set; }

    /// <summary>
    /// HTTP request timeout. Defaults to 30 seconds.
    /// </summary>
    public TimeSpan Timeout { get; set; } = TimeSpan.FromSeconds(30);
}
