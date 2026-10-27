# AMIXOF – Upstream Security Audit (Misskey 2026.10.1 @ `d9b1fc50ad`)

> Re-verified against the source on 2026-10-27. The earlier Phase 1 version of this
> file was never committed to the repository; the findings below were re-derived from
> the code and are the authoritative record. Severity uses High / Medium / Low / Info.
> "Fixed" means fixed on branch `claude/upbeat-turing-eqc3m4` with a regression test.

| # | Finding | Verified | Severity | Status | Block public launch? |
| --- | --- | --- | --- | --- | --- |
| 1 | No Content-Security-Policy on the SPA / API responses | Confirmed | Medium | **Report-only deployed**, not enforced (`CSP_REPORT_ONLY.md`) | Enforce before launch after inline scripts are hashed |
| 2 | No `X-Content-Type-Options: nosniff` | Confirmed | Medium | **Fixed** | — |
| 3 | Sessions stay valid after password change / reset | Confirmed | Medium | **Fixed** (change, self-service reset, staff reset); app tokens policy documented | — |
| 4 | Moderators can reset other moderators' passwords | Confirmed | High | **Fixed** | — |
| 5 | Secrets written to moderation log on settings change | Confirmed | Medium | **Fixed** (new entries); old rows need scrubbing on real DBs | Yes (scrub step) |
| 6 | Dev mode disables production protections | Confirmed (by design) | Low / Info | Documented | Yes (operational check `NODE_ENV=production`) |
| 7 | 3 high-severity dependency advisories | Confirmed (3 high / 13 moderate / 5 low) | High (one runtime path) | Open (needs dependency bump) | Yes for `ip-address` |
| 8 | Dependencies needing licence review | Reviewed | Info | Documented in `AGPL_COMPLIANCE.md` | Legal review |
| 9 | Missing CC-BY attribution for Twemoji | Confirmed | Medium (legal) | Open | Yes |
| 10 | Moderator can disable another moderator's / administrator's MFA (`admin/unset-mfa`) – new in this phase | Confirmed | High | **Fixed** | — |

## 1. Content-Security-Policy

> **Update:** a `Content-Security-Policy-Report-Only` header is now sent on all HTML documents (`server/web/csp.ts`,
> applied in `HtmlTemplateService.replyHtml`). A browser crawl found only two inline-script violations. Nothing is
> enforced yet. Findings and the enforcement plan: `docs/audit/CSP_REPORT_ONLY.md`. The analysis below is the original one.

* **Files**: `packages/backend/src/server/web/ClientServerService.ts` (SPA shell, `onRequest` hook at line 210 only
  sets `X-Frame-Options: DENY`), `packages/backend/src/server/api/ApiServerService.ts` (API, no CSP),
  `packages/backend/src/server/ServerService.ts` (global hooks: HSTS only when `url` is https).
* CSP **is** set on: error pages (`ServerService.ts:192`, `ClientServerService.ts:308/323/367`), file responses
  (`FileServerService.ts:77`: `default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'`),
  and the OAuth authorize page (`OAuth2ProviderService.ts:542`, `frame-ancestors 'none'`).
* **Impact**: an XSS in the SPA (e.g. via MFM/HTML rendering regressions) has no second line of defence; no
  `frame-ancestors`, `object-src`, or `base-uri` restrictions on the main document.
* **Why not fixed now**: the SPA shell (`views/base.pug`) uses inline scripts/styles, loads user-uploaded media,
  remote emoji, external instance assets, Sentry, hCaptcha/reCAPTCHA/Turnstile iframes, and the Vite dev server
  in development. A strict policy must be tested against media playback, WebSocket (`connect-src`), service
  worker, embed pages (`/embed/*` which intentionally remove `X-Frame-Options`) and Storybook.
* **Remediation**: add `Content-Security-Policy-Report-Only` in `ClientServerService` with
  `default-src 'self'; img-src * data: blob:; media-src * blob:; connect-src 'self' wss: https:;
  script-src 'self' 'nonce-…' https://challenges.cloudflare.com https://www.recaptcha.net https://js.hcaptcha.com;
  frame-src https://challenges.cloudflare.com https://www.recaptcha.net https://*.hcaptcha.com; object-src 'none';
  base-uri 'self'; frame-ancestors 'none'`, collect reports for one release, then enforce. Track in Phase 2/3.

## 2. `X-Content-Type-Options: nosniff`

