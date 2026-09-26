# Posts and revisions

**Responsibility:** validate author input, sanitize Markdown, manage draft/published/archived state, and retain revision and slug history.

**Entry points:** `PostService` authoring, autosave, lifecycle, and published-list methods; `/api/posts` reads and `/api/admin/posts` mutations/history.

**Dependencies:** `PostRepository`, [SQLite](persistence.md), `marked` and `sanitize-html`. Admin responses also assemble media, preview, and syndication information.

**Consumers:** [authoring](../website/authoring.md), [photo browsing](../website/photos.md), HTML/feed generation, media ownership, and syndication.

**Invariants:** public reads expose published posts only. Draft autosave neither generates slugs nor records revisions; explicit saves use revision recording. Revision-recording updates snapshot media and retain old slugs, with a [slug-reuse defect](../../reviews/2026-09-26-architecture-review.md). Pagination orders by publication timestamp then ID. Editorial date/time fields are separate from publication timestamps. Publication and outbound syndication are separate actions; archived posts cannot directly publish.

**Source:** [post services, repository, types, and Markdown renderer](../../../jgantts-server/src/posts), [admin routes](../../../jgantts-server/src/api/admin-posts.ts), [public routes](../../../jgantts-server/src/api/router.ts). See [site URLs](site.md) for revision redirects.

[Server map](index.md)
