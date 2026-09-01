import { useMemo, useState, type ReactNode } from 'react';
import { StepIndicator } from '../components/checkout/StepIndicator.js';
import type { CheckoutPaymentOption, ManualTransferData } from '../types.js';
import { CountryFlag } from './CountryFlag.js';
import { CardLogo, SelectableCardList } from './SelectableCardList.js';
import { useUniqueAssets } from './useUniqueAssets.js';
import {
  findAsset,
  networksForSymbol,
  resolvePayableAssets,
  tokensByCountry,
  uniqueTokens,
  type UniqueToken,
} from './uniqueAssets.js';

type FlowStep = 'token' | 'network' | 'pay';

export interface AssetPickerProps {
  assetsUrl?: string;
  paymentOptions?: CheckoutPaymentOption[];
  /** Only used to decide whether to start straight on the pay step (already resolved). */
  manualTransfer?: ManualTransferData;
  onSelectAsset?: (assetId: string) => void | Promise<void>;
  /** Rendered for the pay step, once an asset is picked (or from the start, if `manualTransfer` is
   * already resolved). The picker doesn't know or care what "paying" looks like for the caller —
   * `ManualPaymentFlow` shows a copy/paste box, `ConnectedWalletPanel` shows a loading row. */
  renderPay: () => ReactNode;
}

export function instructionStyle(extra?: Record<string, string | number>) {
  return {
    margin: '0 0 0.75rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--fluxis-color-fg, #0f172a)',
    ...extra,
  };
}

function GroupByCountrySwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.8125rem',
        color: 'var(--fluxis-color-fg, #0f172a)',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label="Agrupar por país"
        onClick={() => onChange(!checked)}
        style={{
          width: '2.25rem',
          height: '1.25rem',
          borderRadius: '9999px',
          border: 'none',
          padding: 0,
          background: checked ? 'var(--fluxis-color-primary, #2563eb)' : 'var(--fluxis-color-border, #e2e8f0)',
          cursor: 'pointer',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '0.125rem',
            left: checked ? '1.125rem' : '0.125rem',
            width: '1rem',
            height: '1rem',
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.2)',
            transition: 'left 0.15s ease',
          }}
        />
      </button>
      Agrupar por país
    </label>
  );
}

/**
 * Token → network selection: "Elegí el token" then "Elegí la red" (with a country-grouping
 * switch), rendered under a shared `StepIndicator`. Owns catalog resolution and the picking state
 * machine so callers don't have to — used by both `ManualPaymentFlow` (manual copy/paste flow) and
 * `ConnectedWalletPanel`'s fallback (connected wallet, no balance match to auto-pick from).
 */
