## ADDED Requirements

### Requirement: Block explorer link in ConfirmingScreen
When the checkout session includes a transaction hash and the network is recognized, `ConfirmingScreen` SHALL render a "Ver en blockchain →" anchor link that opens the block explorer transaction page in a new tab.

#### Scenario: tx_hash present with known network
- **WHEN** `session.tx_hash` is a non-empty string AND `session.manual_transfer?.network` maps to a known block explorer
- **THEN** a link with text "Ver en blockchain →" SHALL be rendered below the spinner, with `href` set to `<explorerBase><tx_hash>`, `target="_blank"`, and `rel="noopener noreferrer"`

#### Scenario: tx_hash present with unknown network
- **WHEN** `session.tx_hash` is set but `session.manual_transfer?.network` is absent or not in the known network map
- **THEN** no explorer link SHALL be rendered

#### Scenario: tx_hash absent
- **WHEN** `session.tx_hash` is undefined or empty
- **THEN** no explorer link SHALL be rendered

#### Scenario: session prop not provided
- **WHEN** `ConfirmingScreen` is rendered without a `session` prop
- **THEN** no explorer link SHALL be rendered and the screen SHALL display normally
