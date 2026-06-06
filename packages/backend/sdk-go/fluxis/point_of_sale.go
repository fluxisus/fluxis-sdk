package fluxis

import (
	"context"
	"fmt"
)

const (
	defaultPOSPage     = 1
	defaultPOSPageSize = 50
)

// PointOfSaleService provides point of sale API methods.
type PointOfSaleService struct {
	client *Client
}

// List returns a paginated list of point of sale endpoints.
func (s *PointOfSaleService) List(ctx context.Context, opts *ListPointOfSaleOptions) (*ListPointOfSaleResponse, error) {
	params := map[string]string{
		"page":      intQuery(0, defaultPOSPage),
		"page_size": intQuery(0, defaultPOSPageSize),
	}
	if opts != nil {
		params["page"] = intQuery(opts.Page, defaultPOSPage)
		params["page_size"] = intQuery(opts.PageSize, defaultPOSPageSize)
		if opts.AccountID != "" {
			params["accountID"] = opts.AccountID
		}
	}

	raw, _, err := s.client.doRequest(ctx, "GET", "/pos", nil, buildQuery(params), true)
	if err != nil {
		return nil, err
	}
	resp, err := decodeData[ListPointOfSaleResponse](raw)
	if err != nil {
		return nil, err
	}
	return &resp, nil
}

// Get returns a point of sale by ID.
func (s *PointOfSaleService) Get(ctx context.Context, posID string) (*PointOfSale, error) {
	raw, _, err := s.client.doRequest(ctx, "GET", posPath(posID), nil, nil, true)
	if err != nil {
		return nil, err
	}
	pos, err := decodeData[PointOfSale](raw)
	if err != nil {
		return nil, err
	}
	return &pos, nil
}

// Create creates a new point of sale.
func (s *PointOfSaleService) Create(ctx context.Context, req *CreatePointOfSaleRequest) (*PointOfSale, error) {
	raw, _, err := s.client.doRequest(ctx, "POST", "/pos", req, nil, true)
	if err != nil {
		return nil, err
	}
	pos, err := decodeData[PointOfSale](raw)
	if err != nil {
		return nil, err
	}
	return &pos, nil
}

// Update updates a point of sale.
func (s *PointOfSaleService) Update(ctx context.Context, posID string, req *UpdatePointOfSaleRequest) (*PointOfSale, error) {
	raw, _, err := s.client.doRequest(ctx, "PUT", posPath(posID), req, nil, true)
	if err != nil {
		return nil, err
	}
	pos, err := decodeData[PointOfSale](raw)
	if err != nil {
		return nil, err
	}
	return &pos, nil
}

// Delete deletes a point of sale.
func (s *PointOfSaleService) Delete(ctx context.Context, posID string) error {
	_, _, err := s.client.doRequest(ctx, "DELETE", posPath(posID), nil, nil, true)
	return err
}

// GetPaymentIntention returns the active payment intention for an open PoS.
func (s *PointOfSaleService) GetPaymentIntention(ctx context.Context, posID string) (*PaymentIntentionResponse, error) {
	raw, _, err := s.client.doRequest(ctx, "GET", posPath(posID)+"/payment-intention", nil, nil, true)
	if err != nil {
		return nil, err
	}
	intention, err := decodeData[PaymentIntentionResponse](raw)
	if err != nil {
		return nil, err
	}
	return &intention, nil
}

// CreatePaymentIntention creates a payment intention for an open PoS.
func (s *PointOfSaleService) CreatePaymentIntention(ctx context.Context, posID string, req *CreatePaymentIntentionRequest) (*CreatePaymentIntentionResponse, error) {
	raw, _, err := s.client.doRequest(ctx, "POST", posPath(posID)+"/payment-intention", req, nil, true)
	if err != nil {
		return nil, err
	}
	intention, err := decodeData[CreatePaymentIntentionResponse](raw)
	if err != nil {
		return nil, err
	}
	return &intention, nil
}

// ClosePaymentIntention closes the active payment intention.
func (s *PointOfSaleService) ClosePaymentIntention(ctx context.Context, posID string) error {
	_, _, err := s.client.doRequest(ctx, "POST", posPath(posID)+"/payment-intention/close", nil, nil, true)
	return err
}

// GetQR returns the QR code data for a PoS.
func (s *PointOfSaleService) GetQR(ctx context.Context, posID string) (*GetQRResponse, error) {
	raw, _, err := s.client.doRequest(ctx, "GET", posPath(posID)+"/qr", nil, nil, true)
	if err != nil {
		return nil, err
	}
	qr, err := decodeData[GetQRResponse](raw)
	if err != nil {
		return nil, err
	}
	return &qr, nil
}

// CreatePaymentRequest creates a crypto payment request and returns a NASPIP token.
func (s *PointOfSaleService) CreatePaymentRequest(ctx context.Context, posID string, req *CreatePaymentRequestRequest) (*PaymentRequestResponse, error) {
	raw, _, err := s.client.doRequest(ctx, "POST", posPath(posID)+"/payment-request", req, nil, true)
	if err != nil {
		return nil, err
	}
	payment, err := decodeData[PaymentRequestResponse](raw)
	if err != nil {
		return nil, err
	}
	return &payment, nil
}

// GetPaymentRequest returns a payment request by ID.
func (s *PointOfSaleService) GetPaymentRequest(ctx context.Context, posID, paymentRequestID string) (*PaymentRequestResponse, error) {
	raw, _, err := s.client.doRequest(ctx, "GET", posPath(posID)+"/payment-request/"+paymentRequestID, nil, nil, true)
	if err != nil {
		return nil, err
	}
	payment, err := decodeData[PaymentRequestResponse](raw)
	if err != nil {
		return nil, err
	}
	return &payment, nil
}

// CreatePaymentRequestCheckout creates a fiat checkout payment request.
func (s *PointOfSaleService) CreatePaymentRequestCheckout(ctx context.Context, posID string, req *CreatePaymentRequestCheckoutRequest) (*PaymentRequestCheckoutResponse, error) {
	raw, _, err := s.client.doRequest(ctx, "POST", posPath(posID)+"/payment-request-checkout", req, nil, true)
	if err != nil {
		return nil, err
	}
	payment, err := decodeData[PaymentRequestCheckoutResponse](raw)
	if err != nil {
		return nil, err
	}
	return &payment, nil
}

func posPath(posID string) string {
	return fmt.Sprintf("/pos/%s", posID)
}
