# AMIXOF – Phase 2A: federation disabled (standalone mode)

Branch `amixof/phase2-standalone` (from the Phase 1 branch, all Phase 1 commits preserved).

## Approach

Federation is switched off with Misskey's own kill switch, made permanent, instead of deleting code:
`packages/backend/src/misc/standalone.ts` defines `FEDERATION_ENABLED = false` and `enforceStandalone()`, which forces
`meta.federation = 'none'` wherever the server settings are loaded (`GlobalModule`, `MetaService`). A stored value of
`all` / `specified` (restored backup, upgraded instance) can not re-enable it, and `admin/update-meta` stores `none`
whatever it is given. All existing checks (`isFederationAllowedHost`, the AP routes, the inbox processor, the AP resolver)
therefore take their disabled branch. Gaps found in Phase 1 were closed with `FEDERATION_ENABLED` guards.

## Disabled

| Area | Behaviour now |
| --- | --- |
| Outgoing delivery | `QueueService.deliver` / `deliverMany` enqueue nothing |
| Incoming | `/inbox`, `/users/:id/inbox`, actor / note / collection / outbox documents: 403 |
| Discovery | WebFinger, host-meta(.json), `/.well-known/nodeinfo`: 403; `/nodeinfo/2.0`, `/nodeinfo/2.1`: 404 (were open before) |
| Remote users | `RemoteUserResolveService` refuses before any WebFinger request; `ap/show`, `users/show` with a host fail |
| Instance metadata | `FetchInstanceMetadataService` makes no request and takes no lock |
| Relays | `RelayService.addRelay` refuses |
| Admin UI | federation, federation jobs and relays entries removed from the control panel; federation settings section hidden |
| Other UI | surfaces already guarded by `instance.federation !== 'none'` (widgets, status bar, user selectors, search, about tab) hide automatically |

## Preserved (tested)

Sign-up and sign-in, posting, following, home and local timelines, notifications, WebSocket streaming, blocking, mute,
follow approval, account move between local accounts, drive and the OAuth discovery document.

## Tests

| Suite | Result |
| --- | --- |
| New `test/e2e/standalone.ts` | 8 passed (setting cannot be enabled, inbox, AP documents, discovery, remote lookup, relays, local social flow) |
| New `test/unit/standalone.ts`, `test/unit/QueueService.standalone.ts` | 7 passed |
| Converted: `nodeinfo.ts`, `well-known.ts`, `fetch-resource.ts` (AP cases), `ff-visibility.ts` (AP case), `endpoints.ts` (media-type helper no longer reads the AP note view) | pass; they now assert refusal |
| `FetchInstanceMetadataService.ts`, `RelayService.ts` unit tests | run with the flag mocked on, to keep covering the dormant code |
| Regression e2e: `timelines`, `users`, `move`, `note`, `follow-approval`, `streaming`, `note-notify`, `block` | 8 files passed |
| Frontend | typecheck, eslint on changed files, 165 unit tests pass; `pnpm build` passes |

The Docker federation suite (`test-federation`) is **obsolete** in standalone mode and was not re-run; its Phase 1
baseline is in `FEDERATION_BASELINE.md`.

## Remaining federation exposure (not removed on purpose)

* Code, tables, columns and migrations are untouched (`host IS NULL` is the local predicate).
* The idle `deliver` / `inbox` BullMQ queues and workers are still started; no jobs are ever added.
* Endpoints still exist but are inert or return errors: `ap/show`, `federation/*`, `admin/federation/*`,
  `admin/relays/*` (`relays/add` answers with an internal error, `relays/list` is empty).
* Frontend files for lookup (`/lookup`), instance pages and federation widgets still ship in the bundle; they are
  unreachable from the navigation or fail against the server. The post form still shows the "local only" toggle.
* HTML pages still render profile and note pages; the ActivityPub `<link rel="alternate">` tags are already omitted.
* Historic remote rows, if any, remain in the database.
