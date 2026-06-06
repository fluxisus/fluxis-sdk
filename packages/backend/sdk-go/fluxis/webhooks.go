package fluxis

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"time"
)

const webhookMaxAgeSeconds = 10

// WebhooksService provides webhook API methods.
type WebhooksService struct {
	client *Client
}

// Create creates a webhook for an account.
func (s *WebhooksService) Create(ctx context.Context, accountID string, req *WebhookCreateRequest) (*Webhook, error) {
	raw, _, err := s.client.doRequest(ctx, "POST", webhookBasePath(accountID), req, nil, true)
	if err != nil {
		return nil, err
	}
	webhook, err := decodeData[Webhook](raw)
	if err != nil {
		return nil, err
	}
	return &webhook, nil
}

// List returns all webhooks for an account.
func (s *WebhooksService) List(ctx context.Context, accountID string) ([]Webhook, error) {
	raw, _, err := s.client.doRequest(ctx, "GET", webhookBasePath(accountID)+"/list", nil, nil, true)
	if err != nil {
		return nil, err
	}
	return decodeData[[]Webhook](raw)
}

// Logs returns paginated webhook delivery logs for an account.
func (s *WebhooksService) Logs(ctx context.Context, accountID string, opts *ListWebhookLogsOptions) (*ListWebhookLogsResponse, error) {
	params := map[string]string{}
	if opts != nil {
		if opts.Page > 0 {
			params["page"] = strconv.Itoa(opts.Page)
		}
		if opts.PageSize > 0 {
			params["page_size"] = strconv.Itoa(opts.PageSize)
		}
	}

	raw, _, err := s.client.doRequest(ctx, "GET", webhookBasePath(accountID)+"/logs", nil, buildQuery(params), true)
	if err != nil {
		return nil, err
	}
	resp, err := decodeData[ListWebhookLogsResponse](raw)
	if err != nil {
		return nil, err
	}
	return &resp, nil
}

// Activate activates a webhook.
func (s *WebhooksService) Activate(ctx context.Context, accountID, webhookID string) (*Webhook, error) {
	raw, _, err := s.client.doRequest(ctx, "PATCH", webhookPath(accountID, webhookID)+"/activate", nil, nil, true)
	if err != nil {
		return nil, err
	}
	webhook, err := decodeData[Webhook](raw)
	if err != nil {
		return nil, err
	}
	return &webhook, nil
}

// Deactivate deactivates a webhook.
func (s *WebhooksService) Deactivate(ctx context.Context, accountID, webhookID string) (*Webhook, error) {
	raw, _, err := s.client.doRequest(ctx, "PATCH", webhookPath(accountID, webhookID)+"/deactivate", nil, nil, true)
	if err != nil {
		return nil, err
	}
	webhook, err := decodeData[Webhook](raw)
	if err != nil {
		return nil, err
	}
	return &webhook, nil
}

// Delete deletes a webhook.
func (s *WebhooksService) Delete(ctx context.Context, accountID, webhookID string) error {
	_, _, err := s.client.doRequest(ctx, "DELETE", webhookPath(accountID, webhookID)+"/delete", nil, nil, true)
	return err
}

// Test sends a test event to a webhook.
func (s *WebhooksService) Test(ctx context.Context, accountID, webhookID string) error {
	_, _, err := s.client.doRequest(ctx, "POST", webhookPath(accountID, webhookID)+"/test", nil, nil, true)
	return err
}

// UpdateURL updates a webhook URL.
func (s *WebhooksService) UpdateURL(ctx context.Context, accountID, webhookID string, req *WebhookUpdateURLRequest) (*Webhook, error) {
	raw, _, err := s.client.doRequest(ctx, "PUT", webhookPath(accountID, webhookID)+"/url", req, nil, true)
	if err != nil {
		return nil, err
	}
	webhook, err := decodeData[Webhook](raw)
	if err != nil {
		return nil, err
	}
	return &webhook, nil
}

// VerifyWebhookSignature verifies a Fluxis webhook signature.
//
// Fluxis signs webhook payloads using HMAC-SHA256 over
// "<timestamp>.<canonical_json>", where canonical JSON is the payload
// with all object keys sorted recursively.
func VerifyWebhookSignature(payload any, signature, timestamp, secret string) bool {
	requestTimestamp, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil {
		return false
	}

	now := time.Now().Unix()
	if now-requestTimestamp > webhookMaxAgeSeconds {
		return false
	}

	canonical, err := canonicalJSON(payload)
	if err != nil {
		return false
	}

	signedString := fmt.Sprintf("%s.%s", timestamp, canonical)
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(signedString))
	expected := mac.Sum(nil)

	provided, err := hex.DecodeString(signature)
	if err != nil {
		return false
	}

	if len(provided) != len(expected) {
		return false
	}

	return subtle.ConstantTimeCompare(provided, expected) == 1
}

func canonicalJSON(value any) (string, error) {
	sorted := sortKeys(value)
	data, err := json.Marshal(sorted)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func sortKeys(value any) any {
	switch v := value.(type) {
	case map[string]any:
		keys := make([]string, 0, len(v))
		for key := range v {
			keys = append(keys, key)
		}
		sort.Strings(keys)

		out := make(map[string]any, len(v))
		for _, key := range keys {
			out[key] = sortKeys(v[key])
		}
		return out
	case []any:
		out := make([]any, len(v))
		for i, item := range v {
			out[i] = sortKeys(item)
		}
		return out
	default:
		return value
	}
}

func webhookBasePath(accountID string) string {
	return fmt.Sprintf("/account/%s/webhook", accountID)
}

func webhookPath(accountID, webhookID string) string {
	return fmt.Sprintf("/account/%s/webhook/%s", accountID, webhookID)
}
