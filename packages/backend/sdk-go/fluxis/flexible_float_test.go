package fluxis

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFlexibleFloat_UnmarshalJSON(t *testing.T) {
	t.Run("number", func(t *testing.T) {
		var value FlexibleFloat
		require.NoError(t, json.Unmarshal([]byte(`100.5`), &value))
		assert.InDelta(t, 100.5, value.Float64(), 0.0001)
	})

	t.Run("string", func(t *testing.T) {
		var value FlexibleFloat
		require.NoError(t, json.Unmarshal([]byte(`"100.5"`), &value))
		assert.InDelta(t, 100.5, value.Float64(), 0.0001)
	})

	t.Run("null", func(t *testing.T) {
		var value FlexibleFloat
		require.NoError(t, json.Unmarshal([]byte(`null`), &value))
		assert.Equal(t, 0.0, value.Float64())
	})
}

func TestTransaction_UnmarshalFlexibleAmounts(t *testing.T) {
	raw := `{
		"id": "tx-1",
		"type": "deposit",
		"status": "completed",
		"gross_amount": "123.45",
		"net_amount": "120.00",
		"expected_amount": 123.45
	}`

	var tx Transaction
	require.NoError(t, json.Unmarshal([]byte(raw), &tx))
	assert.Equal(t, "tx-1", tx.ID)
	assert.InDelta(t, 123.45, tx.GrossAmount.Float64(), 0.0001)
	assert.InDelta(t, 120.0, tx.NetAmount.Float64(), 0.0001)
	assert.InDelta(t, 123.45, tx.ExpectedAmount.Float64(), 0.0001)
}
