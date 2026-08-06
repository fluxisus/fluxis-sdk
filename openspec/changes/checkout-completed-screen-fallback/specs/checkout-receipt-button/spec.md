## MODIFIED Requirements

### Requirement: Receipt button in CompletedScreen

When the checkout session includes a `receipt_link`, `CompletedScreen` SHALL render a "Ver
recibo" anchor that opens the receipt URL in a new tab. Its prominence SHALL depend on whether
the shopper has anywhere else to go: when `returnUrl` is present the anchor SHALL be styled as a
secondary button below the primary "Volver al comercio" button, and when `returnUrl` is absent
or empty the anchor SHALL be styled as the primary action, since the receipt is then the only
destination the screen offers.

#### Scenario: receipt_link present with a return URL

- **WHEN** `session.receipt_link` is a non-empty string and `returnUrl` is a non-empty string
- **THEN** an anchor styled as a secondary button with text "Ver recibo" SHALL be rendered below
  the primary "Volver al comercio" button, with `href` set to `session.receipt_link`,
  `target="_blank"`, and `rel="noopener noreferrer"`

#### Scenario: receipt_link present without a return URL

- **WHEN** `session.receipt_link` is a non-empty string and `returnUrl` is undefined or empty
- **THEN** an anchor styled as the primary button with text "Ver recibo" SHALL be rendered, with
  `href` set to `session.receipt_link`, `target="_blank"`, and `rel="noopener noreferrer"`, and
  no "Volver al comercio" button SHALL be present

#### Scenario: receipt_link absent

- **WHEN** `session.receipt_link` is undefined or empty
- **THEN** no receipt button SHALL be rendered

#### Scenario: session prop not provided

- **WHEN** `CompletedScreen` is rendered without a `session` prop
- **THEN** no receipt button SHALL be rendered and the screen SHALL display normally

## ADDED Requirements

### Requirement: CompletedScreen renders inline receipt detail

`CompletedScreen` SHALL render the payment's durable details inline, so a shopper sees what was
paid without leaving the screen and regardless of whether a receipt link exists. It SHALL
display the reference amount and currency; the crypto amount, asset and network from
`manual_transfer` when that field is present; and `tx_hash` when present. A `tx_hash` SHALL be
rendered as a link to the block explorer for the session's network, resolved with the same
helper `ConfirmingScreen` uses, and SHALL fall back to plain text when the network has no known
explorer. This detail SHALL NOT disappear on the transition from `confirming` to `completed`.

#### Scenario: Session with a transaction hash on a known network

- **WHEN** `session.tx_hash` is a non-empty string and `session.manual_transfer.network` resolves
  to a known block explorer
- **THEN** the hash SHALL be rendered as an anchor to that explorer's transaction URL, with
  `target="_blank"` and `rel="noopener noreferrer"`

#### Scenario: Session with a transaction hash on an unknown network

- **WHEN** `session.tx_hash` is a non-empty string and the network has no known block explorer
- **THEN** the hash SHALL be rendered as plain text and no anchor SHALL be produced

#### Scenario: Session without manual_transfer

- **WHEN** `session.manual_transfer` is undefined
- **THEN** the amount and currency SHALL still be rendered, and no crypto amount, asset or
  network SHALL be shown

#### Scenario: session prop not provided

- **WHEN** `CompletedScreen` is rendered without a `session` prop
- **THEN** no receipt detail SHALL be rendered and the screen SHALL display normally

### Requirement: CompletedScreen offers a Fluxis destination when there is no merchant to return to

When `returnUrl` is absent or empty, `CompletedScreen` SHALL render a link to the Fluxis site so
the shopper has somewhere to go. It SHALL be a link only — the screen SHALL NOT navigate there on
its own, on a countdown or otherwise, because the shopper never asked to be sent there and doing
so would take the receipt away from them.

The shopper therefore keeps the completed screen, and with it the receipt, for as long as they
want. When a receipt link is also present the Fluxis link SHALL be the secondary action, leaving
the receipt primary.

#### Scenario: No return URL and a receipt link

- **WHEN** `returnUrl` is absent and `session.receipt_link` is a non-empty string
- **THEN** both a primary "Ver recibo" anchor and a secondary Fluxis anchor SHALL be rendered, and
  no other action SHALL be present

#### Scenario: No return URL and no receipt link

- **WHEN** `returnUrl` is absent and `session.receipt_link` is absent
- **THEN** the Fluxis anchor SHALL be rendered as the primary action

#### Scenario: The Fluxis link is never navigated to automatically

- **WHEN** `returnUrl` is absent and the shopper takes no action for any length of time
- **THEN** the browser SHALL NOT navigate anywhere, and the Fluxis anchor SHALL remain on screen

#### Scenario: A merchant return URL suppresses it

- **WHEN** `returnUrl` is a non-empty string
- **THEN** no Fluxis anchor SHALL be rendered
