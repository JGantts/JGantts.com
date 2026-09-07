# Published Revisions Roadmap

## Goal

Give Mastodon and other unfurling clients a new URL whenever a published post
or its photos change, while keeping the first published URL clean and making
older revision URLs permanently redirect to the current published revision.

## URL contract

For a post whose current slug is `example`:

- One published revision: `/photos/example`
- More than one published revision: `/photos/example?rev=N`
- An old revision URL: `/photos/example?rev=N-1` → permanent redirect (`308`)
  to `/photos/example?rev=N`
- The same rules apply to every public image URL, including originals,
  derivatives, responsive renditions, and placeholders.

The revision query parameter must be generated from published revisions only.
Saving a draft must not change public URLs. Query parameters unrelated to
`rev` should not cause a redirect.

## Revision model

1. Keep the existing immutable `post_revisions` records as the source of truth.
2. Distinguish revisions saved while a post is draft from revisions that were
   published.
3. Treat publication of an edited post, photo metadata, hero selection, photo
   order, photo addition, and photo removal as a new published revision.
4. Store enough information to reconstruct the published photo set for each
   revision: image identity, order, hero selection, alt text, caption, focal
   point, and public rendition references.
5. Provide repository/service methods for:
   - current published revision
   - published revision count
   - published revision history
   - the photo set belonging to a selected published revision

## Public server work

- Centralize post and media URL construction so every consumer applies the
  same clean-versus-versioned rule.
- Add `308` handling for stale post URLs and image URLs.
- Preserve current-slug and prior-slug redirects without redirect loops.
- Use the revisioned URL in Mastodon publication and edit payloads.
- Use revisioned URLs in server-rendered canonical metadata, Open Graph data,
  JSON-LD, Atom, sitemap image locations, and frontend canonical metadata.
- Keep the first published URL backward-compatible and revisionless.

## Admin history

Add a history view to the post editor for both writing and photos. Each entry
should show:

- published revision number and timestamp
- title, slug, and a link to the exact public revision URL
- the published photo list and order
- hero photo
- photo metadata changes, including alt text and captions
- Mastodon publication state, remote URL/status, and publication revision

The admin API should expose one history response for a post, with published
revision snapshots and associated Mastodon syndications. Draft-only saves and
failed unpublished attempts should not appear as published history entries.

## Tests

Add coverage for:

- first publication returns clean post and image URLs
- draft edits leave clean URLs unchanged
- second publication adds `?rev=2` to the post and all image URLs
- later photo edits advance the published revision
- old post and image revisions return `308` to the current revision
- current revision returns `200`
- invalid or unrelated query parameters do not create redirect loops
- prior slugs still redirect to the current slug and revision
- Mastodon publication uses the correct revisioned URL
- admin history includes post and photo snapshots in publication order
- admin history excludes draft-only revisions
- feeds, sitemap, SSR metadata, and frontend metadata use the same URL rule

## Delivery order

1. Define and test the published-revision/photo-snapshot data model.
2. Add repository and service history queries.
3. Centralize URL generation and update post/media routes.
4. Update Mastodon, discovery documents, SSR, and frontend metadata.
5. Add the admin API history response.
6. Add the admin history UI for posts and photos.
7. Replace old revisionless expectations and run the full server/frontend check.

## Completion criteria

The first published version remains shareable at its clean URL. Every later
published change has a distinct post and image URL, old revision URLs redirect
permanently to the current version, and an administrator can inspect exactly
what was published and where it was syndicated.

## Implementation status

Share-preview cache identity is specified separately in
`PREVIEW-URL-ROADMAP.md`. That companion roadmap keeps the numeric published
revision model here stable while replacing deployment-derived `build` URLs with
content-derived `preview` tokens.

Completed:

- Published-only revision counting with clean first-publication URLs.
- Revisioned post and image URLs for later published changes.
- Permanent redirects for stale post and image revisions.
- Revision propagation through SSR, frontend links, API responses, feeds,
  sitemap, and Mastodon publication/edit URLs.
- Immutable post/photo snapshots and durable Mastodon publication history.
- Admin history API and editor history view with photo metadata and thumbnails.
- Migration, integration, persistence, syndication, typecheck, and build
  coverage.

Deferred by design:

- Public visitors cannot browse historical revision snapshots directly;
  historical public URLs permanently redirect to the current revision per the
  URL contract. Administrators can inspect historical snapshots in the editor.
