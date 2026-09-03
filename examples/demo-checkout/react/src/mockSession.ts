import type { CheckoutSession } from "@fluxisus/react";

/** Same test NASPIP token used in the react package's Storybook stories. */
export const DEMO_NASPIP_TOKEN =
  "naspip;fluxis.us;fluxis.qr.dyn.1;v4.public.IhgyMDI2LTA2LTA3VDE4OjA0OjMwLjc1NVoyGDIwMjYtMDYtMDdUMTc6MDQ6MzAuNzU1WkIPZmx1eGlzLnFyLmR5bi4xShQyMDM2LTA0LTA2VDE3OjMzOjA4WlIJZmx1eGlzLnVzWoICCpABCiVpZC1kZS1wcnVlYmEtcGFyYS1uYXNwaXAtdG9rZW4tZW4tc2RrEioweEI0REIwMmY4YzRiNTE1OWU1MzY4Q0U0NzQ5ZkQ5MzQ0YTMzMzk5OTciMW5iYXNlX3QweGYwMTY0MTM4MzRFNkQxQTE0RjNENjI4QjExRDZFZjcyNWE2YmRiREQyATFIt_KHmuozEm0KATESKjB4ZjAxNjQxMzgzNEU2RDFBMTRGM0Q2MjhCMTFENkVmNzI1YTZiZGJERBoaRXN0ZSBlcyB1biBjb2JybyBkZSBwcnVlYmEiIAoPTmFjaG8gZWNvbW1lcmNlGg0yMC0zOTY0NDUwNy040fSYvAgvch4ogiRkJZJDlVVbBZ7nmw5Muis1UvBkZ6fAP1XjvT7EjjDYHvzpw2Jm0N72bfJsN0AJJGGyHw_CBg";

/** Real, catalog-listed unique asset (USDC on Polygon, per the root CLAUDE.md example). */
export const SINGLE_ASSET_ID =
  "npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
const PAYMENT_OPTIONS = [
  { unique_asset_id: SINGLE_ASSET_ID, symbol: "USDC", network: "polygon" },
  {
    unique_asset_id: "nbase_t0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    symbol: "USDC",
    network: "base",
  },
  {
    unique_asset_id: "nbase_t0x0xf016413834E6D1A14F3D628B11D6Ef725a6bdbDD",
    symbol: "ARGt",
    network: "base",
  },
  {
    unique_asset_id: "nbase_t0x0DC4F92879B7670e5f4e4e6e3c801D229129D90D",
    symbol: "wARS",
    network: "base",
  },
];

export const MAP_ASSET: Record<string, { symbol: string; network: string }> = {
  nbase_t0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913: {
    symbol: "USDC",
    network: "base",
  },
  nbase_t0x0xf016413834E6D1A14F3D628B11D6Ef725a6bdbDD: {
    symbol: "ARGt",
    network: "base",
  },
  nbase_t0x0DC4F92879B7670e5f4e4e6e3c801D229129D90D: {
    symbol: "wARS",
    network: "base",
  },
  npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359: {
    symbol: "USDC",
    network: "polygon",
  },
};

let sessionCounter = 0;

export interface BuildSessionOptions {
  status?: CheckoutSession["status"];
  amount?: string;
  currency?: string;
  /** Pre-load manual_transfer, as if a prior asset selection already ran. */
  withManualTransfer?: boolean;
  /** Restrict payment_options to a single asset, to exercise the "only one asset" guards. */
  singleAssetOnly?: boolean;
}

export function buildSession(
  options: BuildSessionOptions = {},
): CheckoutSession {
  sessionCounter += 1;

  const session: CheckoutSession = {
    id: `cso_demo_${Date.now()}_${sessionCounter}`,
    amount: options.amount ?? "10.00",
    currency: options.currency ?? "USD",
    recipient_address: DEMO_NASPIP_TOKEN,
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    status: options.status ?? "pending",
    return_url: "https://example.com/order/123/success",
    external_id: "order-demo-001",
    payment_options: PAYMENT_OPTIONS,
  };

  if (options.singleAssetOnly) {
    session.payment_options = [
      { unique_asset_id: SINGLE_ASSET_ID, symbol: "USDC", network: "polygon" },
    ];
  }

  if (options.withManualTransfer || options.singleAssetOnly) {
    session.manual_transfer = {
      wallet_address: "0xB4DB02f8c4b5159e5368CE4749fD9344a333997",
      crypto_amount: options.amount ?? "10.00",
      crypto_asset: "USDC",
      network: "polygon",
      reference_amount: options.amount ?? "10.00",
      reference_currency: options.currency ?? "USD",
    };
  }

  return session;
}