export function AssetPicker({
  assetsUrl,
  paymentOptions,
  manualTransfer,
  onSelectAsset,
  renderPay,
}: AssetPickerProps) {
  const { assets: catalog, loading } = useUniqueAssets({ assetsUrl });
  const assets = useMemo(
    () => resolvePayableAssets(catalog, paymentOptions, manualTransfer),
    [catalog, paymentOptions, manualTransfer],
  );
  const tokens = useMemo(() => uniqueTokens(assets), [assets]);
  const countries = useMemo(() => tokensByCountry(tokens), [tokens]);

  const [step, setStep] = useState<FlowStep>(manualTransfer?.wallet_address ? 'pay' : 'token');
  const [groupByCountry, setGroupByCountry] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(manualTransfer?.crypto_asset ?? null);
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(manualTransfer?.network ?? null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const selectedToken = tokens.find((token) => token.symbol === selectedSymbol);
  const networks = selectedSymbol ? networksForSymbol(assets, selectedSymbol) : [];
  const selectedNetworkMeta = networks.find((item) => item.network === selectedNetwork);
  const selectedAsset =
    selectedSymbol && selectedNetwork ? findAsset(assets, selectedSymbol, selectedNetwork) : undefined;

  const tokenLogoUrl = selectedToken?.imageUrl || selectedAsset?.token_image_url || undefined;
  const networkLogoUrl = selectedNetworkMeta?.imageUrl || selectedAsset?.network_image_url || undefined;

  const goToToken = () => {
    if (tokens.length <= 1) return;
    setStep('token');
    setSelectedNetwork(null);
    setError(false);
  };

  const goToNetwork = () => {
    if (!selectedSymbol || tokens.length <= 1) return;
    setStep('network');
    setError(false);
  };

  function handleToggleGroup(next: boolean) {
    setGroupByCountry(next);
    if (!next) setSelectedCountry(null);
  }

  function handleSelectToken(token: UniqueToken) {
    setSelectedSymbol(token.symbol);
    setSelectedNetwork(null);
    setError(false);
    setStep('network');
  }

  async function handleSelectNetwork(network: string) {
    const asset = selectedSymbol ? findAsset(assets, selectedSymbol, network) : undefined;
    if (!asset?.unique_asset_id || !onSelectAsset || pendingId) return;

    setSelectedNetwork(network);
    setError(false);
    setPendingId(asset.unique_asset_id);
    try {
      await onSelectAsset(asset.unique_asset_id);
      setStep('pay');
    } catch {
      setError(true);
    } finally {
      setPendingId(null);
    }
  }

  const countryTokens = selectedCountry
    ? (countries.find((country) => country.code === selectedCountry)?.tokens ?? [])
    : [];

  const tokenItems = (groupByCountry && !selectedCountry ? [] : groupByCountry ? countryTokens : tokens).map(
    (token) => ({
      id: token.symbol,
      label: token.symbol,
      image: <CardLogo src={token.imageUrl} alt={token.symbol} />,
    }),
  );

  const countryItems = countries.map((country) => ({
    id: country.code,
    label: country.name,
    image: <CountryFlag country={country.code} />,
  }));

  const networkItems = networks.map((item) => ({
    id: item.network,
    label: item.networkName,
    image: <CardLogo src={item.imageUrl} alt={item.networkName} />,
  }));

  const activeStep = step === 'token' ? 0 : step === 'network' ? 1 : 2;

  return (
    <div style={{ padding: '0.875rem 1rem 1rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <StepIndicator
          steps={[
            {
              label: 'Stablecoin',
              logoUrl: tokenLogoUrl,
              onClick: () => goToToken(),
            },
            {
              label: 'Red',
              logoUrl: networkLogoUrl,
              onClick: () => goToNetwork(),
            },
            { label: 'Pagar' },
          ]}
          activeStep={activeStep}
        />
      </div>

      {step === 'token' && (
        <>
          <p style={instructionStyle()}>
            {groupByCountry && selectedCountry
              ? `Elegí el token disponible en ${countries.find((c) => c.code === selectedCountry)?.name ?? selectedCountry}.`
              : groupByCountry
                ? 'Elegí el país.'
                : 'Elegí el token con el que vas a pagar.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '-0.25rem 0 0.75rem' }}>
            <GroupByCountrySwitch checked={groupByCountry} onChange={handleToggleGroup} />
          </div>

          {groupByCountry && selectedCountry ? (
            <button
              type="button"
              onClick={() => setSelectedCountry(null)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                margin: '0 0 0.75rem',
                padding: 0,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                font: 'inherit',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--fluxis-color-primary, #2563eb)',
              }}
            >
              ← {countries.find((c) => c.code === selectedCountry)?.name ?? selectedCountry}
            </button>
          ) : null}

          {loading && tokens.length === 0 ? (
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--fluxis-color-muted, #64748b)' }}>
              Cargando tokens…
            </p>
          ) : groupByCountry && !selectedCountry ? (
            <SelectableCardList items={countryItems} onSelect={setSelectedCountry} />
          ) : (
            <SelectableCardList
              items={tokenItems}
              onSelect={(symbol) => {
                const token = tokens.find((item) => item.symbol === symbol);
                if (token) handleSelectToken(token);
              }}
            />
          )}
        </>
      )}

      {step === 'network' && (
        <>
          <p style={instructionStyle()}>
            Seleccioná la red en la que tenés fondos para pagar con {selectedSymbol}.
          </p>
          <SelectableCardList
            items={networkItems}
            onSelect={handleSelectNetwork}
            disabled={pendingId != null}
            pendingId={
              pendingId
                ? networks.find((item) => item.asset.unique_asset_id === pendingId)?.network
                : null
            }
          />
        </>
      )}

      {step === 'pay' && renderPay()}

      {error && (
        <p
          style={{
            margin: '0.75rem 0 0',
            fontSize: '0.8125rem',
            color: '#dc2626',
            textAlign: 'center',
          }}
        >
          No pudimos procesar tu selección. Intentá de nuevo.
        </p>
      )}
    </div>
  );
}
