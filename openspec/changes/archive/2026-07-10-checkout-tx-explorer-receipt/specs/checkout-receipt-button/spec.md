## ADDED Requirements

### Requirement: Receipt button in CompletedScreen
When the checkout session includes a `receipt_link`, `CompletedScreen` SHALL render a secondary "Ver recibo" button below the primary "Volver al comercio" button that opens the receipt URL in a new tab.

#### Scenario: receipt_link present
- **WHEN** `session.receipt_link` is a non-empty string
- **THEN** an anchor styled as a secondary button with text "Ver recibo" SHALL be rendered, with `href` set to `session.receipt_link`, `target="_blank"`, and `rel="noopener noreferrer"`

#### Scenario: receipt_link absent
- **WHEN** `session.receipt_link` is undefined or empty
- **THEN** no receipt button SHALL be rendered

#### Scenario: session prop not provided
- **WHEN** `CompletedScreen` is rendered without a `session` prop
- **THEN** no receipt button SHALL be rendered and the screen SHALL display normally