* **Verified**: zero occurrences of `nosniff` in `packages/backend/src` before the fix.
* **Impact**: browsers may sniff user-uploaded files or API JSON into executable/stylesheet types.
* **Fix**: global `onRequest` hook in `packages/backend/src/server/ServerService.ts` sets the header on every
  response (API, files, SPA, ActivityPub, well-known).
* **Tests**: `packages/backend/test/e2e/endpoints.ts` → `security headers` (API and non-API responses).
* **Risk review**: static assets are served with correct MIME types by `@fastify/static`; files served by
  `FileServerService` already set explicit `Content-Type`; the Vite dev proxy forwards upstream types. No
  functional change observed in the local run (`/`, `/api/meta`, `/files/*`, `/streaming`).

## 3. Sessions after password change / reset

* **Files**: `packages/backend/src/server/api/endpoints/i/change-password.ts`,
  `…/reset-password.ts` (self-service, via emailed token), `…/admin/reset-password.ts`.
  All three only updated `user_profile.password`. The native login token (`user.token`) and third-party
  tokens (`access_token` table) stayed valid, so an attacker holding a session kept it after the victim
  changed the password. Token rotation exists only as a manual action (`i/regenerate-token`).
* **Fix (this phase)**: `UserAuthService.regenerateNativeToken()` rotates `user.token`, drops the in-process
  native-token cache entry synchronously, and publishes `userTokenRegenerated` (cross-worker cache invalidation in
  `CacheService`) and `myTokenRegenerated` (stream). It is called by `reset-password` (after consuming the one-time
  request) and by `admin/reset-password` when the target is another user; a staff member resetting their *own*
  password keeps their session (they can use `i/regenerate-token`). Existing clients of the target get
  `401 AUTHENTICATION_FAILED` on the next call and must sign in with the new password.
* **Tests**: `endpoints.ts` → `admin/reset-password` ("resetting a password invalidates the existing session…")
  and `reset-password (self service)`.
* **`i/change-password` (fixed in the follow-up pass)**: after a successful change it calls the same
  `regenerateNativeToken`. Misskey has one native token per user, so the caller's own session is revoked too and the
  client shows its sign-in dialog (the same behaviour as `i/regenerate-token`). Keeping the current device signed in
  would need a new response field carrying the rotated token plus a frontend token swap (an API and misskey-js
  change); it is possible but was left out deliberately.
* **Third-party application tokens (policy)**: tokens in the `access_token` table (OAuth/MiAuth apps) are scoped
  authorizations that are individually revocable (`i/revoke-token`, `i/authorized-apps`). A password change does
  **not** revoke them, so integrations keep working. Risk: an attacker who authorized an app keeps that access until
  the user revokes it. Recommended follow-up: show the authorized apps in the password-change confirmation, or add an
  opt-in "revoke all apps" flag. Covered by an e2e test that asserts the current policy.
* **Tests**: `endpoints.ts` → `i/change-password` (3 tests: session revoked and new password signs in; wrong current
  password keeps the session; app token survives).

## 4. Moderator → moderator password reset

* **File**: `packages/backend/src/server/api/endpoints/admin/reset-password.ts` (`requireModerator: true`).
  Before: only targets that are administrators were protected; any moderator could reset any other moderator
  (and receive the new plaintext password in the response), i.e. full takeover of peer staff accounts.
* **Fix**: a moderator target can only be reset by an administrator (or by themselves); administrators remain
  self-only. Error code unchanged (`ACCESS_DENIED`), no API schema change → no `misskey-js` regeneration needed.
* **Tests**: `endpoints.ts` → `admin/reset-password` (moderator→moderator denied, moderator→admin denied,
  admin→moderator allowed).

## 4b. Moderator → moderator MFA removal (`admin/unset-mfa`)

* **File**: `packages/backend/src/server/api/endpoints/admin/unset-mfa.ts` (`requireModerator: true`). Same defect as
  finding 4: only administrator targets were protected, so a moderator could delete another moderator's passkeys and TOTP
  (and disable passwordless login), removing the second factor before a takeover.
* **Fix**: a moderator target can only be changed by an administrator or by themselves; administrators stay self-only.
  Administrators keep the recovery path for locked-out moderators. No API schema change.
* **Tests**: `endpoints.ts` → `admin/unset-mfa` (5 tests: moderator→moderator denied, moderator→administrator denied,
  moderator→ordinary user allowed, administrator→moderator allowed, self allowed; the MFA flag is checked in the database).

## 5. Secrets in the moderation log

