import { useState } from 'react';
import {
  CompatibleApps,
  CompatibleAppsMarquee,
  FluxisProvider,
  FluxisQrCode,
  usePaymentStatus,
} from '@fluxisus/react';

function PaymentStatusWidget() {
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [enabled, setEnabled] = useState(true);

  const statusUrl = simulateFailure
    ? '/api/payment-status/demo?fail=1'
    : '/api/payment-status/demo';

  const { status, data, error, isPolling, refetch } = usePaymentStatus(statusUrl, {
    pollInterval: 3000,
    enabled,
  });

  return (
    <section className="preview-block">
      <h3>usePaymentStatus</h3>
      <p className="marquee-hint">
        Polls a mock dev-server route every 3s. Open DevTools → Network and
        filter on "payment-status" to watch requests fire and stop.
      </p>

      <dl className="status-grid">
        <dt>status</dt>
        <dd>{status ?? '(none yet)'}</dd>
        <dt>isPolling</dt>
        <dd>{String(isPolling)}</dd>
        <dt>error</dt>
        <dd>{error ? error.message : '(none)'}</dd>
        <dt>data</dt>
        <dd>{data ? JSON.stringify(data) : '(none)'}</dd>
      </dl>

      <div className="status-controls">
        <button
          type="button"
          onClick={() => fetch('/api/payment-status/demo?reset=1').then(refetch)}
        >
          Reset demo + refetch
        </button>
        <button type="button" onClick={refetch}>
          Refetch now
        </button>
        <label className="field inline">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          <span>enabled</span>
        </label>
        <label className="field inline">
          <input
            type="checkbox"
            checked={simulateFailure}
            onChange={(event) => setSimulateFailure(event.target.checked)}
          />
          <span>simulate backend error</span>
        </label>
      </div>
    </section>
  );
}

const DEMO_TOKEN =
  'naspip;fluxis.us;fluxis.qr.dyn.1;v4.public.IhgyMDI2LTA2LTA3VDE4OjA0OjMwLjc1NVoyGDIwMjYtMDYtMDdUMTc6MDQ6MzAuNzU1WkIPZmx1eGlzLnFyLmR5bi4xShQyMDM2LTA0LTA2VDE3OjMzOjA4WlIJZmx1eGlzLnVzWoICCpABCiVpZC1kZS1wcnVlYmEtcGFyYS1uYXNwaXAtdG9rZW4tZW4tc2RrEioweEI0REIwMmY4YzRiNTE1OWU1MzY4Q0U0NzQ5ZkQ5MzQ0YTMzMzk5OTciMW5iYXNlX3QweGYwMTY0MTM4MzRFNkQxQTE0RjNENjI4QjExRDZFZjcyNWE2YmRiREQyATFIt_KHmuozEm0KATESKjB4ZjAxNjQxMzgzNEU2RDFBMTRGM0Q2MjhCMTFENkVmNzI1YTZiZGJERBoaRXN0ZSBlcyB1biBjb2JybyBkZSBwcnVlYmEiIAoPTmFjaG8gZWNvbW1lcmNlGg0yMC0zOTY0NDUwNy040fSYvAgvch4ogiRkJZJDlVVbBZ7nmw5Muis1UvBkZ6fAP1XjvT7EjjDYHvzpw2Jm0N72bfJsN0AJJGGyHw_CBg';

type PlatformMode = 'auto' | 'mobile' | 'desktop';

