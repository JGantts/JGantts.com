# Post metadata

**Responsibility:** keep browser article metadata consistent with server previews and revision-aware URLs.

**Entry points:** `updatePostDocumentMeta(post)` runs after gallery selection or article loading. `applyRouteDocumentMeta` restores ordinary page metadata when leaving a post.

**Dependencies:** public post `previewMeta`, canonical/share URL helpers, and the [server preview resolver](../server/site.md). Older API responses use a media-based fallback.

**Consumers:** gallery and text-only article views, browser titles, canonical links, Open Graph/Twitter tags, and JSON-LD readers.

**Invariants:** the router preserves initial server metadata until post data arrives. Canonicals retain revision tokens; share/Open Graph URLs retain preview tokens. Generated collage metadata comes from the API rather than being inferred from hero media. Leaving an article removes its structured data and article-specific tags.

**Source:** [post metadata](../../../jgantts-com/src/posts/document-meta.ts), [route metadata](../../../jgantts-com/src/router/document-meta.ts), [post view](../../../jgantts-com/src/views/posts/PostView.vue).

[Website map](index.md)
