# AMIXOF – Phase 2B: brand integration

Branch `amixof/phase2-standalone`, base `b086030` (Phase 2A). Branding only: no layout redesign, no federation, backend
architecture, database or dependency changes.

## Assets

The two official logos were supplied as images (2000x2000 WebP) and are archived unaltered in `branding/source/`.

| File | Format found | Handling |
| --- | --- | --- |
| Light: coral-red artwork (`#FE5058`) | opaque white canvas | outer white canvas made transparent by flood fill from the border (anti-aliased edge converted to alpha); the letters enclosed by the artwork stay white, exactly as supplied |
| Dark: white artwork | transparent canvas | used as supplied |

Both are cropped to one shared box (4% padding) so they keep the same scale and proportions (464x512); nothing is
stretched or redrawn. `branding/make-brand-assets.py` regenerates every derivative from the sources.

| Output | Size | Used by |
| --- | --- | --- |
| `packages/frontend/assets/amixof-logo-{light,dark}.webp` | 464x512 (17-27 KB) | `MkAmixofLogo.vue` (2x density at the sizes used) |
| `packages/backend/assets/favicon.ico` | 16, 32, 48, 64, 128 | browser tab, default instance icon (sidebar / login card) |
| `favicon.png` | 128 | |
| `apple-touch-icon.png` | 180, opaque white | iOS home screen |
| `icons/192.png`, `icons/512.png` | maskable, logo inside the 80% safe zone on white | PWA install, default Open Graph image |
| `splash.png` | 300, transparent | loading screen, PWA splash |
| `mi-white.png` | 288, white mark | e-mail header |

SVG was not produced: only raster artwork exists and tracing it would redraw the logo.

## Branding changes

| Location | Change |
| --- | --- |
| Welcome / sign-up / sign-in screens (`welcome.entrance.simple.vue`, `.classic.vue`) | the "Powered by Misskey" wordmark is replaced by the AMIXOF logo (white variant, because it sits on photos / the red backdrop) |
| Header / sidebar / login card | show the instance icon; its default is now the AMIXOF mark (`favicon.ico`); administrator-set icon and name still win |
| QR page (`qr.show.vue`) | AMIXOF logo, alt text "AMIXOF" |
| New `MkAmixofLogo.vue` | both variants, CSS picks by `html[data-color-scheme]` (instant on theme change), `scheme` prop forces one, `role="img"` + `aria-label`, decorative inner images |
| Browser title, `og:title`, `og:site_name`, opensearch, `application-name` | fallback `Misskey` -> `AMIXOF` in `base.tsx`, `base-embed.tsx`, `error.tsx`, `bios/cli/flush/info-card`, `ClientServerService`, `HtmlTemplateService` (instance name from settings still wins) |
| Social previews | `og:image` now always present: the uploaded banner if any, otherwise the 512 icon |
| PWA manifest | `theme_color` `#FF5058`, `background_color` `#F5F6F9`, icons as above (name still from settings) |
| `theme-color` meta defaults | `#86b300` -> `#FF5058` |
| Service worker | update notification body `AMIXOF vX` |
| Themes | new `l-amixof` and `d-amixof` in `packages/frontend-shared/themes/`, registered in `js/theme.ts`, set as the default light and dark themes (boot, code highlighter, settings page) |
| Brand tokens | `brandCoral/Red/DeepRed/Pink/Burgundy` declared in `_light.json5` and `_dark.json5` (required: the compiler keeps only keys of the base theme) -> `var(--MI_THEME-brandCoral)` etc. in every theme |

Surfaces: light page `#F5F6F9`, feed `#FFFFFF`, secondary `#F1F2F5`; dark page `#0C0C11`, feed `#14131B`, secondary
`#22212B`. Existing gradients (primary button, backdrop) are untouched; the full gradient work is Phase 2C.

### Deliberately unchanged

API / protocol identifiers (`WWW-Authenticate realm="Misskey"`, `Mk:` AiScript APIs, `misskey-js`, storage keys,
`MiMeta` names, RSS `generator`), `reversi-game` ("Misskey Reversi"), the console banner, the **About Misskey** page
(copyright, AGPL notice, source links, contributor credits), `MkSourceCodeAvailablePopup`, Twemoji / third-party notices,
and all `SPDX` headers. `frontend/assets/misskey.svg` is now unused but kept.

