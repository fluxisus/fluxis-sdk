package fluxis

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestInferBaseURL(t *testing.T) {
	t.Run("staging key", func(t *testing.T) {
		url, err := InferBaseURL("fxs.stg.test-key")
		require.NoError(t, err)
		assert.Equal(t, stagingBaseURL, url)
	})

	t.Run("production key", func(t *testing.T) {
		url, err := InferBaseURL("fxs.prd.test-key")
		require.NoError(t, err)
		assert.Equal(t, productionBaseURL, url)
	})

	t.Run("invalid key", func(t *testing.T) {
		_, err := InferBaseURL("invalid-key")
		require.Error(t, err)

		var fluxisErr *FluxisError
		assert.True(t, errors.As(err, &fluxisErr))
		assert.Contains(t, fluxisErr.Message, "Invalid Fluxis API key format")
	})
}

func TestNewClientInvalidAPIKey(t *testing.T) {
	_, err := NewClient(
		WithAPIKey("invalid-key"),
		WithAPISecret("secret"),
	)
	require.Error(t, err)
}

func TestClientAuthenticationAndRetry(t *testing.T) {
	authCount := 0
	apiCount := 0

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/auth/token":
			authCount++
			expiresAt := time.Now().Add(time.Hour).UTC().Format(time.RFC3339)
			_ = json.NewEncoder(w).Encode(map[string]any{
				"status": "success",
				"data": map[string]string{
					"token":      "v4.local.test-token",
					"expired_at": expiresAt,
				},
			})
		case r.URL.Path == "/account":
			apiCount++
			if apiCount == 1 {
				w.WriteHeader(http.StatusUnauthorized)
				_ = json.NewEncoder(w).Encode(map[string]any{
					"status":  "error",
					"code":    "AUTH_EXPIRED",
					"message": "Token expired",
				})
				return
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"status": "success",
				"data":   []map[string]string{{"id": "acc-1", "name": "Test"}},
			})
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	client, err := NewClient(
		WithAPIKey("fxs.stg.test-key"),
		WithAPISecret("test-secret"),
		WithBaseURL(server.URL),
		WithTimeout(5*time.Second),
	)
	require.NoError(t, err)

	accounts, err := client.Accounts.List(context.Background())
	require.NoError(t, err)
	require.Len(t, accounts, 1)
	assert.Equal(t, "acc-1", accounts[0].ID)
	assert.Equal(t, 2, authCount)
	assert.Equal(t, 2, apiCount)
}

func TestClientTokenCaching(t *testing.T) {
	authCount := 0

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/auth/token" {
			authCount++
			expiresAt := time.Now().Add(time.Hour).UTC().Format(time.RFC3339)
			_ = json.NewEncoder(w).Encode(map[string]any{
				"status": "success",
				"data": map[string]string{
					"token":      "v4.local.test-token",
					"expired_at": expiresAt,
				},
			})
			return
		}

		_ = json.NewEncoder(w).Encode(map[string]any{
			"status": "success",
			"data":   []map[string]string{},
		})
	}))
	defer server.Close()

	client, err := NewClient(
		WithAPIKey("fxs.stg.test-key"),
		WithAPISecret("test-secret"),
		WithBaseURL(server.URL),
	)
	require.NoError(t, err)

	_, err = client.Accounts.List(context.Background())
	require.NoError(t, err)
	_, err = client.Accounts.List(context.Background())
	require.NoError(t, err)

	assert.Equal(t, 1, authCount)
}

func TestClientResponseParseError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/auth/token" {
			expiresAt := time.Now().Add(time.Hour).UTC().Format(time.RFC3339)
			_ = json.NewEncoder(w).Encode(map[string]any{
				"status": "success",
				"data": map[string]string{
					"token":      "v4.local.test-token",
					"expired_at": expiresAt,
				},
			})
			return
		}

		w.WriteHeader(http.StatusBadGateway)
		_, _ = w.Write([]byte("<html>502 Bad Gateway</html>"))
	}))
	defer server.Close()

	client, err := NewClient(
		WithAPIKey("fxs.stg.test-key"),
		WithAPISecret("test-secret"),
		WithBaseURL(server.URL),
	)
	require.NoError(t, err)

	_, err = client.Accounts.List(context.Background())
	require.Error(t, err)

	var parseErr *FluxisResponseParseError
	assert.True(t, errors.As(err, &parseErr))
	assert.Contains(t, parseErr.RawBody, "502 Bad Gateway")
}

func TestClientAPIErrorDetails(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/auth/token" {
			expiresAt := time.Now().Add(time.Hour).UTC().Format(time.RFC3339)
			_ = json.NewEncoder(w).Encode(map[string]any{
				"status": "success",
				"data": map[string]string{
					"token":      "v4.local.test-token",
					"expired_at": expiresAt,
				},
			})
			return
		}

		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"status":  "error",
			"code":    "VAL001",
			"message": "Invalid amount",
			"details": "Amount must be positive",
		})
	}))
	defer server.Close()

	client, err := NewClient(
		WithAPIKey("fxs.stg.test-key"),
		WithAPISecret("test-secret"),
		WithBaseURL(server.URL),
	)
	require.NoError(t, err)

	_, err = client.PointOfSale.CreatePaymentRequest(context.Background(), "pos-1", &CreatePaymentRequestRequest{
		Amount:        "-1",
		UniqueAssetID: "npolygon_t0xabc",
	})
	require.Error(t, err)

	var apiErr *FluxisError
	require.True(t, errors.As(err, &apiErr))
	assert.Equal(t, "VAL001", apiErr.Code)
	assert.Equal(t, "Amount must be positive", apiErr.Details)
	assert.Equal(t, http.StatusBadRequest, apiErr.StatusCode)
	assert.True(t, strings.Contains(apiErr.Error(), "POST /pos/pos-1/payment-request"))
}
