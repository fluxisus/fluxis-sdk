import { NASPIP_TOKEN_PREFIX } from './constants.js';

export function isValidNaspipToken(token: string): boolean {
  return typeof token === 'string' && token.startsWith(NASPIP_TOKEN_PREFIX);
}

export function buildDeepLink(deepLink: string, token: string): string {
  return deepLink.replace('[NASPIP_TOKEN]', encodeURIComponent(token));
}
