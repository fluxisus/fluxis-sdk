import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Load `.env` from the SDK package root without overwriting existing env vars. */
export function loadTestEnv(): void {
  const envPath = resolve(packageRoot, '.env');
  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const separator = trimmed.indexOf('=');
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    value = value.replace(/^['"]|['"]$/g, '');

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export interface TestCredentials {
  apiKey: string;
  apiSecret: string;
}

/** Return staging credentials when both env vars are set and the key is a staging key. */
export function getTestCredentials(): TestCredentials | null {
  const apiKey = process.env.FLUXIS_API_KEY?.trim();
  const apiSecret = process.env.FLUXIS_API_SECRET?.trim();
  if (!apiKey || !apiSecret) {
    return null;
  }
  if (!apiKey.startsWith('fxs.stg.')) {
    return null;
  }
  return { apiKey, apiSecret };
}
