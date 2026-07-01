## ADDED Requirements

### Requirement: AddressCopyButton displays truncated address
`AddressCopyButton` SHALL accept an `address` string and display it in truncated form showing the first 8 characters, an ellipsis (`…`), and the last 6 characters.

#### Scenario: Long address is truncated
- **WHEN** an address longer than 14 characters is provided
- **THEN** the displayed text shows `<first 8>…<last 6>`

#### Scenario: Short address is shown as-is
- **WHEN** an address of 14 characters or fewer is provided
- **THEN** the full address is displayed without truncation

### Requirement: AddressCopyButton copies address to clipboard on click
`AddressCopyButton` SHALL use `navigator.clipboard.writeText` to copy the full address when the button is clicked.

#### Scenario: Successful copy in secure context
- **WHEN** the user clicks the button in a secure context (HTTPS)
- **THEN** the full address is written to the clipboard

#### Scenario: Copy failure in insecure context
- **WHEN** `navigator.clipboard.writeText` throws (e.g., in HTTP or on permission denial)
- **THEN** the error is caught silently, the component does NOT crash, and the address text remains visible

### Requirement: AddressCopyButton shows transient "Copied!" feedback
After a successful clipboard write, `AddressCopyButton` SHALL replace its copy icon with a "Copied!" label for 2 seconds, then revert to the default state.

#### Scenario: Feedback shown after copy
- **WHEN** clipboard write succeeds
- **THEN** "Copied!" label is visible for approximately 2 seconds

#### Scenario: Reverts to default after feedback
- **WHEN** 2 seconds have elapsed after a successful copy
- **THEN** the component returns to showing the truncated address with the copy icon

### Requirement: AddressCopyButton accepts optional className prop
`AddressCopyButton` SHALL accept an optional `className` prop applied to its root element.

#### Scenario: className forwarded to root
- **WHEN** a `className` prop is provided
- **THEN** it is present on the rendered root element
