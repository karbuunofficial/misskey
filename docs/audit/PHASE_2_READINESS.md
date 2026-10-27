# AMIXOF – Phase 2 Readiness (federation removal & rebranding)

Status: **planning / investigation only** – no Phase 2 change has been made. Paths are repo-relative;
backend paths are under `packages/backend/src/` unless written in full. Line numbers refer to upstream
`2026.10.1` (`d9b1fc50ad`).

## 1. Federation modules that can be disabled safely (self-contained)

| Area | Files | Notes |
| --- | --- | --- |
| ActivityPub core | `core/activitypub/**` (22 files: `ApRendererService`, `ApRequestService`, `ApResolverService`, `ApInboxService`, `ApDeliverManagerService`, `ApAudienceService`, `ApDbResolverService`, `ApMfmService`, `JsonLdService`, `ApLoggerService`, `models/Ap{Person,Note,Image,Mention,Question}Service`, `misc/*`) | Only entry points are the AP routes, the inbox/deliver queues and the resolve/mention paths listed in §2 |
| AP HTTP routes | `server/ActivityPubServerService.ts` (`/inbox`, `/users/:user/inbox`, `/notes/:note`, collections, `/users/:user/publickey`, actor JSON for `/users/:id` and `/@:acct` with AP accept header, `/emojis/:emoji`, `/likes/:like`, `/follows/...`) | All already return 403 when `meta.federation === 'none'` |
| Discovery | `server/WellKnownServerService.ts` (host-meta, webfinger, `/.well-known/nodeinfo`) and `server/NodeinfoServerService.ts` (`/nodeinfo/2.0`, `/nodeinfo/2.1`) | `WellKnownServerService` also serves `oauth-authorization-server` and `change-password`, which are **local and must stay**. `/nodeinfo/2.x` has **no** federation check today |
| Queues | `queue/processors/DeliverProcessorService.ts`, `InboxProcessorService.ts`, `CleanRemoteNotesProcessorService.ts`, `CleanRemoteFilesProcessorService.ts`; `deliver`/`inbox` in `QUEUE_TYPES` (`core/QueueService.ts:46`), workers in `queue/QueueProcessorService.ts:269,307` | `QueueService.deliver/deliverMany` still enqueue when federation is `none`; the processor skips them (`'skip (blocked)'`) – queue churn only |
| Remote-instance services | `core/RelayService.ts`, `core/FetchInstanceMetadataService.ts`, `core/FederatedInstanceService.ts`, `core/RemoteUserResolveService.ts`, `core/WebfingerService.ts`, `core/RemoteLoggerService.ts`, `core/UserKeypairService.ts`, `misc/gen-key-pair.ts` | `UserKeypairService` keys are created at signup (`core/SignupService.ts`); harmless to keep |
| Charts | `core/chart/charts/{federation,ap-request,instance}.ts` | `instance` chart is also written from Drive / NoteCreate / NoteDelete / UserFollowing / AccountMove – stub rather than delete |
| API endpoints | `ap/get`, `ap/show`, `federation/*` (7), `admin/federation/*` (4), `admin/relays/*` (3), `charts/{federation,ap-request,instance}`, `admin/emoji/{copy,list-remote}`, `admin/forward-abuse-user-report`, `users/search-by-username-and-host` | Removing endpoints requires `misskey-js` regeneration and frontend cleanup |
| System accounts | `SYSTEM_ACCOUNT_TYPES = ['actor','relay','proxy']` (`core/SystemAccountService.ts:23`) | `actor`/`relay` are AP-only; `proxy` is used by the media proxy |

## 2. Federation touchpoints inside local features (must be handled, not deleted)

