/**
 * The response-header set from docs/09-privacy-and-security.md, shared by the post-build step
 * (which writes dist/_headers for hosts such as Cloudflare Pages) and the local preview server.
 *
 * Fetch directives (script-src, style-src, default-src …) are delivered per page in Astro's
 * hashed <meta> CSP. This header policy adds the directives a <meta> tag cannot carry.
 * Browsers enforce both policies, so the effective policy is the stricter combination.
 */
export const HEADER_CSP = [
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

export const PERMISSIONS_POLICY = [
  'accelerometer=()',
  'autoplay=()',
  'camera=()',
  'display-capture=()',
  'encrypted-media=()',
  'geolocation=()',
  'gyroscope=()',
  'hid=()',
  'idle-detection=()',
  'magnetometer=()',
  'microphone=()',
  'midi=()',
  'payment=()',
  'publickey-credentials-get=()',
  'screen-wake-lock=()',
  'serial=()',
  'usb=()',
  'xr-spatial-tracking=()',
  'browsing-topics=()',
  'clipboard-write=(self)',
  'fullscreen=(self)',
].join(', ');

/** @param {{ local?: boolean }} [options] local=true drops HTTPS-only headers for http://localhost */
export function securityHeaders(options = {}) {
  const headers = {
    'Content-Security-Policy': options.local
      ? HEADER_CSP.replace('; upgrade-insecure-requests', '')
      : HEADER_CSP,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': PERMISSIONS_POLICY,
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'X-Frame-Options': 'DENY',
  };
  if (!options.local) {
    headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload';
  }
  return headers;
}
