package fluxis

// ResponseStatus is the API envelope status field.
type ResponseStatus string

const (
	ResponseStatusSuccess ResponseStatus = "success"
	ResponseStatusError   ResponseStatus = "error"
)

// PaymentRequestStatus represents payment request lifecycle states.
type PaymentRequestStatus string

const (
	PaymentRequestStatusCreated    PaymentRequestStatus = "created"
	PaymentRequestStatusPending    PaymentRequestStatus = "pending"
	PaymentRequestStatusProcessing PaymentRequestStatus = "processing"
	PaymentRequestStatusConfirmed  PaymentRequestStatus = "confirmed"
	PaymentRequestStatusExpired    PaymentRequestStatus = "expired"
	PaymentRequestStatusCompleted  PaymentRequestStatus = "completed"
	PaymentRequestStatusOverpaid   PaymentRequestStatus = "overpaid"
	PaymentRequestStatusUnderpaid  PaymentRequestStatus = "underpaid"
	PaymentRequestStatusFailed     PaymentRequestStatus = "failed"
)

// TransactionType represents transaction categories.
type TransactionType string

const (
	TransactionTypeDeposit     TransactionType = "deposit"
	TransactionTypeWithdraw    TransactionType = "withdraw"
	TransactionTypeRefund      TransactionType = "refund"
	TransactionTypeAdjustment  TransactionType = "adjustment"
	TransactionTypeSwap        TransactionType = "swap"
	TransactionTypePaymentIn   TransactionType = "payment_in"
	TransactionTypePaymentOut  TransactionType = "payment_out"
	TransactionTypeDryRun      TransactionType = "dry_run"
)

// TransactionStatus represents transaction lifecycle states.
type TransactionStatus string

const (
	TransactionStatusPreview    TransactionStatus = "preview"
	TransactionStatusPending    TransactionStatus = "pending"
	TransactionStatusCreated    TransactionStatus = "created"
	TransactionStatusProcessing TransactionStatus = "processing"
	TransactionStatusError      TransactionStatus = "error"
	TransactionStatusExpired    TransactionStatus = "expired"
	TransactionStatusFailed     TransactionStatus = "failed"
	TransactionStatusCompleted  TransactionStatus = "completed"
)

// EntityType represents owner entity types for settlement addresses.
type EntityType string

const (
	EntityTypeOrganization       EntityType = "organization"
	EntityTypeAccount            EntityType = "account"
	EntityTypeFinancialProvider  EntityType = "financial_provider"
	EntityTypePointOfSale        EntityType = "point_of_sale"
)

// PointOfSaleType represents point of sale modes.
type PointOfSaleType string

const (
	PointOfSaleTypeCashierFixed PointOfSaleType = "cashier_fixed"
	PointOfSaleTypeOnlineFixed  PointOfSaleType = "online_fixed"
	PointOfSaleTypeCashierOpen  PointOfSaleType = "cashier_open"
)

// PaymentRequestType represents payment request modes.
type PaymentRequestType string

const (
	PaymentRequestTypeFixed     PaymentRequestType = "fixed"
	PaymentRequestTypeDynamic   PaymentRequestType = "dynamic"
	PaymentRequestTypePreLoaded PaymentRequestType = "pre_loaded"
	PaymentRequestTypeOpen      PaymentRequestType = "open"
)

// WebhookEventType represents webhook subscription event types.
type WebhookEventType string

const (
	WebhookEventTypePaymentRequest    WebhookEventType = "payment_request"
	WebhookEventTypeIncomingTransfer  WebhookEventType = "incoming_transfer"
	WebhookEventTypeRefund            WebhookEventType = "refund"
)

// TransactionDetailType represents settlement detail categories.
type TransactionDetailType string

const (
	TransactionDetailTypeBase                  TransactionDetailType = "base"
	TransactionDetailTypeFee                   TransactionDetailType = "fee"
	TransactionDetailTypeTax                   TransactionDetailType = "tax"
	TransactionDetailTypeOther                 TransactionDetailType = "other"
	TransactionDetailTypePaymentNetAmount      TransactionDetailType = "payment_net_amount"
	TransactionDetailTypePaymentServiceFee     TransactionDetailType = "payment_service_fee"
	TransactionDetailTypePaymentDeveloperFee   TransactionDetailType = "payment_developer_fee"
	TransactionDetailTypePaymentRevenueSharedFee TransactionDetailType = "payment_revenue_shared_fee"
)

type apiResponse[T any] struct {
	Status ResponseStatus `json:"status"`
	Data   T              `json:"data"`
}

