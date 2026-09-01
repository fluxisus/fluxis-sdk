import { useEffect, useState } from "react";
import { WALLET_CATALOG_URL } from "./constants.js";
import {
  parseWalletCatalog,
  splitWalletCatalog,
} from "./normalizeWalletCatalog.js";
import type { WalletCatalogApp } from "./types.js";

interface UseWalletCatalogOptions {
  appsUrl?: string;
}

interface UseWalletCatalogResult {
  apps: WalletCatalogApp[];
  cefi: WalletCatalogApp[];
  defi: WalletCatalogApp[];
  loading: boolean;
  error: Error | null;
}

const cache = new Map<string, WalletCatalogApp[]>();
const inflight = new Map<string, Promise<WalletCatalogApp[]>>();

async function fetchWalletCatalog(url: string): Promise<WalletCatalogApp[]> {
  const cached = cache.get(url);
  if (cached) return cached;

  const pending = inflight.get(url);
  if (pending) return pending;

  const request = fetch(url)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(
          `Failed to fetch wallet catalog (${response.status} ${response.statusText})`,
        );
      }
      const apps = parseWalletCatalog(await response.json());
      cache.set(url, apps);
      return apps;
    })
    .finally(() => {
      inflight.delete(url);
    });

  inflight.set(url, request);
  return request;
}

export function clearWalletCatalogCache(url?: string): void {
  if (url) {
    cache.delete(url);
    inflight.delete(url);
    return;
  }
  cache.clear();
  inflight.clear();
}

export function useWalletCatalog({
  appsUrl = WALLET_CATALOG_URL,
}: UseWalletCatalogOptions = {}): UseWalletCatalogResult {
  const [apps, setApps] = useState<WalletCatalogApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchWalletCatalog(appsUrl)
      .then((fetched) => {
        if (!cancelled) setApps(fetched);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setApps([]);
          setError(
            err instanceof Error
              ? err
              : new Error("Failed to load wallet catalog"),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [appsUrl]);

  const { cefi, defi } = splitWalletCatalog(apps);
  return { apps, cefi, defi, loading, error };
}
