import { useEffect, useState } from 'react';
import bundledApps from '../data/compatible-apps.json';
import type { CompatibleApp, CompatibleAppRaw } from '../types.js';
import { COMPATIBLE_APPS_URL } from '../utils/constants.js';
import { normalizeCompatibleApp } from '../utils/compatibleApps.js';

interface UseCompatibleAppsOptions {
  apps?: CompatibleApp[];
  appsUrl?: string;
  /**
   * When true, attempts to refresh the list from `appsUrl`.
   * Disabled by default because the CDN does not currently expose CORS headers.
   */
  syncRemote?: boolean;
}

interface UseCompatibleAppsResult {
  apps: CompatibleApp[];
  loading: boolean;
  error: Error | null;
}

const cache = new Map<string, CompatibleApp[]>();
const inflight = new Map<string, Promise<CompatibleApp[]>>();

const BUNDLED_COMPATIBLE_APPS = (bundledApps as CompatibleAppRaw[]).map(
  normalizeCompatibleApp,
);

function parseCompatibleApps(raw: CompatibleAppRaw[]): CompatibleApp[] {
  return raw.map(normalizeCompatibleApp);
}

async function fetchCompatibleApps(url: string): Promise<CompatibleApp[]> {
  const cached = cache.get(url);
  if (cached) {
    return cached;
  }

  const pending = inflight.get(url);
  if (pending) {
    return pending;
  }

  const request = fetch(url)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(
          `Failed to fetch compatible apps (${response.status} ${response.statusText})`,
        );
      }

      const raw = (await response.json()) as CompatibleAppRaw[];
      const apps = parseCompatibleApps(raw);
      cache.set(url, apps);
      return apps;
    })
    .finally(() => {
      inflight.delete(url);
    });

  inflight.set(url, request);
  return request;
}

export function clearCompatibleAppsCache(url?: string): void {
  if (url) {
    cache.delete(url);
    inflight.delete(url);
    return;
  }

  cache.clear();
  inflight.clear();
}

export function getBundledCompatibleApps(): CompatibleApp[] {
  return BUNDLED_COMPATIBLE_APPS;
}

export function useCompatibleApps({
  apps: providedApps,
  appsUrl = COMPATIBLE_APPS_URL,
  syncRemote = false,
}: UseCompatibleAppsOptions): UseCompatibleAppsResult {
  const [apps, setApps] = useState<CompatibleApp[]>(
    providedApps ?? BUNDLED_COMPATIBLE_APPS,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (providedApps) {
      setApps(providedApps);
      setLoading(false);
      setError(null);
      return;
    }

    if (!syncRemote) {
      setApps(BUNDLED_COMPATIBLE_APPS);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError(null);

    fetchCompatibleApps(appsUrl)
      .then((fetchedApps) => {
        if (!cancelled) {
          setApps(fetchedApps);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setApps(BUNDLED_COMPATIBLE_APPS);
          setError(
            err instanceof Error ? err : new Error('Failed to load compatible apps'),
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [providedApps, appsUrl, syncRemote]);

  return { apps, loading, error };
}