type apiErrorEnvelope struct {
	Status  ResponseStatus `json:"status"`
	Code    string         `json:"code"`
	Message string         `json:"message"`
	Details string         `json:"details,omitempty"`
}

type authTokenResponse struct {
	Token     string `json:"token"`
	ExpiredAt string `json:"expired_at"`
}

// Paginated is a generic paginated list wrapper.
type Paginated[T any] struct {
	Data       []T `json:"data"`
	Page       int `json:"page"`
	PageSize   int `json:"page_size"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

// Merchant holds merchant display metadata.
type Merchant struct {
	Name        string `json:"name,omitempty"`
	Description string `json:"description,omitempty"`
}

// OrderItem is a line item in an order.
type OrderItem struct {
	Description string `json:"description,omitempty"`
	Quantity    int    `json:"quantity,omitempty"`
	UnitPrice   string `json:"unit_price,omitempty"`
	Amount      string `json:"amount,omitempty"`
	CoinCode    string `json:"coin_code,omitempty"`
}

// Order holds checkout order details.
type Order struct {
	Total       string       `json:"total,omitempty"`
	CoinCode    string       `json:"coin_code,omitempty"`
	Description string       `json:"description,omitempty"`
	Merchant    *Merchant    `json:"merchant,omitempty"`
	Items       []OrderItem  `json:"items,omitempty"`
}

// SettlementAddress is a settlement address entry.
type SettlementAddress struct {
	SettlementAddress string                `json:"settlement_address,omitempty"`
	AddressTag        string                `json:"address_tag,omitempty"`
	AddressType       string                `json:"address_type,omitempty"`
	Owner             EntityType            `json:"owner,omitempty"`
	SettlementType    TransactionDetailType `json:"settlement_type,omitempty"`
}

// --- Accounts ---

// CreateAccountRequest is the body for creating an account.
type CreateAccountRequest struct {
	Name       string `json:"name"`
	ExternalID string `json:"external_id,omitempty"`
}

// UpdateAccountRequest is the body for updating an account.
type UpdateAccountRequest struct {
	Name       string `json:"name,omitempty"`
	ExternalID string `json:"external_id,omitempty"`
}

// Account is an account entity.
type Account struct {
	ID         string `json:"id,omitempty"`
	Name       string `json:"name"`
	ExternalID string `json:"external_id,omitempty"`
	CreatedAt  string `json:"created_at,omitempty"`
	UpdatedAt  string `json:"updated_at,omitempty"`
	DeletedAt  string `json:"deleted_at,omitempty"`
}

// AccountSettlementAddresses wraps account settlement addresses.
type AccountSettlementAddresses struct {
	Addresses []SettlementAddress `json:"addresses"`
}

// SettlementAddressRequest is the body for setting/updating a settlement address.
type SettlementAddressRequest struct {
	Address    string `json:"address"`
	Network    string `json:"network"`
	AddressTag string `json:"address_tag,omitempty"`
}

// SettlementAddressResponse is a settlement address returned by the API.
type SettlementAddressResponse struct {
	Address    string `json:"address"`
	Network    string `json:"network"`
	AddressTag string `json:"address_tag,omitempty"`
}

// --- Organization ---

// Organization is the top-level organization entity.
type Organization struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Country    string `json:"country"`
	OwnerEmail string `json:"owner_email"`
	TaxID      string `json:"tax_id,omitempty"`
	CreatedAt  string `json:"created_at,omitempty"`
	UpdatedAt  string `json:"updated_at,omitempty"`
}

// --- Point of Sale ---

// CreatePointOfSaleRequest is the body for creating a PoS.
type CreatePointOfSaleRequest struct {
	Name              string          `json:"name"`
	ReferenceCurrency string          `json:"reference_currency"`
	Type              PointOfSaleType `json:"type"`
	AccountID         string          `json:"account_id,omitempty"`
	Merchant          *Merchant       `json:"merchant,omitempty"`
	PaymentOptions    []string        `json:"payment_options,omitempty"`
}

// UpdatePointOfSaleRequest is the body for updating a PoS.
type UpdatePointOfSaleRequest struct {
	ReferenceCurrency string    `json:"reference_currency"`
	Name              string    `json:"name,omitempty"`
	Merchant          *Merchant `json:"merchant,omitempty"`
	PaymentOptions    []string  `json:"payment_options,omitempty"`
}

// PointOfSaleConfig holds PoS configuration.
type PointOfSaleConfig struct {
	ReferenceCurrency string    `json:"reference_currency,omitempty"`
	Merchant          *Merchant `json:"merchant,omitempty"`
	PaymentOptions    []string  `json:"payment_options,omitempty"`
}

// PointOfSale is a point of sale entity.
type PointOfSale struct {
	ID               string             `json:"id"`
	Name             string             `json:"name"`
	Type             PointOfSaleType    `json:"type,omitempty"`
	OrganizationID   string             `json:"organization_id,omitempty"`
	OrganizationName string             `json:"organization_name,omitempty"`
	AccountID        string             `json:"account_id,omitempty"`
	AccountName      string             `json:"account_name,omitempty"`
	Config           *PointOfSaleConfig `json:"config,omitempty"`
	CreatedAt        string             `json:"created_at,omitempty"`
	UpdatedAt        string             `json:"updated_at,omitempty"`
}

// ListPointOfSaleOptions are query params for listing PoS.
type ListPointOfSaleOptions struct {
	Page      int
	PageSize  int
	AccountID string
}

// ListPointOfSaleResponse is a paginated PoS list.
type ListPointOfSaleResponse = Paginated[PointOfSale]

// CreatePaymentRequestRequest is the body for creating a crypto payment request.
type CreatePaymentRequestRequest struct {
	Amount        string `json:"amount"`
	UniqueAssetID string `json:"unique_asset_id"`
	ReferenceID   string `json:"reference_id,omitempty"`
	Order         *Order `json:"order,omitempty"`
}

// CreatePaymentRequestCheckoutRequest is the body for creating a fiat checkout payment.
type CreatePaymentRequestCheckoutRequest struct {
	Amount      float64 `json:"amount"`
	CoinCode    string  `json:"coin_code"`
	ReferenceID string  `json:"reference_id,omitempty"`
	Order       *Order  `json:"order,omitempty"`
}

// PaymentRequestResponse is a payment request result.
type PaymentRequestResponse struct {
	ID          string               `json:"id"`
	Status      PaymentRequestStatus `json:"status"`
	Token       string               `json:"token"`
	ReferenceID string               `json:"reference_id,omitempty"`
	Expiration  int64                `json:"expiration,omitempty"`
}

// PaymentRequestCheckoutResponse includes a hosted checkout URL.
type PaymentRequestCheckoutResponse struct {
	PaymentRequestResponse
	CheckoutURL string `json:"checkout_url,omitempty"`
}

// --- Payment Intention ---

// PaymentIntention is an open-amount payment intention.
type PaymentIntention struct {
	ID         string  `json:"id"`
	Amount     float64 `json:"amount"`
	CoinCode   string  `json:"coin_code"`
	ExternalID string  `json:"external_id,omitempty"`
	Status     string  `json:"status,omitempty"`
	CreatedAt  string  `json:"created_at,omitempty"`
	UpdatedAt  string  `json:"updated_at,omitempty"`
}

// CreatePaymentIntentionRequest is the body for creating a payment intention.
type CreatePaymentIntentionRequest struct {
	Amount     float64 `json:"amount"`
	CoinCode   string  `json:"coin_code"`
	ExternalID string  `json:"external_id,omitempty"`
}

// CreatePaymentIntentionResponse is returned when creating a payment intention.
type CreatePaymentIntentionResponse = PaymentIntention

// PaymentIntentionResponse is returned when fetching a payment intention.
type PaymentIntentionResponse = PaymentIntention

// GetQRResponse holds QR code data for a PoS.
type GetQRResponse struct {
	QRURL string `json:"qr_url,omitempty"`
	Token string `json:"token,omitempty"`
}

// --- NASPIP ---

// NaspipPaymentData is raw payment data for NASPIP token creation.
type NaspipPaymentData struct {
	ID            string  `json:"id,omitempty"`
	Address       string  `json:"address"`
	Amount        float64 `json:"amount"`
	UniqueAssetID string  `json:"unique_asset_id"`
	ExpiresAt     int64   `json:"expires_at,omitempty"`
	IsOpen        bool    `json:"is_open,omitempty"`
}

// CreateNaspipRequest is the body for /naspip/create.
type CreateNaspipRequest struct {
	Payment NaspipPaymentData `json:"payment"`
}

// CreateNaspipResponse is returned from /naspip/create.
type CreateNaspipResponse struct {
	Token string `json:"token"`
}

// ReadNaspipRequest is the body for /naspip/read.
type ReadNaspipRequest struct {
	Token string `json:"token"`
}

// NaspipPaymentInfo is decoded payment data from a NASPIP token.
type NaspipPaymentInfo struct {
	ID            string  `json:"id,omitempty"`
	Address       string  `json:"address,omitempty"`
	Amount        float64 `json:"amount,omitempty"`
	UniqueAssetID string  `json:"unique_asset_id,omitempty"`
	ExpiresAt     int64   `json:"expires_at,omitempty"`
	IsOpen        bool    `json:"is_open,omitempty"`
}

// NaspipOrderInfo is decoded order data from a NASPIP token.
type NaspipOrderInfo struct {
	Total       string      `json:"total,omitempty"`
	CoinCode    string      `json:"coin_code,omitempty"`
	Description string      `json:"description,omitempty"`
	Merchant    *Merchant   `json:"merchant,omitempty"`
	Items       []OrderItem `json:"items,omitempty"`
}

// ReadNaspipResponse is returned from /naspip/read.
type ReadNaspipResponse struct {
	Payment         *NaspipPaymentInfo `json:"payment,omitempty"`
	Order           *NaspipOrderInfo   `json:"order,omitempty"`
	PaymentOptions  []string           `json:"payment_options,omitempty"`
	URL             string             `json:"url,omitempty"`
}

// --- Transactions ---

// ListTransactionsOptions are query params for listing transactions.
type ListTransactionsOptions struct {
	Page      int
	PageSize  int
	Status    TransactionStatus
	Sort      string
	Order     string
	AccountID string
}

// Transaction is a ledger transaction.
type Transaction struct {
	ID                  string            `json:"id"`
	Type                TransactionType   `json:"type"`
	Status              TransactionStatus `json:"status"`
	Currency            string            `json:"currency,omitempty"`
	Network             string            `json:"network,omitempty"`
	UniqueAssetID       string            `json:"unique_asset_id,omitempty"`
	GrossAmount         FlexibleFloat     `json:"gross_amount,omitempty"`
	NetAmount           FlexibleFloat     `json:"net_amount,omitempty"`
	ExpectedAmount      FlexibleFloat     `json:"expected_amount,omitempty"`
	From                string            `json:"from,omitempty"`
	FromType            string            `json:"from_type,omitempty"`
	To                  string            `json:"to,omitempty"`
	ToType              string            `json:"to_type,omitempty"`
	TransactionHash     string            `json:"transaction_hash,omitempty"`
	FinancialProvider   string            `json:"financial_provider,omitempty"`
	AccountExternalID   string            `json:"account_external_id,omitempty"`
	CreatedAt           string            `json:"created_at,omitempty"`
	UpdatedAt           string            `json:"updated_at,omitempty"`
}

// TransactionListResponse is a paginated transaction list.
type TransactionListResponse = Paginated[Transaction]

// --- Webhooks ---

// WebhookCreateRequest is the body for creating a webhook.
type WebhookCreateRequest struct {
	URL         string           `json:"url"`
	EventType   WebhookEventType `json:"event_type"`
	Description string           `json:"description,omitempty"`
}

// WebhookUpdateURLRequest is the body for updating a webhook URL.
type WebhookUpdateURLRequest struct {
	URL string `json:"url"`
}

// Webhook is a webhook subscription.
type Webhook struct {
	ID          string           `json:"id"`
	AccountID   string           `json:"account_id,omitempty"`
	URL         string           `json:"url"`
	EventType   WebhookEventType `json:"event_type,omitempty"`
	Description string           `json:"description,omitempty"`
	Enabled     bool             `json:"enabled"`
	Secret      string           `json:"secret,omitempty"`
	CreatedAt   string           `json:"created_at,omitempty"`
	UpdatedAt   string           `json:"updated_at,omitempty"`
}

// WebhookLog is a webhook delivery log entry.
type WebhookLog struct {
	ID             string           `json:"id"`
	WebhookID      string           `json:"webhook_id,omitempty"`
	AccountID      string           `json:"account_id,omitempty"`
	EventType      WebhookEventType `json:"event_type,omitempty"`
	ResponseStatus int              `json:"response_status,omitempty"`
	ResponseBody   string           `json:"response_body,omitempty"`
	DurationMs     int              `json:"duration_ms,omitempty"`
	Error          string           `json:"error,omitempty"`
	CreatedAt      string           `json:"created_at,omitempty"`
}

// ListWebhookLogsOptions are query params for webhook delivery logs.
type ListWebhookLogsOptions struct {
	Page     int
	PageSize int
}

// ListWebhookLogsResponse is a paginated webhook log list.
type ListWebhookLogsResponse = Paginated[WebhookLog]
