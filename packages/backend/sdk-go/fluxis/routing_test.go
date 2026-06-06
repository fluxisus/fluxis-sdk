package fluxis

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type recordedRequest struct {
	method string
	path   string
	query  url.Values
	body   string
}

type routingTestEnv struct {
	server   *httptest.Server
	requests []recordedRequest
	client   *Client
}

func newRoutingTestEnv(t *testing.T) *routingTestEnv {
	t.Helper()

	env := &routingTestEnv{}
	env.server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		env.requests = append(env.requests, recordedRequest{
			method: r.Method,
			path:   r.URL.Path,
			query:  r.URL.Query(),
			body:   string(body),
		})

		w.Header().Set("Content-Type", "application/json")
		switch {
		case r.URL.Path == "/auth/token":
			expiresAt := time.Now().Add(time.Hour).UTC().Format(time.RFC3339)
			_ = json.NewEncoder(w).Encode(map[string]any{
				"status": "success",
				"data": map[string]string{
					"token":      "v4.local.test-token",
					"expired_at": expiresAt,
				},
			})
		case r.Method == http.MethodDelete:
			w.WriteHeader(http.StatusNoContent)
		default:
			_ = json.NewEncoder(w).Encode(map[string]any{
				"status": "success",
				"data":   routingSuccessData(r.Method, r.URL.Path),
			})
		}
	}))

	client, err := NewClient(
		WithAPIKey("fxs.stg.test-key"),
		WithAPISecret("test-secret"),
		WithBaseURL(env.server.URL),
	)
	require.NoError(t, err)
	env.client = client
	return env
}

func routingSuccessData(method, path string) any {
	switch {
	case strings.HasSuffix(path, "/webhook/list"):
		return []map[string]any{}
	case strings.Contains(path, "/webhook/logs"), path == "/pos", path == "/transactions":
		return map[string]any{
			"data":        []map[string]string{},
			"page":        1,
			"page_size":   50,
			"total":       0,
			"total_pages": 0,
		}
	case path == "/account" && method == http.MethodGet:
		return []map[string]string{{"id": "acc-1", "name": "Test"}}
	case strings.HasSuffix(path, "/settlement-addresses") && method == http.MethodGet:
		if strings.Contains(path, "/account/") {
			return map[string]any{"addresses": []map[string]string{}}
		}
		return []map[string]string{{"address": "0x1", "network": "polygon"}}
	case strings.Contains(path, "/settlement-addresses"):
		return map[string]string{"address": "0x1", "network": "polygon"}
	case path == "/organization":
		return map[string]string{
			"id":          "org-1",
			"name":        "Test Org",
			"country":     "US",
			"owner_email": "owner@example.com",
		}
	case strings.HasSuffix(path, "/naspip/create"):
		return map[string]string{"token": "v4.local.created"}
	case strings.Contains(path, "/webhook"):
		return map[string]any{
			"id":         "wh-1",
			"url":        "https://example.com/hook",
			"event_type": "payment_request",
			"enabled":    true,
		}
	default:
		return map[string]string{"id": "resource-1", "name": "Test"}
	}
}

func (env *routingTestEnv) lastAPIRequest() recordedRequest {
	for i := len(env.requests) - 1; i >= 0; i-- {
		if env.requests[i].path != "/auth/token" {
			return env.requests[i]
		}
	}
	return recordedRequest{}
}

