## ADDED Requirements

### Requirement: Data modules render as circles
`FluxisQrCode` SHALL render non-corner data modules as SVG `<circle>` elements with radius equal to `moduleSize * 0.45`, so dots are visually round with a small gap between them.

#### Scenario: Data module appearance
- **WHEN** a valid NASPIP token is rendered
- **THEN** all data modules outside the three corner markers appear as filled circles in the foreground color

### Requirement: Corner markers render as nested squares
`FluxisQrCode` SHALL render the three position-detection corner markers (top-left, top-right, bottom-left) as three nested `<rect>` elements: outer filled square (7×7 modules), white inner square (5×5 modules), filled center square (3×3 modules).

#### Scenario: Corner marker appearance
- **WHEN** a valid NASPIP token is rendered
- **THEN** each of the three corner markers is drawn as concentric squares in foreground/background/foreground colors

### Requirement: Quiet zone padding
`FluxisQrCode` SHALL add a quiet-zone margin of 4 modules around the QR matrix when `marginSize` is 0 (the default), ensuring scanner readability.

#### Scenario: Default quiet zone
- **WHEN** `marginSize` is not specified or is 0
- **THEN** the SVG includes a 4-module padding offset around the QR matrix

### Requirement: Logo centered in SVG
`FluxisQrCode` SHALL overlay the Fluxis logo as an SVG `<image>` element centered on the QR, sized via `resolvedLogoSize`.

#### Scenario: Logo placement
- **WHEN** a valid NASPIP token is rendered with the default logo
- **THEN** the logo image appears centered and does not affect QR decoding (high error correction compensates)

### Requirement: Invalid token fallback unchanged
`FluxisQrCode` SHALL render the same error fallback div when the token is not a valid NASPIP token.

#### Scenario: Invalid token
- **WHEN** `token` does not start with `naspip;`
- **THEN** a styled error div is rendered instead of the SVG
