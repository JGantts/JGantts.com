# Mastodon comments

**Responsibility:** read replies to a post's published Mastodon status and return bounded, sanitized comment data with cache availability information.

**Entry points:** `MastodonCommentsService.getForPost`; `GET /api/posts/:slug/comments/mastodon` first requires a published local post.

**Dependencies:** [syndication records/client](syndication/destinations.md), `CommentCacheRepository`, SQLite, HTML sanitization, and logging.

**Consumers:** [photo browsing and comments panel](../website/photos.md); other comment displays can use the same response contract.

**Invariants:** cached payloads must match the current remote root status. Fetch failure may return matching stale data, not replies from a different root. `not_syndicated`, `unavailable`, and `available` are distinct states. Remote HTML and URLs are sanitized; normalized parent IDs preserve threading and flag orphaned replies. This subsystem reads remote replies; it does not create local comments or publish replies.

**Source:** [comments service, cache repository, and types](../../../jgantts-server/src/comments), [API route](../../../jgantts-server/src/api/router.ts), [tests](../../../jgantts-server/test/comments.test.ts).

[Server map](index.md)
