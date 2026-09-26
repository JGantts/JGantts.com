# Private authoring

**Responsibility:** edit post text and photo metadata, order/select hero media, recover drafts, and explicitly publish or syndicate.

**Entry points:** `/admin/posts` → `PostsAdminView.vue`; `adminRequest` and session helpers wrap `/api/admin` calls.

**Dependencies:** [admin authentication](../server/http.md), [posts](../server/posts.md), [media](../server/media.md), [social previews](../server/previews.md), and [syndication](../server/syndication/index.md).

**Consumers:** the site author; saved content feeds public browsing.

**Invariants:** versioned localStorage drafts are keyed by post ID and retain the server timestamp for recovery. Draft autosave preserves concurrent browser edits and is separate from explicit saves of published content. Uploading and saving do not imply publication; site publication does not imply social publication. The session token is exchanged for an HttpOnly cookie, not persisted by draft storage.

**Source:** [editor](../../../jgantts-com/src/views/admin/PostsAdminView.vue), [API, draft storage, authoring and hero helpers](../../../jgantts-com/src/admin), [editorial date/time contracts](../../../jgantts-com/src/posts/editorial-date-time.ts). Tests are colocated with these modules.

[Website map](index.md)
