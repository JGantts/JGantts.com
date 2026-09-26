# Photo browsing

**Responsibility:** turn site-owned posts into a selectable photo gallery with a comments panel and shareable URLs.

**Entry points:** `/photos/:postId?` mounts `IndexView.vue`; despite the parameter name, deep links resolve a post slug. `/posts` mounts `PostsIndexView.vue` as a separate listing.

**Dependencies:** `GET /api/posts`, `GET /api/posts/:slug`, [Mastodon comments](../server/comments.md), shared post types/URL helpers, and [image presentation](images.md).

**Consumers:** public readers and links emitted by [site metadata](../server/site.md) and syndication.

**Invariants:** selection preserves gallery scroll; initial deep links position after asynchronous layout. Local media and remote comments are adapted to `photo-comments-types.ts`. Load-more follows API cursors in 50-post pages and deduplicates posts. Absent deep links are fetched separately; text-only posts render through `PostView.vue`. Share controls preserve API revision/preview tokens. [Post metadata](post-metadata.md) follows the selected post.

**Source:** [photo view and panel](../../../jgantts-com/src/views/photos), [post contracts and URL helpers](../../../jgantts-com/src/posts), [post listing](../../../jgantts-com/src/views/posts/PostsIndexView.vue).

[Website map](index.md)
