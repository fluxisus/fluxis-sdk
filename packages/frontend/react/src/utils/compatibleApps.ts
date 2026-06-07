import type { CompatibleApp, CompatibleAppRaw } from '../types.js';

export function normalizeCompatibleApp(raw: CompatibleAppRaw): CompatibleApp {
  return {
    name: raw.name,
    displayName: raw.display_name,
    imageUrl: raw.image_url,
    websiteUrl: raw.website_url,
    appStoreUrl: raw.app_store_url,
    googlePlayUrl: raw.google_play_url,
    deepLink: raw.deep_link,
  };
}

export function filterCompatibleApps(
  apps: CompatibleApp[],
  include?: string[],
  exclude?: string[],
): CompatibleApp[] {
  let filtered = apps;

  if (include && include.length > 0) {
    const includeSet = new Set(include);
    filtered = filtered.filter((app) => includeSet.has(app.name));
  }

  if (exclude && exclude.length > 0) {
    const excludeSet = new Set(exclude);
    filtered = filtered.filter((app) => !excludeSet.has(app.name));
  }

  return filtered;
}
