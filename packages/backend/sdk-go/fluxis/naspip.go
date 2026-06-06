package fluxis

import (
	"context"
	"strings"
)

// NaspipService provides NASPIP token API methods.
type NaspipService struct {
	client *Client
}

// Create creates a NASPIP token from raw payment data.
func (s *NaspipService) Create(ctx context.Context, req *CreateNaspipRequest) (*CreateNaspipResponse, error) {
	raw, _, err := s.client.doRequest(ctx, "POST", "/naspip/create", req, nil, true)
	if err != nil {
		return nil, err
	}
	resp, err := decodeData[CreateNaspipResponse](raw)
	if err != nil {
		return nil, err
	}
	return &resp, nil
}

// Read verifies and decodes a NASPIP token.
func (s *NaspipService) Read(ctx context.Context, token string) (*ReadNaspipResponse, error) {
	raw, _, err := s.client.doRequest(ctx, "POST", "/naspip/read", &ReadNaspipRequest{Token: token}, nil, true)
	if err != nil {
		return nil, err
	}
	resp, err := decodeData[ReadNaspipResponse](raw)
	if err != nil {
		return nil, err
	}
	return &resp, nil
}

// IsValidTokenFormat checks whether a string looks like a valid NASPIP token (PASETO v4 format).
func IsValidTokenFormat(token string) bool {
	return strings.HasPrefix(token, "v4.local.")
}
