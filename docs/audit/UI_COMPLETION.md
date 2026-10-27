# AMIXOF – UI completion report (desktop shell, navigation, timeline, post actions)

Branch `amixof/phase2-standalone` (forked from `claude/upbeat-turing-eqc3m4` after Phase 1). Builds on Phase 2C (`5d7a2fb`, `d6d22c9`). Frontend only: no backend, API,
dependency, migration or locale changes. `locales/ja-JP.yml` is untouched (every label reuses an existing key).

## Commits

| Commit | Scope | Files |
| --- | --- | --- |
| `8bbc1b8` | top application bar and the 1380px desktop shell | `ui/_common_/topbar.vue` (new), `ui/universal.vue`, `ui/_common_/navbar.vue` |
| `010ba5d` | readable timeline tabs with focus and active states | `pages/timeline.vue`, `components/global/MkPageHeader.tabs.vue` |
| `567d8af` | one post action order everywhere, with Share and Favorite buttons | `composables/use-note.ts`, `components/MkNote.vue`, `components/MkNoteDetailed.vue`, `MkPageHeader.tabs.vue` |
| `3fb72b5` | shared flush feed treatment for notifications, favorites, antennas and note detail | `style.scss`, `pages/{timeline,notifications,favorites,antenna-timeline,note}.vue` |
| (this commit) | documentation only | `docs/audit/UI_COMPLETION.md`, `docs/audit/PHASE_2C_LAYOUT.md`, `docs/AMIXOF_PROGRESS.md` |

`8bbc1b8` and `010ba5d` were pushed to `origin/amixof/phase2-standalone` before the "no further pushes" instruction;
`567d8af`, `3fb72b5` and the documentation commit are local only. Nothing was merged, rebased, reset or force-pushed.

## 1. Top application bar (`ui/_common_/topbar.vue`)