export function App() {
  const [token, setToken] = useState(DEMO_TOKEN);
  const [platform, setPlatform] = useState<PlatformMode>('auto');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [qrFg, setQrFg] = useState('#0f172a');
  const [qrBg, setQrBg] = useState('#ffffff');
  const [showStatusWidget, setShowStatusWidget] = useState(true);

  const forcePlatform =
    platform === 'auto' ? undefined : platform;

  return (
    <div className="page">
      <header className="header">
        <div>
          <p className="eyebrow">Temporary playground</p>
          <h1>Fluxis React SDK</h1>
          <p className="subtitle">
            Paste a NASPIP token from your backend and preview the standardized
            QR and compatible wallet buttons.
          </p>
        </div>
      </header>

      <div className="layout">
        <aside className="panel controls">
          <h2>Controls</h2>

          <label className="field">
            <span>NASPIP token</span>
            <textarea
              value={token}
              onChange={(event) => setToken(event.target.value)}
              rows={4}
              spellCheck={false}
            />
          </label>

          <label className="field">
            <span>Platform preview</span>
            <select
              value={platform}
              onChange={(event) =>
                setPlatform(event.target.value as PlatformMode)
              }
            >
              <option value="auto">Auto-detect</option>
              <option value="mobile">Force mobile (deep links)</option>
              <option value="desktop">Force desktop (QR fallback)</option>
            </select>
          </label>

          <div className="color-grid">
            <label className="field">
              <span>Primary</span>
              <input
                type="color"
                value={primaryColor}
                onChange={(event) => setPrimaryColor(event.target.value)}
              />
            </label>
            <label className="field">
              <span>QR foreground</span>
              <input
                type="color"
                value={qrFg}
                onChange={(event) => setQrFg(event.target.value)}
              />
            </label>
            <label className="field">
              <span>QR background</span>
              <input
                type="color"
                value={qrBg}
                onChange={(event) => setQrBg(event.target.value)}
              />
            </label>
          </div>
        </aside>

        <main className="panel preview">
          <h2>Preview</h2>

          <FluxisProvider
            theme={{
              colorPrimary: primaryColor,
              qrFg,
              qrBg,
              buttonBg: '#ffffff',
              buttonHoverBg: '#f8fafc',
            }}
          >
            <section className="preview-block">
              <h3>FluxisQrCode</h3>
              <div className="qr-wrap">
                <FluxisQrCode token={token} size={240} />
              </div>
            </section>

            <section className="preview-block">
              <h3>CompatibleApps</h3>
              <CompatibleApps
                token={token}
                forcePlatform={forcePlatform}
              />
            </section>

            <section className="preview-block">
              <h3>CompatibleAppsMarquee</h3>
              <p className="marquee-hint">
                Hover to pause the continuous scroll
              </p>
              <CompatibleAppsMarquee width="100%" height={56} speed={18} />
            </section>

            <label className="field inline" style={{ marginTop: '2rem' }}>
              <input
                type="checkbox"
                checked={showStatusWidget}
                onChange={(event) => setShowStatusWidget(event.target.checked)}
              />
              <span>mount usePaymentStatus widget (uncheck to test unmount cleanup)</span>
            </label>

            {showStatusWidget && <PaymentStatusWidget />}
          </FluxisProvider>
        </main>
      </div>

      <style>{`
        .page {
          max-width: 1100px;
          margin: 0 auto;
          padding: 2rem 1.25rem 3rem;
        }

        .header {
          margin-bottom: 1.5rem;
        }

        .eyebrow {
          margin: 0 0 0.25rem;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
        }

        h1 {
          margin: 0;
          font-size: 2rem;
        }

        .subtitle {
          margin: 0.5rem 0 0;
          color: #475569;
          max-width: 42rem;
        }

        .layout {
          display: grid;
          grid-template-columns: minmax(260px, 320px) 1fr;
          gap: 1rem;
        }

        .panel {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 1rem;
          padding: 1.25rem;
          min-width: 0;
        }

        h2 {
          margin: 0 0 1rem;
          font-size: 1.125rem;
        }

        h3 {
          margin: 0 0 0.75rem;
          font-size: 0.95rem;
          color: #334155;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
          margin-bottom: 1rem;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .field textarea,
        .field select {
          font: inherit;
          font-weight: 400;
          border: 1px solid #cbd5e1;
          border-radius: 0.5rem;
          padding: 0.625rem 0.75rem;
          resize: vertical;
        }

        .color-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.75rem;
        }

        .color-grid input[type='color'] {
          width: 100%;
          height: 2.5rem;
          border: 1px solid #cbd5e1;
          border-radius: 0.5rem;
          padding: 0.125rem;
          background: #fff;
          cursor: pointer;
        }

        .preview-block + .preview-block {
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid #e2e8f0;
        }

        .qr-wrap {
          display: flex;
          justify-content: center;
        }

        .marquee-hint {
          margin: 0 0 0.75rem;
          font-size: 0.8125rem;
          color: #64748b;
        }

        .field.inline {
          flex-direction: row;
          align-items: center;
          gap: 0.5rem;
          font-weight: 400;
        }

        .status-grid {
          display: grid;
          grid-template-columns: max-content 1fr;
          gap: 0.375rem 0.75rem;
          margin: 0 0 1rem;
          font-size: 0.875rem;
        }

        .status-grid dt {
          font-weight: 600;
          color: #334155;
        }

        .status-grid dd {
          margin: 0;
          word-break: break-all;
        }

        .status-controls {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.75rem;
        }

        .status-controls button {
          border: 1px solid #cbd5e1;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: #fff;
          cursor: pointer;
          font: inherit;
        }

        @media (max-width: 800px) {
          .layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
