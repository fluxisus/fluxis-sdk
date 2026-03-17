namespace Fluxis.Errors;

/// <summary>
/// Base exception for all Fluxis API errors.
/// </summary>
public class FluxisException : Exception
{
    /// <summary>Machine-readable error code from the API (e.g. "AK0001").</summary>
    public string ErrorCode { get; }

    /// <summary>Additional error details from the API.</summary>
    public string? Details { get; }

    /// <summary>HTTP status code of the failed response.</summary>
    public int? StatusCode { get; }

    /// <summary>HTTP method of the failed request.</summary>
    public string? HttpMethod { get; }

    /// <summary>Request path of the failed request.</summary>
    public string? RequestPath { get; }

    /// <summary>
    /// Creates a new FluxisException.
    /// </summary>
    public FluxisException(
        string message,
        string errorCode,
        string? details = null,
        int? statusCode = null,
        string? httpMethod = null,
        string? requestPath = null)
        : base(FormatMessage(message, httpMethod, requestPath))
    {
        ErrorCode = errorCode;
        Details = details;
        StatusCode = statusCode;
        HttpMethod = httpMethod;
        RequestPath = requestPath;
    }

    /// <summary>
    /// Creates a new FluxisException with an inner exception.
    /// </summary>
    public FluxisException(
        string message,
        string errorCode,
        Exception innerException)
        : base(message, innerException)
    {
        ErrorCode = errorCode;
    }

    private static string FormatMessage(string message, string? method, string? path)
    {
        if (method != null && path != null)
            return $"{method} {path}: {message}";
        return message;
    }
}
