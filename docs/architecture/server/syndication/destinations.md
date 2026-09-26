# Syndication destinations

**Responsibility:** turn an explicit author request into a Mastodon status for a local published post.

**Entry points:** `MastodonSyndicationService` and `/api/admin/posts/:id/syndications/mastodon` routes, including explicit edit/retry operations.

**Dependencies:** posts/revisions, preview-aware site URLs, media/social previews, configured provider credentials, and the [outbox repository](outbox.md). Provider clients encapsulate remote HTTP APIs.

**Consumers:** the Mastodon editor, administrative API clients, worker, publication history, and Mastodon comments.

**Invariants:** payloads derive from site content; publication is explicit. One publication record is reused per post/destination; later local revisions do not create another publication. Mastodon supports explicit edits. Facebook syndication is retired; historical records remain inert and are excluded from active publication history. Provider configuration gates availability; local posts remain authoritative.

**Source:** [destination services, clients, and types](../../../../jgantts-server/src/syndication), [admin routes](../../../../jgantts-server/src/api/admin-posts.ts), [configuration](../../../../jgantts-server/src/config.ts), [syndication tests](../../../../jgantts-server/test/syndication.test.ts).

[Syndication map](index.md)
