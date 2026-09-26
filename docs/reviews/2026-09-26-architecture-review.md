# Architecture and code review — 2026-09-26

Reviewed commit `b451ad7`. Documentation corrections accompany this report; application code is unchanged. P1 means fix promptly; P2 means a normal-priority defect. These are source-level findings reproduced locally, not observations of production incidents.

## Findings

1. **P1 — Crash recovery can duplicate Facebook posts.** [claimNext](../../jgantts-server/src/syndication/syndication-repository.ts#L213) reclaims every stale processing job, including `facebook.publish_link`. If Facebook accepted the post before the process died without recording completion, the next worker publishes it again. The Facebook client has no idempotency key. Reproduction: queue/claim a Facebook job, then claim six minutes later; the same publication is returned for execution. Route abandoned Facebook requests into uncertainty/reconciliation instead of automatic replay.

2. **P1 — Text-only posts disappear after Vue mounts.** [Gallery loading](../../jgantts-com/src/views/photos/IndexView.vue#L291) removes every post with no media, including the requested post. Both canonical `/photos/:slug` links and legacy `/posts/:slug` redirects land here. The server-rendered article is replaced by a gallery that cannot display the content. A component probe with a published text-only post produced neither its content nor an error. Preserve a text-capable post renderer for this route.

3. **P2 — Terminal Facebook failures cannot be retried.** [fail](../../jgantts-server/src/syndication/syndication-repository.ts#L271) sets the syndication to `failed` only for Mastodon publication. A permanent Facebook error leaves the syndication `pending` while its job is `failed`; manual retry returns 409 and queueing again returns the stuck record. Reproduced with a fake Facebook permission error. Apply publication failure transitions to both destinations while preserving the separate edit behavior.

4. **P2 — Reconciled Facebook retries search for a Mastodon job.** [retry](../../jgantts-server/src/syndication/syndication-repository.ts#L298) allows an uncertain Facebook record after a zero-match reconciliation, then hard-codes `mastodon.publish_status` in the job lookup. Reproduced `markUncertain` → `markNoMatch` → `retry`: it throws “The failed syndication has no publication job,” becoming an HTTP 500. Select the publication kind by destination.

5. **P2 — A no-change map build fails.** [make_temp_out_dir](../../python/make_all_tiles.py#L71) returns from inside `TemporaryDirectory`, deleting the directory before its callers use it. Dirty builds recreate it incidentally; when all hashes match, nothing recreates it and the final `copytree` raises `FileNotFoundError`. Reproduced through `main` with a temporary region fixture, matching hashes, and external tools stubbed. Keep the temporary-directory lifetime around the entire build/copy operation.

6. **P2 — Reusing an old slug breaks the next rename.** [PostRepository.update](../../jgantts-server/src/posts/post-repository.ts#L179) always inserts the previous slug into a uniquely keyed redirect table. The allowed sequence `a → b → a → c` tries to insert `a` twice and rolls back with `SQLITE_CONSTRAINT_PRIMARYKEY`. Reproduced against an in-memory database through `PostService.updateFromAuthor`. Make redirect reuse safe while retaining ownership checks across posts.

7. **P2 — Share controls bypass revision/preview URLs.** [photoShareUrl](../../jgantts-com/src/views/photos/IndexView.vue#L88) reconstructs `/photos/:slug` instead of using the API's `shareUrl`. Copy, QR, email, and social links therefore lose `rev` and `preview`, defeating the cache-refresh scheme when content changes. A mounted component given `?rev=4&preview=abc123` produced a Facebook share target with no query. Use the shared post URL helper consistently.

8. **P2 — Client routing destroys canonical post metadata.** [router.afterEach](../../jgantts-com/src/router/index.ts#L310) replaces the title/Open Graph metadata with generic route values, drops revision queries from the canonical URL, and removes article metadata/JSON-LD. The active gallery does not restore it; the restoration logic lives in the unrouted `PostView.vue`. A router probe confirmed all these changes on `/photos/review?rev=4&preview=abc123`. Preserve or refresh post-specific metadata on the active route.

9. **P2 — The gallery silently stops at the first 50 posts.** [Initial fetch](../../jgantts-com/src/views/photos/IndexView.vue#L282) ignores `nextCursor` and has no pagination control or follow-up loading. Older photos disappear from gallery browsing; only an explicit deep link fetches one additional post. Text-only entries also consume the initial 50 slots before filtering. A component probe supplied a non-null cursor and observed just one list request. Follow the cursor or provide a load-more action, as `/posts` already does.

## Documentation corrections

- Clarified `/holmes/tips`, the map builder's required working directory, same-editor autosave merging, and API-only Facebook support.
- Distinguished public API pagination from the gallery's actual loading behavior, and server metadata from the current client overwrite behavior.
- Documented one publication record per post/destination and linked recovery limitations rather than implying verified Facebook recovery.
- Updated the operator guide's storage layout, image formats, authentication/cookie lifetime, generated teaser contract, missing Facebook UI, and database/media backup consistency requirements.
- Kept architecture leaves short; source links and all required component fields remain present.

## Validation and limits

- Server `npm run check`: 81 tests passed, including type checking.
- Frontend `npm test`: 37 tests passed; `npm run build` passed.
- Playwright: 8 tests passed. The frontend-only harness logged expected `/api/build` proxy failures because it mocks content APIs without starting Express.
- Server `npm run smoke:local`: build and compiled-server smoke test passed.
- Additional isolated probes reproduced four repository/worker cases, four frontend cases, and the Python no-change build failure. Temporary component tests were removed rather than retaining tests that assert defective behavior.
- No remote publication, production deployment, credential use, or full GDAL map build was performed. Linux host scripts were inspected, not executed against a host. This is a focused review of documented boundaries and their main data flows, not an exhaustive audit of every component.
