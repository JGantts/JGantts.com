# Photo browsing

**Responsibility:** turn site-owned posts into a selectable photo gallery with a comments panel and shareable URLs.

**Entry points:** `/photos/:postId?` mounts `IndexView.vue`; despite the parameter name, deep links resolve a post slug. `/posts` mounts `PostsIndexView.vue` as a separate listing.

**Dependencies:** `GET /api/posts` cursor pagination, `GET /api/posts/:slug`, [Mastodon comments](../server/comments.md), shared post types/URL helpers, and [image presentation](images.md).

**Consumers:** public readers and links emitted by [site metadata](../server/site.md) and syndication.

**Invariants:** selection changes the URL without resetting gallery scroll; initial deep links position after asynchronous layout. Comment availability and stale responses are distinct states. Local post/media data and remote comment attachments have different shapes and are adapted through `photo-comments-types.ts`.

**Source:** [photo view and panel](../../../jgantts-com/src/views/photos), [post contracts and URL helpers](../../../jgantts-com/src/posts), [post listing](../../../jgantts-com/src/views/posts/PostsIndexView.vue).

[Website map](index.md)