func TestAccountsResourceRouting(t *testing.T) {
	ctx := context.Background()
	env := newRoutingTestEnv(t)
	defer env.server.Close()

	_, err := env.client.Accounts.List(ctx)
	require.NoError(t, err)
	assert.Equal(t, http.MethodGet, env.lastAPIRequest().method)
	assert.Equal(t, "/account", env.lastAPIRequest().path)

	_, err = env.client.Accounts.Get(ctx, "acc-1")
	require.NoError(t, err)
	assert.Equal(t, "/account/acc-1", env.lastAPIRequest().path)

	_, err = env.client.Accounts.Create(ctx, &CreateAccountRequest{Name: "Test"})
	require.NoError(t, err)
	req := env.lastAPIRequest()
	assert.Equal(t, http.MethodPost, req.method)
	assert.Equal(t, "/account", req.path)
	assert.Contains(t, req.body, `"name":"Test"`)

	_, err = env.client.Accounts.Update(ctx, "acc-1", &UpdateAccountRequest{Name: "Updated"})
	require.NoError(t, err)
	req = env.lastAPIRequest()
	assert.Equal(t, http.MethodPut, req.method)
	assert.Equal(t, "/account/acc-1", req.path)

	err = env.client.Accounts.Delete(ctx, "acc-1")
	require.NoError(t, err)
	assert.Equal(t, http.MethodDelete, env.lastAPIRequest().method)

	_, err = env.client.Accounts.GetSettlementAddresses(ctx, "acc-1")
	require.NoError(t, err)
	assert.Equal(t, "/account/acc-1/settlement-addresses", env.lastAPIRequest().path)

	_, err = env.client.Accounts.SetSettlementAddress(ctx, "acc-1", &SettlementAddressRequest{
		Address: "0x1",
		Network: "polygon",
	})
	require.NoError(t, err)
	req = env.lastAPIRequest()
	assert.Equal(t, http.MethodPost, req.method)
	assert.Contains(t, req.body, `"network":"polygon"`)

	_, err = env.client.Accounts.UpdateSettlementAddress(ctx, "acc-1", &SettlementAddressRequest{
		Address: "0x2",
		Network: "ethereum",
	})
	require.NoError(t, err)
	assert.Equal(t, http.MethodPut, env.lastAPIRequest().method)

	err = env.client.Accounts.DeleteSettlementAddress(ctx, "acc-1", "polygon")
	require.NoError(t, err)
	req = env.lastAPIRequest()
	assert.Equal(t, "polygon", req.query.Get("network"))
}

func TestOrganizationResourceRouting(t *testing.T) {
	ctx := context.Background()
	env := newRoutingTestEnv(t)
	defer env.server.Close()

	_, err := env.client.Organization.Get(ctx)
	require.NoError(t, err)
	assert.Equal(t, "/organization", env.lastAPIRequest().path)

	_, err = env.client.Organization.SetSettlementAddress(ctx, &SettlementAddressRequest{
		Address: "0x1",
		Network: "polygon",
	})
	require.NoError(t, err)
	assert.Equal(t, "/organization/settlement-addresses", env.lastAPIRequest().path)
	assert.Equal(t, http.MethodPost, env.lastAPIRequest().method)

	_, err = env.client.Organization.UpdateSettlementAddress(ctx, &SettlementAddressRequest{
		Address: "0x2",
		Network: "ethereum",
	})
	require.NoError(t, err)
	assert.Equal(t, http.MethodPut, env.lastAPIRequest().method)

	_, err = env.client.Organization.GetSettlementAddresses(ctx)
	require.NoError(t, err)
	assert.Equal(t, http.MethodGet, env.lastAPIRequest().method)

	err = env.client.Organization.DeleteSettlementAddress(ctx, "polygon")
	require.NoError(t, err)
	assert.Equal(t, "polygon", env.lastAPIRequest().query.Get("network"))
}

