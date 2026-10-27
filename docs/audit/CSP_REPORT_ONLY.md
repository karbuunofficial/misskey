# AMIXOF – Content-Security-Policy (report-only)

Status: **report-only, NOT enforced.** Implemented in `packages/backend/src/server/web/csp.ts` and applied to every
HTML document by `HtmlTemplateService.replyHtml` (`Content-Security-Policy-Report-Only`). Responses that already set
their own `Content-Security-Policy` (error pages, OAuth consent, file server) are unchanged.

## Policy

| Directive | Value | Reason |
| --- | --- | --- |
| `default-src` | `'self'` | baseline |
| `script-src` | `'self'` + Cloudflare Turnstile, hCaptcha, reCAPTCHA hosts | captcha scripts are injected by `MkCaptcha.vue`; **no** `'unsafe-inline'` / `'unsafe-eval'` so violations are visible |
| `style-src` | `'self' 'unsafe-inline'` | Vue renders inline style attributes and the bootloader emits an inline `<style>` |
| `img-src`, `media-src` | `* data: blob:` | remote avatars/emoji, media proxy, user media, blurhash canvas |
| `font-src` | `'self' data:` | |
| `connect-src` | `'self' ws: wss: https:` | API, streaming WebSocket, captcha, URL preview |
| `frame-src` | `'self' https:` | captcha iframes, embedded players |
| `worker-src` | `'self' blob:` | service worker `/sw.js`, blurhash workers |
| `manifest-src`, `object-src`, `base-uri`, `form-action` | `'self'`, `'none'`, `'self'`, `'self'` | |

`frame-ancestors` is deliberately omitted: `X-Frame-Options: DENY` is already sent on the SPA and removed only for
`/embed/*`. Add `frame-ancestors` together with enforcement.

## Test method

Production build served on `http://127.0.0.1:3000`, Chromium (Playwright) with a signed-in administrator session,
`securitypolicyviolation` listener plus console capture, 14 page loads plus one post made through the UI.

| Area | Result |
| --- | --- |
| Home timeline, explore, user profile, note page (with media) | loads, only the inline-script violation |
| Notifications (mention + follow notifications present) | loads, only the inline-script violation |
| Chat | loads, only the inline-script violation |
| Drive | loads, only the inline-script violation |
| Settings, security settings | loads, only the inline-script violation |
| Administration: overview, settings, users, moderation log | loads, only the inline-script violation |
| Posting from the UI (hotkey `n`, Ctrl+Enter) | note created and visible in the timeline |
| WebSocket streaming | no `connect-src` violation; delivery verified separately (mention and notification events received) |
| Service worker, workers, fonts, images, media | no violations |

## Violations found (all pages)

| Directive | Blocked | Source | Cause |
| --- | --- | --- | --- |
| `script-src-elem` | inline | `server/web/views/base.tsx` | `<script>const VERSION=…; const CLIENT_ENTRY=…; const LANGS=…;</script>` |
| `script-src-elem` | inline | `server/web/views/base.tsx` | inlined bootloader (`frontendBootloaderJs`) |

`<script type="application/json">` blocks (`misskey_meta`, `misskey_clientCtx`) are data, not executable, and are not
reported. An unrelated page error (`Cannot read properties of undefined (reading 'v')`) appeared once; it is not
caused by a report-only policy (nothing is blocked) and is most likely an artifact of the injected test session, so it
needs a look but is not a CSP finding.

## Not covered by this run (test before enforcing)

* Captcha providers (Turnstile, hCaptcha, reCAPTCHA) actually enabled in settings.
* Embedded players and `/embed/*` pages, OAuth consent page, Storybook, the Vite dev server (`pnpm dev` injects
  `@vite/client` and HMR over WebSocket, which needs `'unsafe-eval'`/inline allowances in development only).
* Sentry (if configured), reversi/games, widgets that embed third-party content, plugins (AiScript).
* Admin queue/job pages (the crawl used a wrong route for that one page).

## Plan to enforce

1. Replace the two inline scripts by hashes (they are constant per build, so `sha256-…` values can be computed at
   startup and added to `script-src`; a per-request nonce would conflict with the `public, max-age=30` caching of the
   HTML shell) or move them to external files.
2. Run the not-covered list above and a week of report-only traffic on staging with a `report-uri`/`report-to` sink.
3. Switch the header name to `Content-Security-Policy`, add `frame-ancestors 'none'` (and keep `/embed/*` exempt),
   keep the report-only copy for the next iteration.
4. Keep the development server on a relaxed policy.

Unit test: `packages/backend/test/unit/server/csp.ts` (script strictness, `object-src`/`base-uri`/`form-action`,
WebSocket/media/worker allowances).
