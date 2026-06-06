namespace Fluxis.Errors;

/// <summary>
/// Exception thrown when authentication with the Fluxis API fails.
/// </summary>
public class FluxisAuthException : FluxisException
{
    /// <summary>
    /// Creates a new FluxisAuthException.
    /// </summary>
    public FluxisAuthException(
        string message,
        string errorCode = "AUTH_ERROR",
        string? details = null)
        : base(message, errorCode, details, 401)
    {
    }
}
