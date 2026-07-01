## ADDED Requirements

### Requirement: PaymentStatusBadge renders a colored pill for each status
`PaymentStatusBadge` SHALL accept a `status` prop of type `CheckoutSession['status']` and render a pill-shaped badge with a distinct background color for each status value.

#### Scenario: Pending status badge
- **WHEN** `status` is `"pending"`
- **THEN** the badge renders with a blue color and the label "Pending"

#### Scenario: Confirming status badge
- **WHEN** `status` is `"confirming"`
- **THEN** the badge renders with an amber color and the label "Confirming"

#### Scenario: Completed status badge
- **WHEN** `status` is `"completed"`
- **THEN** the badge renders with a green color and the label "Completed"

#### Scenario: Expired status badge
- **WHEN** `status` is `"expired"`
- **THEN** the badge renders with a gray color and the label "Expired"

### Requirement: PaymentStatusBadge uses CSS variables with fallbacks
All colors used by `PaymentStatusBadge` SHALL derive from the theme CSS variable system with explicit fallback values so the badge renders correctly without a `FluxisProvider` ancestor.

#### Scenario: Renders without FluxisProvider
- **WHEN** `PaymentStatusBadge` is rendered with no `FluxisProvider` in the tree
- **THEN** the badge renders without error and applies fallback colors

### Requirement: PaymentStatusBadge accepts optional className prop
`PaymentStatusBadge` SHALL accept an optional `className` prop applied to its root element.

#### Scenario: className forwarded to root
- **WHEN** a `className` prop is provided
- **THEN** it is present on the rendered root element
