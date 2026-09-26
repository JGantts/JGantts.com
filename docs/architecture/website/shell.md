# Shell and routes

**Responsibility:** mount Vue, apply global styles/theme, and select page layouts.

**Entry points:** `main.ts` mounts `App.vue`; Vue Router uses browser history. Routes cover `/`, `/holmes` and `/holmes/tips`, `/dev`, `/photos/:postId?`, `/posts`, `/admin/posts`, and `/kovyalo` variants.

**Dependencies:** Vue Router, shared CSS/fonts, layouts, and lazy-loaded feature views. Production navigation relies on [server HTML delivery](../server/site.md).

**Consumers:** every browser feature. `BuildInfo.vue` reads `/api/build` for release identity.

**Invariants:** client navigation updates document metadata; initial crawler metadata comes from the server. `/posts/:slug` redirects to `/photos/:slug`. The gallery embeds `PostView.vue` for text-only posts; `PhotosLayout.vue` is unused. Article routes defer [metadata](post-metadata.md) to the post view; other routes clear article metadata.

**Source:** [router](../../../jgantts-com/src/router/index.ts), [bootstrap](../../../jgantts-com/src/main.ts), [App](../../../jgantts-com/src/App.vue), [layouts](../../../jgantts-com/src/layouts), [standalone views](../../../jgantts-com/src/views), [styles](../../../jgantts-com/src/assets/main.css).

[Website map](index.md)
