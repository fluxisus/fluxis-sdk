package fluxis

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"sort"
	"strconv"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func computeWebhookSignature(payload any, timestamp, secret string) string {
	sorted := sortKeys(payload)
	canonical, _ := json.Marshal(sorted)
	signedString := timestamp + "." + string(canonical)
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(signedString))
	return hex.EncodeToString(mac.Sum(nil))
}

func currentTimestamp() string {
	return strconv.FormatInt(time.Now().Unix(), 10)
}

func TestVerifyWebhookSignature(t *testing.T) {
	secret := "webhook-test-secret-123"

	t.Run("valid signature", func(t *testing.T) {
		payload := map[string]any{"id": "pay-1", "status": "completed"}
		ts := currentTimestamp()
		signature := computeWebhookSignature(payload, ts, secret)
		assert.True(t, VerifyWebhookSignature(payload, signature, ts, secret))
	})

	t.Run("different key order", func(t *testing.T) {
		payload := map[string]any{"status": "completed", "id": "pay-1"}
		ts := currentTimestamp()
		signature := computeWebhookSignature(map[string]any{"id": "pay-1", "status": "completed"}, ts, secret)
		assert.True(t, VerifyWebhookSignature(payload, signature, ts, secret))
	})

	t.Run("tampered payload", func(t *testing.T) {
		payload := map[string]any{"id": "pay-1", "status": "completed"}
		ts := currentTimestamp()
		signature := computeWebhookSignature(payload, ts, secret)
		assert.False(t, VerifyWebhookSignature(map[string]any{"id": "pay-1", "status": "failed"}, signature, ts, secret))
	})

	t.Run("wrong secret", func(t *testing.T) {
		payload := map[string]any{"id": "pay-1", "status": "completed"}
		ts := currentTimestamp()
		signature := computeWebhookSignature(payload, ts, "wrong-secret")
		assert.False(t, VerifyWebhookSignature(payload, signature, ts, secret))
	})

	t.Run("expired timestamp", func(t *testing.T) {
		payload := map[string]any{"id": "pay-1", "status": "completed"}
		ts := strconv.FormatInt(time.Now().Unix()-11, 10)
		signature := computeWebhookSignature(payload, ts, secret)
		assert.False(t, VerifyWebhookSignature(payload, signature, ts, secret))
	})

	t.Run("invalid timestamp", func(t *testing.T) {
		payload := map[string]any{"id": "pay-1", "status": "completed"}
		signature := computeWebhookSignature(payload, currentTimestamp(), secret)
		assert.False(t, VerifyWebhookSignature(payload, signature, "not-a-timestamp", secret))
	})

	t.Run("mismatched signature length", func(t *testing.T) {
		payload := map[string]any{"id": "pay-1"}
		assert.False(t, VerifyWebhookSignature(payload, "abc", currentTimestamp(), secret))
	})

	t.Run("empty signature", func(t *testing.T) {
		payload := map[string]any{"id": "pay-1"}
		assert.False(t, VerifyWebhookSignature(payload, "", currentTimestamp(), secret))
	})

	t.Run("nested sorted keys", func(t *testing.T) {
		payload := map[string]any{
			"event": "payment.completed",
			"data": map[string]any{
				"z": 1,
				"a": map[string]any{"y": 2, "b": 3},
			},
		}
		ts := currentTimestamp()
		signature := computeWebhookSignature(payload, ts, secret)
		assert.True(t, VerifyWebhookSignature(payload, signature, ts, secret))
	})
}

func TestSortKeys(t *testing.T) {
	input := map[string]any{"b": 2, "a": 1}
	sorted := sortKeys(input).(map[string]any)
	keys := make([]string, 0, len(sorted))
	for key := range sorted {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	assert.Equal(t, []string{"a", "b"}, keys)
}