## Verification

| Check | Result |
| --- | --- |
| Frontend typecheck (`vue-tsc`) | pass |
| ESLint on every changed file | pass (frontend, frontend-shared, backend `.ts`, sw) |
| Frontend unit tests | **171 passed** (165 + 6 new theme tests: palette and surface values compile through the real compiler) |
| Backend `tsc`, `fetch-resource` e2e (renders the changed views) | pass, 84 passed / 4 todo |
| `pnpm build` | pass |
| Browser (Chromium, production build): welcome screen light / dark desktop and light mobile (390x844 at 2x) | AMIXOF mark correct and sharp on each backdrop, no distortion; page background `rgb(245,246,249)` light and `rgb(12,12,17)` dark; theme follows the OS scheme; no page errors; title `AMIXOF` |
| Browser: signed-in shell, light and dark | sidebar shows the AMIXOF mark; red/coral accent applied |
| `/manifest.json`, `<meta>` tags, `/favicon.ico`, `/apple-touch-icon.png`, icons | serve the new values (HTTP 200) |
| Not verified visually | the sign-in popup, installed-PWA splash, e-mail rendering, iOS/Android icon masks, dark mobile viewport |

Backend `.tsx` view lint reports 5 errors in `channel/flush/note/oauth.tsx`; these are pre-existing (the package lint script
only covers `.ts`) and were not touched beyond the one-line branding change in `flush.tsx`.

## Code review

The supplied `code-reviewer` skill was loaded, but the installed copy contains **only `SKILL.md`**: `rules/universal.md`,
`languages/typescript.md` and `scripts/` (`pr_analyzer.py`, `code_quality_checker.py`, `review_report_generator.py`) do not
exist, so the three tools could not be run and **no score or verdict is reported**. A manual review against the skill's
checklist and thresholds was done instead.

| Area | Result |
| --- | --- |
| Secrets | none in the diff (pattern scan plus a check for the generated passwords and tokens) |
| Injection / XSS | new markup uses Vue templates and JSX attribute interpolation of trusted config (`config.url`); no `v-html`, no `innerHTML`; `<title safe>` kept |
| Types / imports | `vue-tsc` and `tsc` clean; new component has typed props |
| Thresholds | no function over 50 lines, largest new file 68 lines, no nesting over 4, no branching over 10 |
| Duplication | the welcome pages already duplicated the same block; the new component removes the duplicated image markup |
| Unintended changes | `git status` lists only intended files |
| Theme compatibility | brand tokens live in the base themes, so all existing themes still compile (covered by the unit test) |

| Severity | Finding |
| --- | --- |
| Critical / High | none |
| Medium | **Contrast.** Light accent `#E53940` on white is 4.21:1 (3.89 on the page colour) and white on it 4.21:1, below WCAG AA for small text (4.5). Coral on white is 3.21:1, so it is used for indicators and focus only. Dark coral on the panel is 5.74:1 (passes). Upstream's default green accent was lower, so this is not a regression, but Phase 2C should darken text-size accents (for example `#C62832`, 5.6:1) |
| Medium | **Upstream credit.** The "Powered by Misskey" mark on the welcome screens is gone. AGPL does not require that mark; the licence notice, source link and contributor credits remain on the About page, but a visible "Based on Misskey (AGPL-3.0)" line is advisable and belongs in the legal review (`AGPL_COMPLIANCE.md`) |
| Low | **Locales.** Only `ja-JP.yml` may be edited; the other 41 locale files (Crowdin) still contain "Misskey" in 46 strings, so English users still see some upstream wording. Needs a translation strategy, not a code change |
| Low | Visitor panel still shows the Phase 2A notice "Federation is disabled on this server" |
| Low | Light logo is a derived asset (background made transparent). Fringes were checked on `#F5F6F9`, `#FFFFFF` and the red backdrop; re-check on any new surface colour |
| Low | `manifest.background_color` is a constant light colour; a dark-first PWA would flash light on launch |

## Remaining Phase 2B tasks

1. Visual check of the sign-in popup, installed PWA and e-mail header.
2. Decide and add the visible upstream attribution line (with legal review).
3. Locale strategy for the non-Japanese strings that still say Misskey.
4. Hide the leftover federation notice in the visitor panel.
5. Supply SVG artwork if crisp vector scaling is wanted.