| Local feature | Where federation is wired in | Local-only branch exists? |
| --- | --- | --- |
| Note create | `core/NoteCreateService.ts` delivery block :898-926, `renderNoteOrRenoteActivity` :1031, remote-mention resolve :1064, `federatedInstanceService.fetchOrRegister` :764, Redis LTL push only when `userHost == null` :1180-1195 | Yes – delivery only when `!data.localOnly && isLocalUser`; channel notes forced `localOnly` (:471) |
| Note delete | `core/NoteDeleteService.ts` :76-88, :172-174 | Yes (`!note.localOnly`) |
| Follow / unfollow / approvals | `core/UserFollowingService.ts` :99-135, :259-263, :318-326, :404-412 | Partly – remote paths behind `isRemoteUser` |
| Reactions | `core/ReactionService.ts` :268-280, :329 | Yes |
| Blocks | `core/UserBlockingService.ts` :97-99, :135-143, :206-208 | Yes |
| Polls | `core/PollService.ts` :97-105; `notes/polls/vote.ts:174` | Yes |
| Pins | `core/NotePiningService.ts` :80, :108, :118-125 | Yes |
| Profile update | `i/update.ts:575` → `core/AccountUpdateService.ts:35-38`; `alsoKnownAs` resolve `i/update.ts:482` | **No** |
| Account move | `core/AccountMoveService.ts` :92-99; `i/move.ts:115-117` | **No** – moving *is* a federation feature; decide whether to keep local→local moves |
| Suspend / delete / abuse report | `core/UserSuspendService.ts` :85-142, `core/DeleteAccountService.ts` :61-85, `core/AbuseReportService.ts` :142-144 | Behind `isLocalUser` |
| Drive | `core/DriveService.ts` (`isLink`, `userHost`, expired-link refetch :816), `core/entities/DriveFileEntityService.ts` :97-122 (media proxy), `server/FileServerService.ts` `/proxy` | Mixed – `drive/files/upload-from-url` is a local feature that must stay |
| User packing | `core/entities/UserEntityService.ts` :506 (`instance`), :528-532 (`uri`, `movedTo`/`alsoKnownAs` resolved via `apPersonService` at pack time) | **No** |
| Note packing | `core/entities/NoteEntityService.ts` :387-451 (remote emoji, `uri`/`url`), :341 remote visibility rule | **No** |
| Timelines | LTL SQL `note.userHost IS NULL` (`notes/local-timeline.ts:153`), hybrid :213, streaming `stream/channels/local-timeline.ts:57`, `FanoutTimelineEndpointService.ts:145-148` (blockedHosts filter), `perRemoteUserUserTimelineCacheMax` | LTL is local-only; home/GTL include remote notes only if remote users exist |
| Notifications | none federation-specific – remote actors enter through `ApInboxService` → NoteCreate / Reaction / UserFollowing | n/a |
| Mentions / lookup | `NoteCreateService.extractMentionedUsers` :1064 and `users/show.ts:162` call `RemoteUserResolveService.resolveUser`; import processors (`Import{Following,Muting,Blocking,UserLists}ProcessorService`) do too | **No** – webfinger still goes out even when federation is `none` |
| Kill switch | `admin/update-meta.ts:199-203,748-757`; `core/UtilityService.ts:135-148` (`isFederationAllowedHost/Uri`) | — |
| Frontend | pages `instance-info.vue`, `about.federation.vue`, `about.vue`, `lookup.vue`, `admin/{federation,relays,federation-job-queue*,overview.federation,overview.instances}.vue`, `admin/settings.vue`; components `Mk{InstanceTicker,InstanceCardMini,RemoteCaution,RemoteEmojiEditDialog,InstanceStats}.vue`; widgets `Widget{Federation,InstanceCloud}.vue`; `ui/_common_/statusbar-federation.vue`; `utility/get-user-menu.ts:116` | Guards on `instance.federation !== 'none'` exist in `MkWidgets.vue:67`, `ui/_common_/common.ts:71`, `statusbars.vue:18`, `MkUserSelectDialog.vue:90`, `explore.users.vue:9`, `search.user.vue:13,138`, `settings/privacy.vue:494`, `please-login.ts:57`. **Not guarded**: post-form "localOnly" toggle (`MkPostForm.vue:35`) |

### Behaviour of the existing kill switch (`meta.federation = 'none'`, the default for new installs)
* Inbound: `/inbox`, collections, actor JSON, notes/activities, webfinger, host-meta, `/.well-known/nodeinfo` → 403;
  inbox processor double-checks (`InboxProcessorService.ts:78,209`).
