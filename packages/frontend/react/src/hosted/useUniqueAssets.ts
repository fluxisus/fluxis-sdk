import { useEffect, useState } from 'react';
import { UNIQUE_ASSET_IDS_URL } from './constants.js';
import { parseUniqueAssets, type UniqueAsset } from './uniqueAssets.js';

export interface UseUniqueAssetsOptions {
  assetsUrl?: string;
}

export interface UseUniqueAssetsResult {
  assets: UniqueAsset[];
  loading: boolean;
  error: Error | null;
}

const cache = new Map<string, UniqueAsset[]>();
const inflight = new Map<string, Promise<UniqueAsset[]>>();

async function fetchUniqueAssets(url: string): Promise<UniqueAsset[]> {
  const cached = cache.get(url);
  if (cached) return cached;

  const pending = inflight.get(url);
  if (pending) return pending;

  const request = fetch(url)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch unique assets (${response.status} ${response.statusText})`);
      }
      const assets = parseUniqueAssets(await response.json());
      cache.set(url, assets);
      return assets;
    })
    .finally(() => {
      inflight.delete(url);
    });

  inflight.set(url, request);
  return request;
}

export function clearUniqueAssetsCache(url?: string): void {
  if (url) {
    cache.delete(url);
    inflight.delete(url);
    return;
  }
  cache.clear();
  inflight.clear();
}

export function useUniqueAssets({
  assetsUrl = UNIQUE_ASSET_IDS_URL,
}: UseUniqueAssetsOptions = {}): UseUniqueAssetsResult {
  const [assets, setAssets] = useState<UniqueAsset[]>(() => cache.get(assetsUrl) ?? []);
  const [loading, setLoading] = useState(() => !cache.has(assetsUrl));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(!cache.has(assetsUrl));
    setError(null);

    fetchUniqueAssets(assetsUrl)
      .then((fetched) => {
        if (!cancelled) setAssets(fetched);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setAssets([]);
          setError(err instanceof Error ? err : new Error('Failed to load unique assets'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [assetsUrl]);

  return { assets, loading, error };
}
