# AMIXOF – Phase 2C: flush three-column shell and demo button order

Branch `amixof/phase2-standalone`, base `c941511` (Phase 2B). Frontend only; no backend, federation, dependency or
global spacing changes (`--MI-margin` and `--MI-radius` are untouched).

## Layout changes

| Area | Change |
| --- | --- |
| Column separators | `universal.vue`: sidebar and widgets borders `0.5px` -> `1px` |
| Structural corner | `universal.vue`: the 12px top-left radius on the content column (titlebar mode) is removed |
| Home feed (`pages/timeline.vue`) | on viewports >= 501px the feed fills its column: no `800px` max width, no outer padding, no rounded card, one continuous `--MI_THEME-panel` surface; the tips panel and the fixed post form become full-width flush bars with a 1px divider; post separators were already 1px dividers |
| Narrow viewports | unchanged (the new rules sit behind `min-width: 501px`, the same threshold the shell uses for mobile) |
| Sticky header, sidebar, safe-area padding, widgets column, dialogs and menus | untouched |

Internal padding of posts, widgets and navigation items is unchanged, and the right-hand widgets keep their card styling and
column padding as in the reference.

## Buttons moved to match the demo

| Where | Before | Now |
| --- | --- | --- |
| Left navigation (default order) | Timeline, Notifications, Clips, Drive, Follow requests, Message, Explore, Announcements, Channels, Search, Switch UI, Control Panel, More, Settings | Timeline (Home), **Explore, Notifications, Message, Favorites (bookmarks), Profile, Settings**, then the Note button, then Control Panel and More |
| "Create a post" button | pinned to the bottom of the sidebar | directly under the navigation (`navbar.vue`; the account card stays at the bottom); `data-testid="open-post-form"` kept |
| Items no longer in the default list | | clips, drive, follow requests, announcements, channels, search and the UI switcher are in **More**; the follow-request indicator still shows on More |
| Post actions (`MkNote.vue`) | Reply, Renote, React, Clip, Menu | **React, Reply, Renote**, Clip, Menu |

The default menu is a preference default (`preferences/def.ts`): users who already saved their own menu keep it.

## Verification

| Check | Result |
| --- | --- |
| `vue-tsc` typecheck | pass |
| ESLint on the 5 changed files | pass |
| Frontend unit tests | 171 passed |
| `pnpm build` | pass |
| Playwright e2e (13 tests: sign-up, sign-in, setup wizard, posting, hotkey, router) on the new build | 13 passed |
| Browser (Chromium, production build), signed in | |
| 1440x900 dark and light | three columns touch (sidebar 250px, feed, widgets 350px); feed continuous; nav and Note button in the new order; React first |
| 1920x1000 light | captured, no gaps, no overflow |
| 900x1000 dark (tablet) | widgets column hidden as before, icon rail with the same order and the Note button under it, flush feed |
| 390x844 dark (mobile) | unchanged: header avatar and tabs, single column, footer menu with the Note button |
| Horizontal overflow | `scrollWidth` equals the viewport width at 1920, 1440, 900 and 390 |

Not verified: overlay and dropdown behaviour was only exercised through the e2e flows (post form, wizard); keyboard
focus order after moving React first was not tested with a screen reader.

## Review (manual; the skill's scripts are not installed)

No new function over 50 lines, no file over 500 lines added, no new branching; only template order and CSS moved. No
critical or high findings.

| Severity | Finding |
| --- | --- |
| Medium | `MkNoteDetailed` / `MkNoteSimple` still use the old action order, so the note detail page differs from the feed |
| Low | only the home timeline is flush; other pages (explore, profile, notifications) keep the standard spacer |
| Low | users with a saved menu keep their old order, and a saved `menu` is not migrated |

## Remaining layout and design work (not done here)

1. The demo's top bar (logo, search field, theme toggle, bell, avatar) does not exist in Misskey's shell; adding it is a new
   component, not a spacing change.
2. Feed tabs: the demo shows `For You / Following / Local` with text labels; Misskey shows icon tabs (Home, Local, ...).
3. Tip, Share and the creator-support card from the demo belong to features excluded from this phase.
4. Right column content ("The conversation", "On your radar") is a widget decision.
5. Apply the same flush treatment to the other main pages and to `MkNoteDetailed`.