* Still exposed: `/nodeinfo/2.0`, `/nodeinfo/2.1` (report `protocols: ['activitypub']`), HTML user/note pages.
* Outbound: delivery jobs enqueued then skipped; `ApResolverService.resolve` :126 throws; **webfinger lookups,
  `FetchInstanceMetadataService`, and `admin/relays/add` are not gated**.

**Recommended Phase 2 strategy**: keep `federation: 'none'` as the enforced constant, gate the ungated paths
(webfinger, instance metadata, relays, nodeinfo protocol list, queue enqueue), hide/remove the frontend surfaces,
and only *then* consider deleting AP code. Deleting first risks breaking the local paths in §2.

## 3. Local social features that must be preserved (regression contract)

Notes (create/delete/renote/reply/quote, visibility incl. `specified`), reactions, polls, pins, follow /
follow-requests / approvals, block / mute / renote-mute / thread-mute, home & local timelines (SQL and Redis
fan-out), antennas, channels, clips, lists, drive (upload, upload-from-url, thumbnails, FFmpeg video processing),
notifications (mention/reply/follow/reaction/login), streaming (WebSocket `main`, `homeTimeline`,
`localTimeline`, channel), chat, pages/flash/gallery, account export/import, moderation (reports, roles, suspension,
moderation log), announcements, achievements, OAuth / MiAuth / app tokens, 2FA / passkeys, email flows.

## 4. Frontend areas requiring AMIXOF rebranding (inventory, no changes made)

| Area | Evidence |
| --- | --- |
| Locale strings | `locales/ja-JP.yml`: 45 lines contain "Misskey" (`headlineMisskey`, `introMisskey`, `poweredByMisskeyDescription`, `aboutMisskey`, `misskeyUpdated`, `didYouLikeMisskey`, `pleaseDonate`, `goToMisskey`, `_aboutMisskey.*`, `_achievements.iLoveMisskey`, `_serverSetupWizard.*`). Only `ja-JP.yml` may be edited; other locales flow from Crowdin, so AMIXOF needs its own translation strategy |
| Frontend code | ≈79 user-visible hits: `pages/about-misskey.vue` (634 lines), `navbar.ts:144` ("Misskey Games"), `MkPreview.vue:68`, `MkDonation.vue`, `MkSourceCodeAvailablePopup.vue`; ≈101 links to `misskey-hub.net` / `github.com/misskey-dev/misskey` |
| Assets | `packages/frontend/assets/{misskey.svg,about-icon.png,fedi.jpg}`, `packages/backend/assets/{mi-white.png,favicon.*,apple-touch-icon.png,splash.png,icons/}` |
| Backend defaults | `models/Meta.ts:388-400` (`repositoryUrl`, `feedbackUrl`), `NodeinfoServerService.ts:21` (`nodeinfo_homepage`), `OAuth2ProviderService.ts:529`, `api/openapi/gen-spec.ts:22`, `server/web/manifest.json` (PWA name), `FeedService.ts:70` (`generator`), `ClientServerService.ts:423-880` (`meta.name ?? 'Misskey'`) |
| Server-rendered views | `server/web/views/*.tsx` (21 hits in 9 files: `base`, `base-embed`, `bios`, `cli`, `error`, `flush`, `info-card`, `reversi-game`) |
| Email | `core/EmailService.ts:45` logo; sender name = `meta.name` |
| Service worker | `packages/sw/src/scripts/create-notification.ts:299` (`Misskey v…`) |
| Embed / shared | `packages/frontend-embed/src` (104 hits, many are `misskey-js` type uses), `packages/frontend-shared` (19) |
| Attribution | about page must keep "based on Misskey" + AGPL source link and add Twemoji CC-BY credit (see `AGPL_COMPLIANCE.md`) |

## 5. Tests to establish before federation removal

