package fluxis

import "context"

const (
	defaultTransactionPage     = 1
	defaultTransactionPageSize = 50
)

// TransactionsService provides transaction API methods.
type TransactionsService struct {
	client *Client
}

// List returns a paginated list of transactions.
func (s *TransactionsService) List(ctx context.Context, opts *ListTransactionsOptions) (*TransactionListResponse, error) {
	params := map[string]string{
		"page":      intQuery(0, defaultTransactionPage),
		"page_size": intQuery(0, defaultTransactionPageSize),
	}

	if opts != nil {
		params["page"] = intQuery(opts.Page, defaultTransactionPage)
		params["page_size"] = intQuery(opts.PageSize, defaultTransactionPageSize)
		if opts.Status != "" {
			params["status"] = string(opts.Status)
		}
		if opts.Sort != "" {
			params["sort"] = opts.Sort
		}
		if opts.Order != "" {
			params["order"] = opts.Order
		}
		if opts.AccountID != "" {
			params["accountID"] = opts.AccountID
		}
	}

	raw, _, err := s.client.doRequest(ctx, "GET", "/transactions", nil, buildQuery(params), true)
	if err != nil {
		return nil, err
	}
	resp, err := decodeData[TransactionListResponse](raw)
	if err != nil {
		return nil, err
	}
	return &resp, nil
}