Rendered by `universal.vue` on every non-mobile viewport (the mobile shell keeps Misskey's own header and footer).

| Element | Implementation |
| --- | --- |
| Logo / home | `MkA to="/"` with `MkAmixofLogo` (30px, swaps light/dark artwork via `html[data-color-scheme]`) and the instance name; the name is hidden at or below 900px |
| Search | `<form role="search">` with `<input type="search">` (`aria-label` and placeholder = `i18n.ts.search`); submit navigates to `/search?q=…` through the typed router (`router.push('/search', { query: { q } })`); hidden at or below 700px, replaced by a search icon link |
| Theme toggle | button with `aria-label="Themes"`, `aria-pressed` = dark mode, `ti-sun` / `ti-moon` icon; toggles `store.darkMode`; when "sync with device" is on it asks the existing confirmation (`switchDarkModeManuallyWhenSyncEnabledConfirm`) before switching it off, the same flow as the settings page |
| Notifications | `MkA to="/my/notifications"` with an unread indicator driven by `$i.hasUnreadNotification` (the same signal the navbar uses) |
| Account | avatar button opening `getAccountMenu({ withExtraOperation: true })` through `os.popupMenu` |

Styling: 56px bar, `.inner` capped at 1380px and centred, pill search field on `--MI_THEME-buttonBg`, 2px `--MI_THEME-focus`
outline on `:focus-visible` (icon buttons, links) and `:focus-within` (search field). The navbar's instance button is hidden
(`hideInstanceButton` prop) because the bar now carries the brand.

## 2. Navigation and shell width

- Default navigation (`preferences/def.ts`, from Phase 2C): Timeline, Explore, Notifications, Message, Favorites, Profile,
  Settings, then the **Note** button, then Control Panel and More. Users who saved their own menu keep it.
- `universal.vue`: `.nonTitlebarArea` is `max-width: 1380px; margin: 0 auto`; above 1382px the shell gets 1px
  `--MI_THEME-divider` borders on both sides. Columns inside the shell are unchanged (sidebar 250px, feed, widgets 350px).

## 3. Timeline tabs

- Home, Local, Social and Global tabs now render their text labels on desktop (`iconOnly: false`), for both signed-in and
  visitor tab lists; list / antenna / channel tabs keep their icons.
- `MkPageHeader.tabs.vue`: the active tab is bold and underlined; `:focus-visible` draws a 2px `--MI_THEME-focus` outline;
  at or below 500px only the active tab shows its label so the mobile header does not overflow.
- No "For You" tab: the labels are the real timelines.

## 4. Post actions

Order on cards (`MkNote.vue`) and on the note page (`MkNoteDetailed.vue`):
**React → Reply → Renote → Share → Favorite → (Clip, if enabled) → Menu.** Every button has `v-tooltip` and an
`aria-label` (`Reactions`, `Reply`, `Renote`, `Share`, `Add to favorites`, `Menu`).

- `composables/use-note.ts` gained `share()` (Web Share API when available, otherwise copies `${url}/notes/{id}` with the
  existing "Copied" toast) and `toggleFavorite()` (reads `notes/state`, then `notes/favorites/create` or `delete`
  through `os.apiWithDialog`; requires sign-in through `pleaseLogin`). Both are no-ops for mock notes.
- **Tipping is not implemented.** The brief's order was React → Reply → Renote → Tip → Share → Bookmark; Tip has no
  backend, so no placeholder button was added. Bookmark maps to Misskey's Favorite (`ti-star`).
- Below a 400px container the footer becomes a single `space-between` row with 8px/4px button padding, so all six
  actions fit at 320px.

## 5. Shared design across enabled surfaces

`style.scss` adds `._spacer._amixofFeed` (≥ 501px: no max width, no outer padding, panel background, full height).
Timeline, notifications, favorites, antenna timelines and the note page opt in; each removes its own 12px radius and
uses 1px dividers between items. Explore, profile, search, chat and settings keep upstream's spacer and cards; they
were screenshot-checked inside the new shell and need no further change for this milestone.

## 6. Verification

Environment: dev server (`pnpm dev`) at 127.0.0.1:3000, Chromium 1243 (sandbox), signed in as the admin account.

### Automated

| Check | Result |
| --- | --- |
| ESLint, 13 frontend files changed since `d6d22c9` | pass |
| `vue-tsc --noEmit` (frontend) | pass |
| Frontend unit tests | 19 files, 171 passed |
| `pnpm build` (all packages) | pass |
| Playwright e2e on the production build (13 tests: sign-up, sign-in, setup wizard, post, hotkey, router) | 13 passed |
| `node scripts/check-shipping.mjs` (changed-file lint, SPDX, locale safety) | Lint PASS, SPDX PASS, Locale safety PASS |

### Responsive and theme sweep (`/`, dark and light)

| Width | Result |
| --- | --- |
| 320 | mobile shell; six action buttons on one row; no horizontal scroll |
| 390 | mobile shell; only the active tab label is shown |
| 768 | top bar (logo only, search, theme, bell, avatar); icon rail; flush feed |
| 900 | as 768, instance name hidden |
| 1380 | full top bar with name and search; three columns fill the 1380px shell |
| 1920 | shell centred at 1380px with 1px borders on both sides; nothing stretches |

`document.documentElement.scrollWidth === window.innerWidth` at every width in both themes.

### Interaction checks (Playwright script, 1380×900 dark)

| Check | Result |
| --- | --- |
| Tab order from the top of the page | Home → Search → Themes → Notifications → Account → navbar; focused controls show a visible outline (the search field shows it on its wrapper) |
| Search | typing "smoke" + Enter opens `/search?q=smoke` and lists results (10 articles) |
| Theme toggle | `data-color-scheme` dark → light and back; `aria-pressed` follows |
| Note button | opens the post form; Ctrl+Enter publishes; the note appears in `notes/timeline` |
| React | opens the reaction picker |
| Share | headless Chromium has no `navigator.share`, so the link is copied and the "Copied" toast shows |
| Favorite | `notes/state.isFavorited` false → true |
| Reply | opens the reply form |
| Bell | navigates to `/my/notifications` |
| Avatar | opens the account menu |
| Page errors | none |

### Screenshots

Captured during the sweep (scratch directory of this session, not committed): `home-{dark,light}-{320,390,768,900,1380,1920}.png`,
and `page-{explore,profile,search,chat,settings,notifications}-dark-1380.png`.

## 7. Remaining limitations

1. Tipping (creator support) is intentionally absent: no backend, no fake control.
2. The `Share` button on the detail page uses the same copy fallback; there is no share sheet on desktop browsers without
   the Web Share API.
3. Explore, profile, search, chat and settings keep upstream card styling inside the flush shell; a full flush treatment of
   those pages was not part of this milestone.
4. The interaction script runs against the dev server with a real account; it is not a committed Playwright test.
5. The search page shows "Note search is unavailable" when no search backend is configured (unchanged behaviour).
