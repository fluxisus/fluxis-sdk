const NASPIP_PLACEHOLDER = '[NASPIP_TOKEN]';
const CHECKOUT_URL_PLACEHOLDER = '[CHECKOUT_URL]';
const CHECKOUT_HOST_PATH_PLACEHOLDER = '[CHECKOUT_HOST_PATH]';

export function checkoutHostPath(checkoutUrl: string): string {
  return checkoutUrl.replace(/^https?:\/\//i, '');
}

/**
 * Fills CDN deep_link templates. Placeholders in the JSON must be left unencoded;
 * this function applies encodeURIComponent where the wallet's URL scheme needs it.
 */
export function resolveWalletLink(
  template: string,
  {
    naspipToken,
    checkoutUrl,
  }: {
    naspipToken?: string;
    checkoutUrl?: string;
  },
): string {
  let resolved = template;

  if (naspipToken) {
    resolved = resolved.split(NASPIP_PLACEHOLDER).join(encodeURIComponent(naspipToken));
  }

  if (checkoutUrl) {
    resolved = resolved
      .split(CHECKOUT_URL_PLACEHOLDER)
      .join(encodeURIComponent(checkoutUrl));
    resolved = resolved
      .split(CHECKOUT_HOST_PATH_PLACEHOLDER)
      .join(checkoutHostPath(checkoutUrl));
  }

  return resolved;
}
