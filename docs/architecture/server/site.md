# HTML, discovery, and post URLs

**Responsibility:** inject initial metadata and canonical post content into built HTML, and expose Atom/sitemap discovery.

**Entry points:** `renderAppHtml`, `renderCanonicalPostHtml`, `renderAtomFeed`, `renderSitemap`, `revisionedPostPath`, and `/photos/:slug` in `app.ts`.

**Dependencies:** the Vite HTML template, posts, media, [social previews](previews.md), and configured site origin. This is server template rendering, not Vue server-side rendering.

**Consumers:** browsers before Vue mounts, crawlers, feed readers, and syndicated links.

**Invariants:** `/photos/:slug` is canonical; `/posts/:slug` redirects. Draft/missing posts return 404, archived posts 410. Old slugs and outdated revisions redirect to current content; revision queries do not serve historical snapshots. Multiple published revisions enable revisioned canonical URLs. Share URLs add a preview fingerprint; stale preview/build queries redirect. Browser route metadata and server metadata must agree. HTML is revalidated while immutable assets have longer caching.

**Source:** [site modules](../../../jgantts-server/src/site), [HTTP ordering](../../../jgantts-server/src/app.ts), [client metadata](../../../jgantts-com/src/router/index.ts), [post URL helpers](../../../jgantts-com/src/posts/post-url.ts).

[Server map](index.md)
