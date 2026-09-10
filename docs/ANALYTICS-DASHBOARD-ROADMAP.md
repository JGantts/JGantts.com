# Private Analytics Dashboard Roadmap

Last updated: 2026-09-09

## Objective

Give the site owner a small, trustworthy picture of how published work is being
found and read, without adding third-party analytics, advertising identifiers,
cross-site tracking, visitor profiles, or a cookie banner.

The dashboard answers editorial questions:

- Which posts and photo essays are being read?
- Is readership growing, steady, or falling over time?
- Which referring sites send readers to JGantts.com?
- Which published work is receiving attention after being shared or syndicated?

It does **not** try to identify readers, measure people, or optimize for
engagement at the expense of privacy. The primary metric is page views, not
"unique visitors."

## Current state

- Status: In progress — aggregate-only schema, configuration guard, and privacy
  normalization helpers are implemented locally.
- Active item: 2.2 — add the client-side page-view beacon after the server-side
  privacy boundary is complete.
- Existing foundation: the server already emits structured request logs without
  query strings, request bodies, cookies, credentials, or tokens. SQLite is the
  canonical persistent store and the private admin application already has
  authenticated routes.
- Scope decision: this is a first-party, aggregate-only system. It must not
  import data from Google Analytics, Meta, Mastodon, or any ad/analytics vendor.

## Product contract

### Dashboard v1

The authenticated admin dashboard provides a selectable range (7, 30, 90 days,
or a custom UTC date range) and shows:

1. **Overview**: total page views, views of published posts, and the change
   relative to the immediately preceding comparable period. These are page-view
   counts, never unique-person estimates.
2. **Trend**: daily total and published-post views, with clearly labelled zero
   data rather than interpolated values.
3. **Top content**: published posts ordered by views, including title/fallback
   label, canonical URL, publication date, and selected-period count. A row
   opens the canonical post or its editor.
4. **Referrals**: referrer domains ordered by views, with `Direct / unknown`
   and `Internal navigation` represented explicitly. The dashboard never shows
   full referrer paths or query strings.
5. **Per-post detail**: a time series, total views, and referrer-domain breakdown
   for one selected published post.
6. **Data controls**: the current retention policy, most recent recorded day,
   CSV export for the currently selected aggregate view, and a destructive
   delete-all-analytics control with an explicit confirmation.

The normal public site remains fully usable if analytics collection or the
dashboard is unavailable.

### Not included in v1

- Unique visitors, sessions, fingerprints, cookies, local-storage identifiers,
  IP addresses, raw user-agent strings, or geolocation.
- Cross-site tracking, ad conversion pixels, audience profiles, heat maps, or
  replay recording.
- Click, scroll, dwell-time, or media-download tracking.
- Query-string capture, search-keyword reporting, or raw request-log ingestion.
- Mastodon/Facebook engagement, follower counts, reaction counts, or analytics
  API imports.
- Public analytics pages or author accounts beyond the existing private admin.

These exclusions are intentional. A future feature needs a separate decision
record before it adds any new kind of reader data.

## Privacy and data model

### Collection rules

1. The Vue client sends one first-party page-view beacon for the initial route
   and each completed client-side navigation. It sends only a canonical route
   classification, not the browser URL's query string or fragment.
2. The server validates that the beacon is same-origin, resolves the supplied
   route to a supported public route, and derives any post ID itself. It rejects
   admin, API, media, unknown, draft, archived, and malformed routes.
3. The server examines the HTTP `Referer` only long enough to reduce it to an
   origin hostname. It stores no path, query, fragment, or raw header. Missing
   referrers become `direct`; the site origin becomes `internal`.
4. Respect `DNT: 1` and Global Privacy Control: accept no analytics event and
   set no identifier. Collection must also be easy to disable globally through
   server configuration.
5. Do not set analytics cookies or write analytics data to browser storage.
   No IP address, raw user agent, request ID, or authorization state may enter
   an analytics table, event log, export, or error message.
6. Classify known automated requests in memory and discard them. The raw
   user-agent value is neither logged nor persisted. Bot filtering is best
   effort, and the UI labels all counts as estimates.
7. The public endpoint returns `204 No Content`, `Cache-Control: no-store`, and
   no cross-origin CORS permission. Invalid and ignored events return the same
   privacy-preserving response.

### Aggregate schema

Store daily UTC aggregate rows, not individual events. The exact migration may
vary, but the database needs the equivalent of:

```text
analytics_daily_views
  day_utc             YYYY-MM-DD
  route_kind          site | gallery | post | feed | sitemap
  post_id             nullable local post ID, never a slug supplied by client
  referrer_kind       direct | internal | external
  referrer_domain     nullable normalized hostname; null for direct/internal
  view_count          non-negative integer
  PRIMARY KEY (day_utc, route_kind, post_id, referrer_kind, referrer_domain)
```

- Normalize domains to lowercase hostnames, drop ports and `www.`, and reject
  invalid or overlong values.
- Use an atomic SQLite upsert to increment a row. A client request is never
  written as a raw event.
- Published post deletion/archive must not erase historical aggregate rows;
  post IDs remain resolvable as an unavailable/archived label in the dashboard.
- Retain daily aggregates for 24 months by default. A scheduled pruning command
  is idempotent, reports its planned deletion before acting, and can be disabled.
  The dashboard exposes the configured policy.

## Architecture

```text
Vue route completed
        |
        v
POST /api/analytics/page-view  -- same-origin, no IDs/cookies
        |
        v
validate + normalize + privacy filters
        |
        v
SQLite daily aggregate upsert
        |
        +--> authenticated /api/admin/analytics queries --> admin dashboard
```