Existing coverage to keep green (baseline recorded in `PHASE_1_COMPLETION.md`):
* e2e local features: `test/e2e/{note,timelines,streaming,users,user-notes,follow-approval,block,mute,renote-mute,thread-mute,note-notify,drive,antennas,channel,clips,ff-visibility,api-visibility,exports,endpoints,move}.ts`, `synalio/*`.
* Unit: `NoteCreateService`, `ReactionService`, `UserFollowingService`, `DriveService`, `entities/UserEntityService`, `FileServerService` (FFmpeg paths).
* Federation (to be converted into "federation is off" assertions): `test/e2e/{fetch-resource,fetch-validate-ap-deny,well-known,nodeinfo}.ts`, unit `activitypub`, `ap-request`, `ApMfmService`, `FetchInstanceMetadataService`, `RelayService`; the Docker two-server suite `packages/backend/test-federation/**` (≈2.9k LOC) will no longer apply.

New tests to add **before** touching federation code:
1. "Federation is off" contract: `/inbox`, `/users/:id` (AP accept), `/.well-known/webfinger`, `/nodeinfo/2.1`
   return 403/404 and `protocols` no longer lists `activitypub`.
2. Outbound guard: creating a note that mentions `@user@remote.example` does **not** perform a webfinger request
   (mock `HttpRequestService`), and `QueueService.deliver` is not enqueued.
3. Local-only regression for `i/update`, `i/move` (decide behaviour), `users/show` with `host`.
4. `timelines.ts` creates fake remote users through `signup({ host })` (allowed only in `NODE_ENV=test`,
   `SignupApiService.ts:116`) plus `FORCE_FOLLOW_REMOTE_USER_FOR_TESTING` – these tests need rewriting when
   remote users disappear.
5. Frontend Playwright smoke (`packages/frontend/test/e2e/{basic,router}.spec.ts`) extended to the rebranded
   about page and the absence of federation navigation entries.

## 6. Database migration risks

* Federation-only tables: `instance` (22 columns), `relay`, `user_publickey`, `user_keypair`, chart tables
  `__chart__{federation,ap_request,instance}`, system accounts `actor`/`relay`.
* Federation-only columns on mixed tables: `user.{host,inbox,sharedInbox,featured,uri,followersUri,lastFetchedAt,movedToUri,alsoKnownAs}`,
  `note.{uri,url,mentionedRemoteUsers,userHost,replyUserHost,renoteUserHost}`,
  `following`/`follow_request` `{follower,followee}{Host,Inbox,SharedInbox}` + `requestId`,
  `drive_file.{userHost,uri,src,isLink}`, `emoji.{host,uri}`, `poll.userHost`, `user_profile.userHost`,
  `chat_message.uri`, `abuse_user_report.{targetUserHost,reporterHost,forwarded}`, and ≈16 `meta` columns.
* **Recommendation: do not drop columns in Phase 2.** `host IS NULL` is the universal "local" predicate
  (`isLocalUser`, LTL SQL, Redis routing, unique index `usernameLower + host`). Dropping it breaks local features.
  Any schema change must be a *new* migration with `up()`/`down()` and pass `pnpm --filter backend check-migrations`;
  the 349 upstream migrations must stay untouched to keep upstream merges possible.
* Purge of existing remote rows (none in a fresh AMIXOF DB) can use the existing clean jobs.

## 7. Outstanding Phase 1 blockers

None of these blocks starting Phase 2 work; they block a public launch (see `PHASE_1_COMPLETION.md` §11):
CSP enforcement, `ip-address` advisory, Twemoji attribution, `repositoryUrl`/AGPL source offer and legal review, and
the unobserved full devcontainer rebuild. **The federation baseline is now recorded** (93 passed, 13 skipped, 0 failed;
`docs/audit/FEDERATION_BASELINE.md`), so the earlier precondition is met.

## 8. Design input for Phase 2 (from the product owner, not yet implemented)

Premium editorial look, coral-red gradients (`#FF5058` coral, `#E53940` red, `#C62832` deep red, `#FF8B91` pink,
`#48232C` burgundy), layered neutral surfaces, subtle glows, coordinated light/dark themes. Implement it through
Misskey's theme system (`packages/frontend-shared/themes/*.json5` and CSS variables), not by copying WordPress/PeepSo
selectors from the design notes. Recommended order: design tokens and two built-in themes, brand assets, then
components in controlled batches.