* **File**: `packages/backend/src/server/api/endpoints/admin/update-meta.ts:795-804` logged the full
  `MiMeta` row as `before`/`after` into `moderation_log.info`. `MiMeta` contains 11 secret columns
  (`hcaptchaSecretKey`, `mcaptchaSecretKey`, `recaptchaSecretKey`, `turnstileSecretKey`,
  `sensitiveMediaDetectionApiKey`, `smtpPass`, `swPrivateKey`, `deeplAuthKey`, `objectStorageSecretKey`,
  `verifymailAuthKey`, `truemailAuthKey`) plus the credential-adjacent `objectStorageAccessKey`.
* **Impact**: secrets are duplicated into an append-only audit table that is included in backups and exports and
  is readable via `admin/show-moderation-logs` (admin only). Rotating a secret does not remove old values.
* **Fix**: `packages/backend/src/misc/redact-server-settings.ts` replaces those values with `[REDACTED]` /
  `[REDACTED (changed)]` before logging, so auditors still see *that* a secret changed.
* **Tests**: `packages/backend/test/unit/misc/redact-server-settings.ts` (4 tests).
* **Follow-up for existing deployments**: scrub historical rows, e.g.
  `UPDATE moderation_log SET info = info - '{before,after}'::text[] WHERE type = 'updateServerSettings';`
  (or a targeted JSON rewrite) as a one-off maintenance step. The local `amixof` database is fresh.

## 6. Development mode and production protections

Confirmed code paths keyed on `NODE_ENV`:

| Behaviour | File | In non-production |
| --- | --- | --- |
| API rate limiting | `RateLimiterService.ts:36` | **disabled entirely** |
| CORS on `/files` | `FileServerService.ts:78` | `Access-Control-Allow-Origin: *` in `development` |
| HTTPS requirement for `url` | `misc/check-https.ts:8` | http allowed |
| HSTS | `ServerService.ts:88` | only when `url` starts with `https` (any env) |
| Localhost rate-limit warning | `SigninApiService.ts:100`, `ApiCallService.ts:373` | warning only in production |
| Temp file cleanup | `misc/create-temp.ts` | skipped |

These are upstream design choices, not bugs. **Operational requirement**: production must run with
`NODE_ENV=production` (the upstream `Dockerfile` sets it at line 110) behind TLS, with `trustProxy`
configured. Recommendation: add a startup warning when `NODE_ENV !== 'production'` and `url` is https
(Phase 2 hardening item).

## 7. Dependency advisories (`pnpm audit`, 2026-10-27)

21 advisories: **3 high, 13 moderate, 5 low**.

| Severity | Package | Installed | Path | Runtime? | Assessment |
| --- | --- | --- | --- | --- | --- |
| High | `ip-address` (GHSA-mwp4-54f8-5fhr, octal octet parsing) | 9.0.5 | backend → `ip-cidr@4.0.2` | yes | Used only in `misc/get-ip-hash.ts` (rate-limit bucketing); SSRF checks use `ipaddr.js` instead. Low real impact, but upgrade `ip-cidr`/override `ip-address` ≥ 10.3.1 before launch |
| High | `undici` (GHSA-xjj6-f33q-929c) | 8.11.2 | backend → `re2` → `node-gyp` | build-time only | not shipped at runtime; tracked |
| High | `happy-dom` (GHSA-834v-8h66-3h79) | 21.0.3 | misskey-js → vitest coverage | dev/test only | not shipped |
| Moderate ×13 | `ip-address` (4), `undici` (2), `fast-uri` (4), `fastify` (1 via frontend-embed), `uuid` (1) | | | mixed | follow upstream bumps |
| Low ×5 | `fast-uri`, `fastify` | | | | |

No dependency was upgraded in Phase 1 (instruction: do not upgrade working dependencies). Upgrades belong in a
dedicated dependency PR after Phase 2 scoping; verify with `pnpm audit` and the full test matrix.

## 8. Licence review – see `AGPL_COMPLIANCE.md`

## 9. CC-BY attribution for Twemoji

* `@misskey-dev/emoji-assets` is `MIT AND CC-BY-4.0`; `LICENSE-TWEMOJI` is Creative Commons Attribution 4.0.
  Twemoji graphics are served at `/twemoji/*` (`ClientServerService.ts:315`) and used as the default emoji
  style on some platforms.
* No attribution text exists in `packages/frontend` or `locales/*` ("Twemoji" does not occur).
* **Remediation**: add a credits/notices section (about page) stating "Twemoji © Twitter, Inc. and other
  contributors, licensed under CC-BY 4.0" with a link, plus a `THIRD_PARTY_NOTICES` document. Scheduled with
  the Phase 2 about-page rebranding.
