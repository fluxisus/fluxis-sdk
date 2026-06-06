package fluxis

import "context"

// AccountsService provides account API methods.
type AccountsService struct {
	client *Client
}

// List returns all accounts.
func (s *AccountsService) List(ctx context.Context) ([]Account, error) {
	raw, _, err := s.client.doRequest(ctx, "GET", "/account", nil, nil, true)
	if err != nil {
		return nil, err
	}
	return decodeData[[]Account](raw)
}

// Get returns an account by ID.
func (s *AccountsService) Get(ctx context.Context, accountID string) (*Account, error) {
	raw, _, err := s.client.doRequest(ctx, "GET", "/account/"+accountID, nil, nil, true)
	if err != nil {
		return nil, err
	}
	account, err := decodeData[Account](raw)
	if err != nil {
		return nil, err
	}
	return &account, nil
}

// Create creates a new account.
func (s *AccountsService) Create(ctx context.Context, req *CreateAccountRequest) (*Account, error) {
	raw, _, err := s.client.doRequest(ctx, "POST", "/account", req, nil, true)
	if err != nil {
		return nil, err
	}
	account, err := decodeData[Account](raw)
	if err != nil {
		return nil, err
	}
	return &account, nil
}

// Update updates an account.
func (s *AccountsService) Update(ctx context.Context, accountID string, req *UpdateAccountRequest) (*Account, error) {
	raw, _, err := s.client.doRequest(ctx, "PUT", "/account/"+accountID, req, nil, true)
	if err != nil {
		return nil, err
	}
	account, err := decodeData[Account](raw)
	if err != nil {
		return nil, err
	}
	return &account, nil
}

// Delete deletes an account.
func (s *AccountsService) Delete(ctx context.Context, accountID string) error {
	_, _, err := s.client.doRequest(ctx, "DELETE", "/account/"+accountID, nil, nil, true)
	return err
}

// GetSettlementAddresses returns settlement addresses for an account.
func (s *AccountsService) GetSettlementAddresses(ctx context.Context, accountID string) (*AccountSettlementAddresses, error) {
	raw, _, err := s.client.doRequest(ctx, "GET", "/account/"+accountID+"/settlement-addresses", nil, nil, true)
	if err != nil {
		return nil, err
	}
	addresses, err := decodeData[AccountSettlementAddresses](raw)
	if err != nil {
		return nil, err
	}
	return &addresses, nil
}

// SetSettlementAddress sets a settlement address for an account.
func (s *AccountsService) SetSettlementAddress(ctx context.Context, accountID string, req *SettlementAddressRequest) (*SettlementAddressResponse, error) {
	raw, _, err := s.client.doRequest(ctx, "POST", "/account/"+accountID+"/settlement-addresses", req, nil, true)
	if err != nil {
		return nil, err
	}
	resp, err := decodeData[SettlementAddressResponse](raw)
	if err != nil {
		return nil, err
	}
	return &resp, nil
}

// UpdateSettlementAddress updates a settlement address for an account.
func (s *AccountsService) UpdateSettlementAddress(ctx context.Context, accountID string, req *SettlementAddressRequest) (*SettlementAddressResponse, error) {
	raw, _, err := s.client.doRequest(ctx, "PUT", "/account/"+accountID+"/settlement-addresses", req, nil, true)
	if err != nil {
		return nil, err
	}
	resp, err := decodeData[SettlementAddressResponse](raw)
	if err != nil {
		return nil, err
	}
	return &resp, nil
}

// DeleteSettlementAddress deletes a settlement address for an account.
func (s *AccountsService) DeleteSettlementAddress(ctx context.Context, accountID, network string) error {
	query := buildQuery(map[string]string{"network": network})
	_, _, err := s.client.doRequest(ctx, "DELETE", "/account/"+accountID+"/settlement-addresses", nil, query, true)
	return err
}
