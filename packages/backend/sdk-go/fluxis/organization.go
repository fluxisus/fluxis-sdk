package fluxis

import "context"

// OrganizationService provides organization API methods.
type OrganizationService struct {
	client *Client
}

// Get returns the current organization.
func (s *OrganizationService) Get(ctx context.Context) (*Organization, error) {
	raw, _, err := s.client.doRequest(ctx, "GET", "/organization", nil, nil, true)
	if err != nil {
		return nil, err
	}
	org, err := decodeData[Organization](raw)
	if err != nil {
		return nil, err
	}
	return &org, nil
}

// GetSettlementAddresses returns organization settlement addresses.
func (s *OrganizationService) GetSettlementAddresses(ctx context.Context) ([]SettlementAddressResponse, error) {
	raw, _, err := s.client.doRequest(ctx, "GET", "/organization/settlement-addresses", nil, nil, true)
	if err != nil {
		return nil, err
	}
	return decodeData[[]SettlementAddressResponse](raw)
}

// SetSettlementAddress sets an organization settlement address.
func (s *OrganizationService) SetSettlementAddress(ctx context.Context, req *SettlementAddressRequest) (*SettlementAddressResponse, error) {
	raw, _, err := s.client.doRequest(ctx, "POST", "/organization/settlement-addresses", req, nil, true)
	if err != nil {
		return nil, err
	}
	resp, err := decodeData[SettlementAddressResponse](raw)
	if err != nil {
		return nil, err
	}
	return &resp, nil
}

// UpdateSettlementAddress updates an organization settlement address.
func (s *OrganizationService) UpdateSettlementAddress(ctx context.Context, req *SettlementAddressRequest) (*SettlementAddressResponse, error) {
	raw, _, err := s.client.doRequest(ctx, "PUT", "/organization/settlement-addresses", req, nil, true)
	if err != nil {
		return nil, err
	}
	resp, err := decodeData[SettlementAddressResponse](raw)
	if err != nil {
		return nil, err
	}
	return &resp, nil
}

// DeleteSettlementAddress deletes an organization settlement address.
func (s *OrganizationService) DeleteSettlementAddress(ctx context.Context, network string) error {
	query := buildQuery(map[string]string{"network": network})
	_, _, err := s.client.doRequest(ctx, "DELETE", "/organization/settlement-addresses", nil, query, true)
	return err
}
