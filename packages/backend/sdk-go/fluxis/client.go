package fluxis

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

const tokenRefreshBuffer = 60 * time.Second

// Client is the Fluxis API client.
type Client struct {
	apiKey    string
	apiSecret string
	baseURL   string
	timeout   time.Duration
	http      *http.Client

	accessToken    string
	tokenExpiresAt time.Time

	authMu          sync.Mutex
	authenticating  bool
	authDone        chan struct{}

	Accounts     AccountsService
	Organization OrganizationService
	PointOfSale  PointOfSaleService
	Naspip       NaspipService
	Transactions TransactionsService
	Webhooks     WebhooksService
}

// NewClient creates a Fluxis API client with the given options.
func NewClient(opts ...Option) (*Client, error) {
	c := &Client{
		timeout: defaultTimeout,
		http:    &http.Client{},
	}

	for _, opt := range opts {
		opt(c)
	}

	if c.baseURL == "" {
		if c.apiKey == "" {
			return nil, fmtInvalidAPIKey()
		}
		baseURL, err := inferBaseURL(c.apiKey)
		if err != nil {
			return nil, err
		}
		c.baseURL = baseURL
	}

	c.http.Timeout = c.timeout

	c.Accounts = AccountsService{client: c}
	c.Organization = OrganizationService{client: c}
	c.PointOfSale = PointOfSaleService{client: c}
	c.Naspip = NaspipService{client: c}
	c.Transactions = TransactionsService{client: c}
	c.Webhooks = WebhooksService{client: c}

	return c, nil
}

// BaseURL returns the configured API base URL.
func (c *Client) BaseURL() string {
	return c.baseURL
}

func (c *Client) isTokenExpired() bool {
	if c.accessToken == "" || c.tokenExpiresAt.IsZero() {
		return true
	}
	return time.Now().Add(tokenRefreshBuffer).After(c.tokenExpiresAt)
}

func (c *Client) authenticate(ctx context.Context) error {
	body, err := json.Marshal(map[string]string{
		"api_key":    c.apiKey,
		"api_secret": c.apiSecret,
	})
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/auth/token", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return newFluxisNetworkError("Failed to connect to Fluxis API for authentication", err)
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return newFluxisNetworkError("Failed to read authentication response", err)
	}

	if resp.StatusCode != http.StatusOK {
		var errEnv apiErrorEnvelope
		if json.Unmarshal(raw, &errEnv) == nil && errEnv.Status == ResponseStatusError {
			return newFluxisAuthError(errEnv.Message, errEnv.Code, errEnv.Details)
		}
		return newFluxisAuthError("Authentication failed", "AUTH_ERROR", string(raw))
	}

	var envelope apiResponse[authTokenResponse]
	if err := json.Unmarshal(raw, &envelope); err != nil {
		return newFluxisResponseParseError("Response is not valid JSON", string(raw), resp.StatusCode, http.MethodPost, "/auth/token")
	}

	if envelope.Status == ResponseStatusError {
		return newFluxisAuthError("Authentication failed", "AUTH_ERROR", "")
	}

	expiresAt, err := time.Parse(time.RFC3339, envelope.Data.ExpiredAt)
	if err != nil {
		expiresAt, err = time.Parse(time.RFC3339Nano, envelope.Data.ExpiredAt)
		if err != nil {
			return newFluxisResponseParseError("Invalid expired_at in auth response", envelope.Data.ExpiredAt, resp.StatusCode, http.MethodPost, "/auth/token")
		}
	}

	c.authMu.Lock()
	c.accessToken = envelope.Data.Token
	c.tokenExpiresAt = expiresAt
	c.authMu.Unlock()

	return nil
}

func (c *Client) ensureAuthenticated(ctx context.Context) error {
	for {
		c.authMu.Lock()
		if !c.isTokenExpired() {
			c.authMu.Unlock()
			return nil
		}

		if c.authenticating {
			done := c.authDone
			c.authMu.Unlock()
			select {
			case <-done:
				continue
			case <-ctx.Done():
				return ctx.Err()
			}
		}

		c.authenticating = true
		c.authDone = make(chan struct{})
		c.authMu.Unlock()

		err := c.authenticate(ctx)

		c.authMu.Lock()
		c.authenticating = false
		close(c.authDone)
		c.authMu.Unlock()

		return err
	}
}

