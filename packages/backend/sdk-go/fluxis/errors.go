package fluxis

import "fmt"

// FluxisError represents an API error response from Fluxis.
type FluxisError struct {
	Code       string
	Details    string
	StatusCode int
	Method     string
	Path       string
	Message    string
}

func (e *FluxisError) Error() string {
	if e.Method != "" && e.Path != "" {
		return fmt.Sprintf("%s %s: %s", e.Method, e.Path, e.Message)
	}
	return e.Message
}

// FluxisAuthError represents an authentication failure.
type FluxisAuthError struct {
	FluxisError
}

func newFluxisAuthError(message, code, details string) *FluxisAuthError {
	return &FluxisAuthError{
		FluxisError: FluxisError{
			Message:    message,
			Code:       code,
			Details:    details,
			StatusCode: 401,
		},
	}
}

// FluxisNetworkError represents a network-level failure.
type FluxisNetworkError struct {
	FluxisError
	Cause error
}

func newFluxisNetworkError(message string, cause error) *FluxisNetworkError {
	details := ""
	if cause != nil {
		details = cause.Error()
	}
	return &FluxisNetworkError{
		FluxisError: FluxisError{
			Message: message,
			Code:    "NETWORK_ERROR",
			Details: details,
		},
		Cause: cause,
	}
}

// FluxisResponseParseError represents a non-JSON or malformed API response.
type FluxisResponseParseError struct {
	FluxisError
	RawBody string
}

func newFluxisResponseParseError(message, rawBody string, statusCode int, method, path string) *FluxisResponseParseError {
	return &FluxisResponseParseError{
		FluxisError: FluxisError{
			Message:    message,
			Code:       "RESPONSE_PARSE_ERROR",
			Details:    rawBody,
			StatusCode: statusCode,
			Method:     method,
			Path:       path,
		},
		RawBody: rawBody,
	}
}
