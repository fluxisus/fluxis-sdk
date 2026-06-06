package fluxis

import "time"

const (
	defaultTimeout = 30 * time.Second

	stagingBaseURL    = "https://api.stgfluxis.us/v1"
	productionBaseURL = "https://api.fluxis.us/v1"
)

// Option configures a Client.
type Option func(*Client)

// WithAPIKey sets the Fluxis API key (fxs.stg.* or fxs.prd.*).
func WithAPIKey(key string) Option {
	return func(c *Client) {
		c.apiKey = key
	}
}

// WithAPISecret sets the Fluxis API secret.
func WithAPISecret(secret string) Option {
	return func(c *Client) {
		c.apiSecret = secret
	}
}

// WithTimeout sets the HTTP request timeout.
func WithTimeout(timeout time.Duration) Option {
	return func(c *Client) {
		c.timeout = timeout
	}
}

// WithBaseURL overrides the API base URL inferred from the API key.
func WithBaseURL(baseURL string) Option {
	return func(c *Client) {
		c.baseURL = baseURL
	}
}

func inferBaseURL(apiKey string) (string, error) {
	switch {
	case len(apiKey) >= 8 && apiKey[:8] == "fxs.stg.":
		return stagingBaseURL, nil
	case len(apiKey) >= 8 && apiKey[:8] == "fxs.prd.":
		return productionBaseURL, nil
	default:
		return "", fmtInvalidAPIKey()
	}
}

func fmtInvalidAPIKey() error {
	return &FluxisError{
		Message: "Invalid Fluxis API key format. Expected a key starting with \"fxs.stg.\" or \"fxs.prd.\".",
		Code:    "INVALID_API_KEY",
	}
}
