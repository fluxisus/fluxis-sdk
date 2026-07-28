## ADDED Requirements

### Requirement: PaymentStatusBadge renders Spanish labels with status colors
The `PaymentStatusBadge` component SHALL render a pill-shaped badge with a Spanish label and color pair derived from the session status.

#### Scenario: Pending status
- **WHEN** `status` is `"pending"`
- **THEN** the badge shows "Pendiente" in blue (`#1d4ed8`) on a light blue background

#### Scenario: Confirming status
- **WHEN** `status` is `"confirming"`
- **THEN** the badge shows "Confirmando" in amber (`#b45309`) on a light amber background

#### Scenario: Completed status
- **WHEN** `status` is `"completed"`
- **THEN** the badge shows "Completado" in green (`#15803d`) on a light green background

#### Scenario: Expired status
- **WHEN** `status` is `"expired"`
- **THEN** the badge shows "Expirado" in slate (`#475569`) on a light slate background

### Requirement: PendingScreen shows an "Estado" detail row
`PendingScreen` SHALL render an "Estado" row in its detail section (alongside Monto, Expira en, Referencia) with `<PaymentStatusBadge>` as the row value.

#### Scenario: Estado row visible on pending session
- **WHEN** `PendingScreen` renders
- **THEN** a row labeled "Estado" is visible with the `PaymentStatusBadge` component showing the current status