func (c *Client) invalidateToken() {
	c.authMu.Lock()
	c.accessToken = ""
	c.tokenExpiresAt = time.Time{}
	c.authMu.Unlock()
}

func (c *Client) doRequest(ctx context.Context, method, path string, body any, query url.Values, retryOn401 bool) ([]byte, int, error) {
	if err := c.ensureAuthenticated(ctx); err != nil {
		return nil, 0, err
	}

	reqURL := c.baseURL + path
	if len(query) > 0 {
		reqURL += "?" + query.Encode()
	}

	var bodyReader io.Reader
	if body != nil {
		encoded, err := json.Marshal(body)
		if err != nil {
			return nil, 0, err
		}
		bodyReader = bytes.NewReader(encoded)
	}

	c.authMu.Lock()
	token := c.accessToken
	c.authMu.Unlock()

	req, err := http.NewRequestWithContext(ctx, method, reqURL, bodyReader)
	if err != nil {
		return nil, 0, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("x-fluxis-api-key", c.apiKey)

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, 0, newFluxisNetworkError(fmt.Sprintf("Request failed: %s %s", method, path), err)
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp.StatusCode, newFluxisNetworkError(fmt.Sprintf("Failed to read response: %s %s", method, path), err)
	}

	if resp.StatusCode == http.StatusUnauthorized && retryOn401 {
		c.invalidateToken()
		if err := c.ensureAuthenticated(ctx); err != nil {
			return nil, resp.StatusCode, err
		}
		return c.doRequest(ctx, method, path, body, query, false)
	}

	if resp.StatusCode == http.StatusNoContent || len(raw) == 0 {
		if resp.StatusCode >= 400 {
			return nil, resp.StatusCode, &FluxisError{
				Message:    fmt.Sprintf("Request failed with status %d", resp.StatusCode),
				Code:       "UNKNOWN_ERROR",
				StatusCode: resp.StatusCode,
				Method:     method,
				Path:       path,
			}
		}
		return nil, resp.StatusCode, nil
	}

	var probe struct {
		Status ResponseStatus `json:"status"`
	}
	if err := json.Unmarshal(raw, &probe); err != nil {
		return nil, resp.StatusCode, newFluxisResponseParseError("Response is not valid JSON", string(raw), resp.StatusCode, method, path)
	}

	if probe.Status == ResponseStatusError || resp.StatusCode >= 400 {
		var errEnv apiErrorEnvelope
		if err := json.Unmarshal(raw, &errEnv); err != nil {
			return nil, resp.StatusCode, newFluxisResponseParseError("Response is not valid JSON", string(raw), resp.StatusCode, method, path)
		}
		return nil, resp.StatusCode, &FluxisError{
			Message:    errEnv.Message,
			Code:       errEnv.Code,
			Details:    errEnv.Details,
			StatusCode: resp.StatusCode,
			Method:     method,
			Path:       path,
		}
	}

	return raw, resp.StatusCode, nil
}

func decodeData[T any](raw []byte) (T, error) {
	var zero T
	if len(raw) == 0 {
		return zero, nil
	}

	var envelope apiResponse[T]
	if err := json.Unmarshal(raw, &envelope); err != nil {
		return zero, err
	}
	return envelope.Data, nil
}

func buildQuery(params map[string]string) url.Values {
	q := url.Values{}
	for key, value := range params {
		if value != "" {
			q.Set(key, value)
		}
	}
	return q
}

func intQuery(value, defaultValue int) string {
	if value <= 0 {
		return fmt.Sprintf("%d", defaultValue)
	}
	return fmt.Sprintf("%d", value)
}

// InferBaseURL returns the API base URL for a given API key prefix.
func InferBaseURL(apiKey string) (string, error) {
	return inferBaseURL(apiKey)
}

// IsValidAPIKeyPrefix reports whether the API key has a recognized Fluxis prefix.
func IsValidAPIKeyPrefix(apiKey string) bool {
	return strings.HasPrefix(apiKey, "fxs.stg.") || strings.HasPrefix(apiKey, "fxs.prd.")
}
