# 09 · Privacy and security

## Privacy by construction
The simplest way to meet GDPR/UK GDPR, CCPA/CPRA, COPPA and the ePrivacy "cookie law" is to **hold no personal data**. The design guarantees it:

| Rule | How it's enforced |
|---|---|
| No cookies | None set by our code, and Cloudflare bot/analytics features that set cookies stay off. E2E asserts `document.cookie === ''` and checks response headers for `Set-Cookie` |
| No analytics, ads, pixels, embeds, CDNs or third-party fonts | CSP `default-src 'self'`. E2E records every network request and **fails on any origin other than the site's own** |
| Local storage only for things the user asked for | IndexedDB (plans, images) + localStorage (UI prefs). This is "strictly necessary" storage for a service the user requested, so no consent banner is needed. The privacy notice still discloses it |
| Share links stay off the server | Plan data goes in the URL **fragment**, which browsers never send in requests. `Referrer-Policy: no-referrer` means it isn't leaked to other sites either |
| Users can delete everything | "Delete all my data" in Map settings clears IndexedDB and localStorage after confirmation |
| Image privacy | Imported tracing images and logos stay local. If the user chooses to include them in an exported file, they're **re-encoded through a canvas first, which strips EXIF metadata such as GPS location** |
| Children | Nothing is collected from anyone, so COPPA's personal-information rules aren't triggered. The privacy notice says so plainly |
| Global Privacy Control | Nothing to opt out of. The privacy notice states that GPC is honoured by default because no data is sold or shared |

If Kyle later wants usage numbers, the only acceptable options are aggregate, cookieless, server-side counts (e.g. the host's own request logs) **or** a self-hosted, cookieless tool on the same origin, plus a privacy notice update. That decision goes through `13-open-questions.md` first.

## Security headers
Cloudflare Pages reads `public/_headers`. Target configuration:

```
/*
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  Content-Security-Policy: default-src 'self'; script-src 'self' <build-time hashes>; style-src 'self' <build-time hashes>; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: accelerometer=(), autoplay=(), camera=(), display-capture=(), encrypted-media=(), geolocation=(), gyroscope=(), hid=(), idle-detection=(), magnetometer=(), microphone=(), midi=(), payment=(), publickey-credentials-get=(), screen-wake-lock=(), serial=(), usb=(), xr-spatial-tracking=(), browsing-topics=(), clipboard-write=(self), fullscreen=(self)
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Resource-Policy: same-origin
  X-Frame-Options: DENY

/_astro/*
  Cache-Control: public, max-age=31536000, immutable
```

**CSP implementation notes:**
- **No `'unsafe-inline'` and no `'unsafe-eval'`, ever.**
- Astro 6's CSP API hashes the inline scripts and styles it generates (island hydration). A meta-tag CSP **can't** carry `frame-ancestors`, and a header CSP whose `script-src` lacks those hashes would block hydration (browsers enforce every policy present). So either (a) generate the **header** CSP at build time with the same hashes (a post-build script reads `dist/**/*.html`, computes SHA-256 for every inline `<script>`/`<style>`, and writes `dist/_headers`), or (b) configure the build so no inline script or style is emitted and use `'self'`. Pick one in M0 and document it here.
- **Decision (M0, 2026-10-15): split policy.** Every page carries Astro 7's hashed `<meta>` CSP with all the fetch directives (`default-src 'self'`, `script-src`/`style-src` with hashes, `img-src 'self' data: blob:`, `font-src 'self'`, `connect-src 'self'`, `worker-src 'self' blob:`, `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`). The **header** CSP written to `dist/_headers` by `scripts/postbuild.mjs` carries only what a `<meta>` can't: `frame-ancestors 'none'`, plus `base-uri`, `form-action`, `object-src` and `upgrade-insecure-requests`. Browsers enforce both, so nothing is weaker, and the header never needs the per-page hashes. `postbuild.mjs` also fails the build if a page lacks the `<meta>`, allows `unsafe-inline`/`unsafe-eval`, uses a `style=""` attribute, or loads anything from another origin.
- **GitHub Pages (current host) can't send custom headers.** Until the move to Cloudflare Pages: the `<meta>` CSP and `<meta name="referrer" content="no-referrer">` still apply; GitHub enforces HTTPS and `github.io` is already HSTS-preloaded; `frame-ancestors`/`X-Frame-Options`, `Permissions-Policy` and the cross-origin headers are **not** sent. `dist/_headers` is ready for Cloudflare, and `npm run preview` serves it locally so E2E tests check the full header set.
- Zod 4 probes `new Function` to decide whether to JIT-compile; under our CSP that probe raises a violation report. `src/lib/zod.ts` sets `jitless: true`, and an ESLint rule forbids importing `zod` directly.
- React's `style={{…}}` sets styles through the CSSOM, which CSP allows. Avoid `style="…"` attributes in Astro templates. Use classes.
- Try `require-trusted-types-for 'script'` in M8. Ship it only if E2E shows no violations.
- E2E listens for `securitypolicyviolation` events and fails on any.

Other hardening:
- **HTTPS only**, with HSTS preload submitted once the domain is final (hstspreload.org). This matches the US federal HTTPS-Only Standard (OMB M-15-13).
- `/.well-known/security.txt` (RFC 9116; on GitHub Pages it sits under `/HabitatBlueprint/.well-known/` until there's a custom domain) with `Contact:`, `Expires:` (≤ 1 year), `Preferred-Languages: en`, `Canonical:` and `Policy:` pointing to a short "Report a security issue" section in `/help`.
- External links use `rel="noopener noreferrer"`.

## Threat model (client-only app)
| Threat | Mitigation |
|---|---|
| XSS through an imported plan or share link (malicious names or labels) | React escaping. No `dangerouslySetInnerHTML`. SVG/print export builds DOM nodes or escapes text. Strict CSP. Zod with string length caps |
| Malicious file / zip bomb / huge link → tab crash | Size caps (file ≤ 10 MB, link ≤ 64 KB decoded), ≤ 5,000 objects, ≤ 5,000 points per shape, ≤ 50 zones per habitat. Parse in a Web Worker with a timeout |
| Prototype pollution | Zod `.strict()` objects. Never deep-merge untrusted JSON into state. Use `Object.create(null)` maps where keys come from data |
| Image-decoder exploits | Only PNG/JPEG/WebP. Decode via `createImageBitmap`. Re-encode before export |
| Clickjacking | `frame-ancestors 'none'` + `X-Frame-Options: DENY` |
| Supply-chain compromise | Few dependencies. Exact pins + lockfile + `npm ci`. `npm audit` in CI. Dependabot. Prefer packages with npm provenance. No install scripts from unknown packages (`ignore-scripts` reviewed). Licence allowlist |
| ReDoS | No user-input regex on large strings. Validate with Zod lengths first |
| Data loss | Autosave + snapshot before destructive operations + "Save to file" reminders. IndexedDB failure banner |

Standards reference: apply the relevant **OWASP ASVS** (current version) Level 1 controls for a static, client-side app, plus the OWASP Top 10 client-side items. Record the checklist outcome in `docs/security-review.md` at M8.

## Content pages: "official site" cues
This isn't a government site. **Don't use the USWDS "An official website of the United States government" banner, the `.gov` lock iconography, or anything that implies government affiliation.** Borrowing USWDS accessibility *patterns* is fine. Its identity elements are not.
