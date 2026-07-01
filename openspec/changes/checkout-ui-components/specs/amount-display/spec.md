## ADDED Requirements

### Requirement: AmountDisplay renders formatted payment amount and currency
`AmountDisplay` SHALL accept `amount` (string) and `currency` (string) props and render them as a human-readable payment amount.

#### Scenario: USD amount display
- **WHEN** `amount` is `"10.00"` and `currency` is `"USD"`
- **THEN** the component renders text equivalent to `$10.00 USD`

#### Scenario: ARS amount display
- **WHEN** `amount` is `"1234.99"` and `currency` is `"ARS"`
- **THEN** the component renders text equivalent to `$1,234.99 ARS`

#### Scenario: Amount with no decimal part
- **WHEN** `amount` is `"50"` and `currency` is `"USD"`
- **THEN** the component renders a value that represents fifty US dollars

### Requirement: AmountDisplay uses CSS variables with fallbacks
`AmountDisplay` SHALL style its output using CSS variables with explicit fallbacks so it renders correctly without a `FluxisProvider` ancestor.

#### Scenario: Renders without FluxisProvider
- **WHEN** `AmountDisplay` is rendered with no `FluxisProvider` in the tree
- **THEN** the component renders without error and applies fallback styling

### Requirement: AmountDisplay accepts optional className prop
`AmountDisplay` SHALL accept an optional `className` prop applied to its root element.

#### Scenario: className forwarded to root
- **WHEN** a `className` prop is provided
- **THEN** it is present on the rendered root element
