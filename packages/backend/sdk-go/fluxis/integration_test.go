package fluxis

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestIntegration(t *testing.T) {
	_ = LoadTestEnv()
	apiKey, apiSecret, ok := TestCredentials()
	if !ok {
		t.Skip("FLUXIS_API_KEY and FLUXIS_API_SECRET required for integration tests")
	}

	client, err := NewClient(
		WithAPIKey(apiKey),
		WithAPISecret(apiSecret),
	)
	require.NoError(t, err)

	ctx := context.Background()

	t.Run("Organization.Get", func(t *testing.T) {
		org, err := client.Organization.Get(ctx)
		require.NoError(t, err)
		assert.NotEmpty(t, org.ID)
		assert.NotEmpty(t, org.Name)
	})

	t.Run("Accounts.List", func(t *testing.T) {
		accounts, err := client.Accounts.List(ctx)
		require.NoError(t, err)
		assert.NotNil(t, accounts)
	})

	t.Run("PointOfSale.List", func(t *testing.T) {
		resp, err := client.PointOfSale.List(ctx, &ListPointOfSaleOptions{Page: 1, PageSize: 10})
		require.NoError(t, err)
		assert.GreaterOrEqual(t, resp.Page, 1)
	})

	t.Run("Transactions.List", func(t *testing.T) {
		resp, err := client.Transactions.List(ctx, &ListTransactionsOptions{Page: 1, PageSize: 10})
		require.NoError(t, err)
		assert.GreaterOrEqual(t, resp.Page, 1)
	})

	t.Run("Naspip.IsValidTokenFormat", func(t *testing.T) {
		assert.True(t, IsValidTokenFormat("v4.local.placeholder"))
	})

	t.Run("Naspip.Read_InvalidToken", func(t *testing.T) {
		_, err := client.Naspip.Read(ctx, "v4.local.invalid-token-for-integration-test")
		require.Error(t, err)
		var apiErr *FluxisError
		assert.True(t, errors.As(err, &apiErr))
	})

	t.Run("Accounts.CreateAndDelete", func(t *testing.T) {
		name := "sdk-go-test-" + time.Now().Format("150405")
		account, err := client.Accounts.Create(ctx, &CreateAccountRequest{Name: name})
		require.NoError(t, err)
		require.NotEmpty(t, account.ID)
		assert.Equal(t, name, account.Name)
		require.NoError(t, client.Accounts.Delete(ctx, account.ID))
	})
}