func TestPointOfSaleResourceRouting(t *testing.T) {
	ctx := context.Background()
	env := newRoutingTestEnv(t)
	defer env.server.Close()

	_, err := env.client.PointOfSale.List(ctx, nil)
	require.NoError(t, err)
	req := env.lastAPIRequest()
	assert.Equal(t, "/pos", req.path)
	assert.Equal(t, "1", req.query.Get("page"))
	assert.Equal(t, "50", req.query.Get("page_size"))

	_, err = env.client.PointOfSale.List(ctx, &ListPointOfSaleOptions{
		Page:      2,
		PageSize:  25,
		AccountID: "acc-1",
	})
	require.NoError(t, err)
	req = env.lastAPIRequest()
	assert.Equal(t, "2", req.query.Get("page"))
	assert.Equal(t, "25", req.query.Get("page_size"))
	assert.Equal(t, "acc-1", req.query.Get("accountID"))

	_, err = env.client.PointOfSale.Get(ctx, "pos-1")
	require.NoError(t, err)
	assert.Equal(t, "/pos/pos-1", env.lastAPIRequest().path)

	_, err = env.client.PointOfSale.Create(ctx, &CreatePointOfSaleRequest{
		Name:              "Store",
		Type:              PointOfSaleTypeOnlineFixed,
		ReferenceCurrency: "USD",
	})
	require.NoError(t, err)
	assert.Equal(t, http.MethodPost, env.lastAPIRequest().method)

	_, err = env.client.PointOfSale.Update(ctx, "pos-1", &UpdatePointOfSaleRequest{Name: "Updated"})
	require.NoError(t, err)
	assert.Equal(t, http.MethodPut, env.lastAPIRequest().method)

	err = env.client.PointOfSale.Delete(ctx, "pos-1")
	require.NoError(t, err)
	assert.Equal(t, http.MethodDelete, env.lastAPIRequest().method)

	_, err = env.client.PointOfSale.GetPaymentIntention(ctx, "pos-1")
	require.NoError(t, err)
	assert.Equal(t, "/pos/pos-1/payment-intention", env.lastAPIRequest().path)

	_, err = env.client.PointOfSale.CreatePaymentIntention(ctx, "pos-1", &CreatePaymentIntentionRequest{
		Amount:   25,
		CoinCode: "USD",
	})
	require.NoError(t, err)
	assert.Equal(t, http.MethodPost, env.lastAPIRequest().method)

	err = env.client.PointOfSale.ClosePaymentIntention(ctx, "pos-1")
	require.NoError(t, err)
	assert.Equal(t, "/pos/pos-1/payment-intention/close", env.lastAPIRequest().path)

	_, err = env.client.PointOfSale.GetQR(ctx, "pos-1")
	require.NoError(t, err)
	assert.Equal(t, "/pos/pos-1/qr", env.lastAPIRequest().path)

	_, err = env.client.PointOfSale.CreatePaymentRequest(ctx, "pos-1", &CreatePaymentRequestRequest{
		Amount:        "10.00",
		UniqueAssetID: "npolygon_t0xabc",
	})
	require.NoError(t, err)
	assert.Equal(t, "/pos/pos-1/payment-request", env.lastAPIRequest().path)

	_, err = env.client.PointOfSale.GetPaymentRequest(ctx, "pos-1", "pr-1")
	require.NoError(t, err)
	assert.Equal(t, "/pos/pos-1/payment-request/pr-1", env.lastAPIRequest().path)

	_, err = env.client.PointOfSale.CreatePaymentRequestCheckout(ctx, "pos-1", &CreatePaymentRequestCheckoutRequest{
		Amount:   49.99,
		CoinCode: "USD",
	})
	require.NoError(t, err)
	assert.Equal(t, "/pos/pos-1/payment-request-checkout", env.lastAPIRequest().path)
}

func TestNaspipResourceRouting(t *testing.T) {
	ctx := context.Background()
	env := newRoutingTestEnv(t)
	defer env.server.Close()

	_, err := env.client.Naspip.Create(ctx, &CreateNaspipRequest{
		Payment: NaspipPaymentData{
			Address:       "0x1",
			Amount:        10,
			UniqueAssetID: "asset",
		},
	})
	require.NoError(t, err)
	assert.Equal(t, "/naspip/create", env.lastAPIRequest().path)

	_, err = env.client.Naspip.Read(ctx, "v4.local.test")
	require.NoError(t, err)
	req := env.lastAPIRequest()
	assert.Equal(t, "/naspip/read", req.path)
	assert.Contains(t, req.body, `"token":"v4.local.test"`)
}

