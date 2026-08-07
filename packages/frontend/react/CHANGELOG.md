# Changelog

## [0.5.0](https://github.com/fluxisus/fluxis-sdk/compare/react-sdk-v0.4.0...react-sdk-v0.5.0) (2026-08-07)


### ⚠ BREAKING CHANGES

* **checkout:** CheckoutSession.return_url is now optional, matching what the backend actually sends. Consumers reading it as a required string will need to handle undefined.

### Features

* **checkout:** hold the completed screen when there is no merchant to return to ([#57](https://github.com/fluxisus/fluxis-sdk/issues/57)) ([78573df](https://github.com/fluxisus/fluxis-sdk/commit/78573dfc103111103d657611befc6dbf86fc9dd8))

## [0.4.0](https://github.com/fluxisus/fluxis-sdk/compare/react-sdk-v0.3.0...react-sdk-v0.4.0) (2026-07-31)


### Features

* **checkout:** add wallet payment, with expired-retry and single-asset fixes ([e384bae](https://github.com/fluxisus/fluxis-sdk/commit/e384baef4e5dd64dd4549ea5894a579e7e805383))


### Bug Fixes

* **checkout:** repair expired retry, single-asset picker and wallet payment ([#48](https://github.com/fluxisus/fluxis-sdk/issues/48)) ([df4bb5a](https://github.com/fluxisus/fluxis-sdk/commit/df4bb5a096b9f8894730baa846843bb3b90bd745))

## [0.3.0](https://github.com/fluxisus/fluxis-sdk/compare/react-sdk-v0.2.0...react-sdk-v0.3.0) (2026-07-28)


### ⚠ BREAKING CHANGES

* **release:** CheckoutSession.recipient_address is now optional. A session in the new selecting_asset status has no recipient address until the shopper picks an asset, so the previously required typing could not be honoured once that status existed. Consumers reading the field must narrow it before use.
* **checkout:** CheckoutSession.recipient_address is now optional. A session in the new selecting_asset status has no recipient address until the shopper picks an asset, so the previously required typing could not be honoured once that status existed. Consumers reading the field must narrow it before use.

### Features

* **checkout:** rework CheckoutWidget with QR-first asset selection ([#38](https://github.com/fluxisus/fluxis-sdk/issues/38)) ([a554361](https://github.com/fluxisus/fluxis-sdk/commit/a55436123900456a969b5b8c918caab6133d5e39))


### Continuous Integration

* **release:** target main so SDKs never publish from development ([#43](https://github.com/fluxisus/fluxis-sdk/issues/43)) ([2a6d6ca](https://github.com/fluxisus/fluxis-sdk/commit/2a6d6cabe0b0806e6aa0791ea6ef9f7cece40685))

## [0.2.0](https://github.com/fluxisus/fluxis-sdk/compare/react-sdk-v0.1.0...react-sdk-v0.2.0) (2026-07-01)


### Features

* **react:** checkout UI components + automated npm publish ([#21](https://github.com/fluxisus/fluxis-sdk/issues/21)) ([750121a](https://github.com/fluxisus/fluxis-sdk/commit/750121a04cb067b7d80ff194268b7f3cb832ec6e))
