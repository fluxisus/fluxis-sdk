package fluxis

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestIsValidTokenFormat(t *testing.T) {
	assert.True(t, IsValidTokenFormat("v4.local.abc123xyz"))
	assert.True(t, IsValidTokenFormat("v4.local.Gx1TZT3STnhzZ-0o"))

	assert.False(t, IsValidTokenFormat("v3.local.abc"))
	assert.False(t, IsValidTokenFormat("not-a-token"))
	assert.False(t, IsValidTokenFormat(""))
}
