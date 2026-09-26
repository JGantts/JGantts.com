# Syndication destinations

**Responsibility:** turn an explicit author request into a Mastodon status or Facebook Page link publication for a local published post.

**Entry points:** Mastodon/Facebook syndication services and `/api/admin/posts/:id/syndications/{destination}` routes; Mastodon edit/retry and Facebook retry/reconcile/resolve operations.

**Dependencies:** posts/revisions, preview-aware site URLs, media/social previews, configured provider credentials, and the [outbox repository](outbox.md). Provider clients encapsulate remote HTTP APIs.

**Consumers:** authoring/API clients, the worker, publication history, and Mastodon comments.

**Invariants:** payloads derive from site content; publication is explicit. Records track destination and revision. Mastodon requests use idempotency keys. An uncertain Facebook response requires reconciliation/resolution rather than blind republishing, because the remote post may already exist. Provider configuration gates availability; local posts remain authoritative.

**Source:** [destination services, clients, and types](../../../../jgantts-server/src/syndication), [admin routes](../../../../jgantts-server/src/api/admin-posts.ts), [configuration](../../../../jgantts-server/src/config.ts), [syndication tests](../../../../jgantts-server/test/syndication.test.ts).

[Syndication map](index.md)