func TestWebhooksResourceRouting(t *testing.T) {
	ctx := context.Background()
	env := newRoutingTestEnv(t)
	defer env.server.Close()

	_, err := env.client.Webhooks.Create(ctx, "acc-1", &WebhookCreateRequest{
		URL:       "https://example.com/hook",
		EventType: WebhookEventTypePaymentRequest,
	})
	require.NoError(t, err)
	assert.Equal(t, "/account/acc-1/webhook", env.lastAPIRequest().path)

	_, err = env.client.Webhooks.List(ctx, "acc-1")
	require.NoError(t, err)
	assert.Equal(t, "/account/acc-1/webhook/list", env.lastAPIRequest().path)

	_, err = env.client.Webhooks.Logs(ctx, "acc-1", &ListWebhookLogsOptions{Page: 1, PageSize: 20})
	require.NoError(t, err)
	req := env.lastAPIRequest()
	assert.Equal(t, "/account/acc-1/webhook/logs", req.path)
	assert.Equal(t, "1", req.query.Get("page"))
	assert.Equal(t, "20", req.query.Get("page_size"))

	_, err = env.client.Webhooks.Activate(ctx, "acc-1", "wh-1")
	require.NoError(t, err)
	assert.Equal(t, "/account/acc-1/webhook/wh-1/activate", env.lastAPIRequest().path)

	_, err = env.client.Webhooks.Deactivate(ctx, "acc-1", "wh-1")
	require.NoError(t, err)
	assert.Equal(t, "/account/acc-1/webhook/wh-1/deactivate", env.lastAPIRequest().path)

	err = env.client.Webhooks.Delete(ctx, "acc-1", "wh-1")
	require.NoError(t, err)
	assert.Equal(t, http.MethodDelete, env.lastAPIRequest().method)
	assert.Equal(t, "/account/acc-1/webhook/wh-1/delete", env.lastAPIRequest().path)

	err = env.client.Webhooks.Test(ctx, "acc-1", "wh-1")
	require.NoError(t, err)
	assert.Equal(t, "/account/acc-1/webhook/wh-1/test", env.lastAPIRequest().path)

	_, err = env.client.Webhooks.UpdateURL(ctx, "acc-1", "wh-1", &WebhookUpdateURLRequest{
		URL: "https://example.com/hook-v2",
	})
	require.NoError(t, err)
	assert.Equal(t, "/account/acc-1/webhook/wh-1/url", env.lastAPIRequest().path)
}

func TestTransactionsResourceRouting(t *testing.T) {
	ctx := context.Background()
	env := newRoutingTestEnv(t)
	defer env.server.Close()

	_, err := env.client.Transactions.List(ctx, nil)
	require.NoError(t, err)
	req := env.lastAPIRequest()
	assert.Equal(t, "/transactions", req.path)
	assert.Equal(t, "1", req.query.Get("page"))
	assert.Equal(t, "50", req.query.Get("page_size"))

	_, err = env.client.Transactions.List(ctx, &ListTransactionsOptions{
		Page:      2,
		PageSize:  10,
		AccountID: "acc-1",
		Status:    TransactionStatusCompleted,
		Sort:      "created_at",
		Order:     "desc",
	})
	require.NoError(t, err)
	req = env.lastAPIRequest()
	assert.Equal(t, "acc-1", req.query.Get("accountID"))
	assert.Equal(t, "2", req.query.Get("page"))
	assert.Equal(t, "10", req.query.Get("page_size"))
	assert.Equal(t, "completed", req.query.Get("status"))
	assert.Equal(t, "created_at", req.query.Get("sort"))
	assert.Equal(t, "desc", req.query.Get("order"))
}
