## ADDED Requirements

### Requirement: CopyField shows CheckIcon after successful copy
After clipboard write succeeds, `CopyField` SHALL render `<CheckIcon />` in place of `<CopyIcon />` for 2 seconds, then revert to `<CopyIcon />`. No text label SHALL be rendered during the feedback state.

#### Scenario: CheckIcon appears on copy
- **WHEN** the user clicks the copy button and the clipboard write resolves
- **THEN** the button contains `<CheckIcon />` and no text label

#### Scenario: Reverts to CopyIcon after 2 seconds
- **WHEN** 2 seconds have elapsed since the copy
- **THEN** the button reverts to `<CopyIcon />` and `<CheckIcon />` is no longer rendered

#### Scenario: Button width stays constant
- **WHEN** the component transitions between default and copied states
- **THEN** the button element does not change width (both states render a 14×14 SVG)

### Requirement: CheckIcon has accessible aria-label during feedback
While `copied === true`, the copy button SHALL carry `aria-label="Copiado"` so screen readers announce the state without relying on visible text.

#### Scenario: aria-label set on copied state
- **WHEN** `copied === true`
- **THEN** the button element has `aria-label="Copiado"`

#### Scenario: aria-label reverts on default state
- **WHEN** `copied === false`
- **THEN** the button element has `aria-label` matching the field label (e.g., "Copiar importe")
