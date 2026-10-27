# AMIXOF – AGPL-3.0 Compliance Preparation

Status: **preparation only – not a legal opinion; requires legal review before public deployment.**

## 1. Licence of the upstream code

* Root `LICENSE` and `COPYING`: GNU Affero General Public License v3 (text), with the notice
  *"Copyright © 2014-2026 syuilo and contributors … distributed under The GNU Affero General Public License Version 3"*.
* Every source file carries an SPDX header, e.g. `SPDX-FileCopyrightText: syuilo and misskey-project` /
  `SPDX-License-Identifier: AGPL-3.0-only`. Counted holders in `packages/*/src`:
  1915 × "syuilo and misskey-project", 25 × "syuilo and other misskey contributors",
  1 × "syuilo and misskey-project , Type4ny-project" (`packages/backend/src/core/UserRenoteMutingService.ts`),
  1 × "dakkar and sharkey-project" (`packages/backend/src/core/activitypub/misc/check-against-url.ts`).
  **All of these notices must be preserved** (AGPL §5, §7(b)); the rebranding must not rewrite them.
* `packages/misskey-js` is a separate MIT-licensed package (`packages/misskey-js/LICENSE`); its notice must also be kept.
* `scripts/check-spdx.mjs` enforces headers in CI; AMIXOF-authored new files keep an AGPL-3.0-only header
  (the project rules in `AGENTS.md` require it).

## 2. Obligations when running a modified AGPL program as a network service

AGPL-3.0 §13: anyone interacting with AMIXOF over a network must be offered access to the
**Corresponding Source of the running version**, including all modifications, under AGPL-3.0.
Practical consequences:

1. The exact source of the deployed build (upstream + AMIXOF changes) must be published, e.g. as a public
   Git repository at the deployed commit, or served as a tarball from the instance.
2. The published source must include the full build inputs (pnpm lockfile, build scripts, locales, assets we add).
3. The offer must be visible to users of the service (link in the UI).
4. Modifications must carry prominent notices that they are changed and the date (§5(a)); keep `CHANGELOG`
   entries or a `docs/AMIXOF_CHANGES.md` for the fork.
5. The original copyright notices and the licence text must be retained (§5, §7).

## 3. Existing source-availability mechanism in Misskey

* `MiMeta.repositoryUrl` (default `https://github.com/misskey-dev/misskey`, `packages/backend/src/models/Meta.ts:393`)
  is exposed by `/api/meta` and nodeinfo (`NodeinfoServerService.ts`) and shown on the **About Misskey** page
  (`packages/frontend/src/pages/about-misskey.vue:48-63`). If the URL is left at the upstream default while the
  code is modified, the UI silently claims unmodified upstream – **AMIXOF must set `repositoryUrl` to the fork
  repository** (or the Phase 2 branding change should set the default in `Meta.ts`).
* Alternative: `publishTarballInsteadOfProvideRepositoryUrl: true` in `.config/default.yml` serves
  `built/tarball/` at `/tarball/` (`ClientServerService.ts:282`). The tarball must be regenerated on every deploy.
* The UI warns with `sourceCodeIsNotYetProvided` when neither is configured.

## 4. How AMIXOF will provide corresponding source (proposal)

| Option | Mechanism | Notes |
| --- | --- | --- |
| **A (recommended)** | Public Git repository `karbuunofficial/misskey`, deploy tags per release; set `repositoryUrl` to that repo | Requires the deployed commit to be pushed *before* it is deployed |
| B | `publishTarballInsteadOfProvideRepositoryUrl` + CI step creating `built/tarball/` | Works for private repos; adds size to the image |

Decision needed from the project owner; A is the simplest to keep honest.

## 5. Third-party attribution requirements found in Phase 1

| Asset | Licence | Where used | Attribution status |
| --- | --- | --- | --- |
| Twemoji graphics (`@misskey-dev/emoji-assets/built/twemoji`) | **CC-BY 4.0** (`LICENSE-TWEMOJI`) | served at `/twemoji/*` and `/twemoji-badge/*` (`ClientServerService.ts:315-345`) | **No attribution text anywhere in the UI or locales** – must be added (about/credits page or footer) before public launch |
| Fluent Emoji | MIT | `/fluent-emoji/*` | MIT notice must ship with the source (it does, in `node_modules` package) |
| Emoji keyword data (emojilib) / Unicode CLDR | MIT / Unicode-3.0 | search & autocomplete | notice in package |
| Tabler icons (`@tabler/icons-webfont`) | MIT | all UI icons | notice in package |
| `storybook-addon-misskey-theme` (GitHub dep) | MIT | dev only | — |
| `aiscript-vscode` (GitHub dep) | MIT (package `LICENSE`, Misskey Project) | AiScript syntax highlighting | — |

`pnpm licenses list` on the installed tree: MIT 236, Apache-2.0 18, ISC 9, BSD-3-Clause 8, BSD-2-Clause 6,
BlueOak-1.0.0 5, Python-2.0 1, PSF-2.0 1, 0BSD 1 – no copyleft or non-commercial licences beyond AGPL itself.

## 6. Questions for legal review

1. Confirm that the planned branding ("AMIXOF") does not misrepresent origin (AGPL §7(c)) – the rebrand should say
   "based on Misskey" somewhere reachable (about page) and keep `about-misskey` style credits.
2. Confirm the source-offer mechanism (Option A vs B) and whether a "written offer" is also required for any
   non-network distribution (e.g. shipping the Docker image to third parties).
3. Confirm attribution wording/placement for Twemoji (CC-BY 4.0 §3(a)).
4. Trademark: "Misskey" name/logo usage after rebrand (not a licence question but relevant to §7).
5. Whether removing federation triggers any additional notice obligations toward users of the service (none
   expected, but confirm the "modified version" notice).

## 7. Explicitly out of scope / not done

* No copyright notices were removed or altered.
* No rebranding was performed.
* Compliance is **not** declared complete.