Keep analytics separate from operational request logs. Request logging is for
debugging and health; analytics aggregates are for editorial reporting. Neither
should become a substitute for the other.

## Delivery plan

### Phase 1 — Contract and safe storage

- [x] **1.1** Add an `ANALYTICS_ENABLED` configuration flag, defaulting to off
  until the production migration and dashboard are ready. Document disablement
  and data-deletion behavior in `CONTENT-OPERATIONS.md`.
- [x] **1.2** Add the SQLite migration, repository, atomic increment operation,
  range queries, CSV serializer, retention-prune command, and delete-all method.
- [x] **1.3** Implement route and referrer normalization with strict maximum
  lengths and same-origin validation. Only server-resolved published local post
  IDs may be stored.
- [x] **1.4** Add privacy filters for DNT, GPC, disabled collection, malformed
  events, and best-effort bots. Ensure all ignored requests have an identical
  response shape.
- [x] **1.5** Unit-test aggregation, date boundaries, referrer reduction,
  invalid routes, privacy filters, retention dry run/apply, and complete delete.

Exit condition: the server can store and query only safe daily aggregates, and
no test can make a raw URL, IP, user agent, cookie, query value, or visitor ID
persist.

### Phase 2 — Collection endpoint and client instrumentation

- [x] **2.1** Add the no-store public beacon endpoint with a small, bounded JSON
  body and no authentication requirement. Rate-limit abusive traffic without
  persisting a visitor identity.
- [ ] **2.2** Add a small client analytics module invoked after initial route
  readiness and after successful Vue Router navigation. It sends route type and
  post slug only as an input for server-side validation; it never sends title,
  content, media metadata, referrer, full URL, or a generated ID.
- [ ] **2.3** Make the module a no-op when collection is disabled or browser
  privacy preference is set. A failed beacon must never affect navigation,
  rendering, or console-visible user errors.
- [ ] **2.4** Verify direct load, client navigation, browser back/forward,
  canonical post routes, legacy redirects, feed/sitemap exclusions or intended
  classifications, and offline/failing endpoint behavior.

Exit condition: ordinary public navigation produces one bounded aggregate
increment per completed page view without changing public-site behavior.

### Phase 3 — Admin reporting API

- [ ] **3.1** Add authenticated endpoints for overview, daily trend, top posts,
  per-post detail, referrers, CSV export, retention metadata, and delete-all.
- [ ] **3.2** Validate date ranges and page limits; cap range length and export
  size so reporting cannot exhaust SQLite or memory.
- [ ] **3.3** Return post titles/URLs only from the server's current or retained
  local content records; never trust client-supplied labels.
- [ ] **3.4** Add authorization, empty-state, archived/deleted-post, timezone,
  range-comparison, and export-escaping tests.

Exit condition: only an authenticated author can read or delete aggregates, and
all dashboard values are reproducible from stored daily rows.

### Phase 4 — Dashboard UI

- [ ] **4.1** Add an Analytics section to the existing private admin interface,
  without loading analytics code on public pages beyond the tiny beacon module.
- [ ] **4.2** Build the range selector, summary cards, accessible trend chart or
  table, top-content table, referral table, and useful empty/error/loading states.
- [ ] **4.3** Build post-detail drilldown and links to the canonical post/editor.
  Clearly label page views, UTC day boundaries, excluded privacy signals, and
  approximate bot filtering.
- [ ] **4.4** Add CSV download and delete-all confirmation that states exactly
  what is removed and that it cannot be reconstructed from the dashboard.
- [ ] **4.5** Test desktop/mobile layout, keyboard navigation, screen-reader
  labels, empty datasets, long titles/domains, failure/retry states, and charts
  with sparse dates.

Exit condition: the owner can answer the v1 editorial questions without needing
logs, SQL, or a third-party dashboard.

### Phase 5 — Operations and release

- [ ] **5.1** Add health reporting for migration status and aggregate-write
  failures without making analytics a core availability dependency.
- [ ] **5.2** Add structured operational events that report only counts and
  failure classes; audit the redaction guard against analytics fields.
- [ ] **5.3** Add analytics tables to backup/restore verification and prove that
  restore preserves aggregates without introducing raw request data.
- [ ] **5.4** Run the full server suite, frontend build, and browser-level
  collection/dashboard tests. Add coverage reporting and a CI threshold for the
  new analytics modules.
- [ ] **5.5** Deploy with collection disabled, migrate, inspect the dashboard,
  then enable collection. Check the first 24 hours for sensible aggregate
  counts, DNT/GPC handling, referrer normalization, and public-page performance.

Exit condition: analytics is private, reversible, observable, backed up, and
does not degrade publishing or reading.

## Success criteria

- The dashboard makes it easy to identify top posts and referring domains for a
  chosen period.
- No third-party script, network request, cookie, fingerprint, or visitor-level
  record is introduced.
- Public navigation still works when analytics is disabled, blocked, malformed,
  or unavailable.
- The owner can export or permanently delete all analytics aggregates.
- Tests prove the privacy boundary as rigorously as the reporting calculations.

## Deferred ideas

- A site search dashboard, if first-party search is later added; record only
  aggregate query categories after a separate privacy review.
- Optional manual annotation of a post as shared in a newsletter, Mastodon, or
  other campaign, so the author can compare dates without importing remote
  engagement data.
- A self-hosted, aggregate-only public counter for selected posts. This should
  remain off by default and requires a separate presentation decision.
