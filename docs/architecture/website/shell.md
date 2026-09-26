# Shell and routes

**Responsibility:** mount Vue, apply global styles/theme, and select page layouts.

**Entry points:** `main.ts` mounts `App.vue`; Vue Router uses browser history. Routes cover `/`, `/holmes` (including `/tips`), `/dev`, `/photos/:postId?`, `/posts`, `/admin/posts`, and `/kovyalo` variants.

**Dependencies:** Vue Router, shared CSS/fonts, layouts, and lazy-loaded feature views. Production navigation relies on [server HTML delivery](../server/site.md).

**Consumers:** every browser feature. `BuildInfo.vue` reads `/api/build` for release identity.

**Invariants:** client navigation updates document metadata; initial crawler metadata comes from the server. `/posts/:slug` redirects to `/photos/:slug`. Route names, rather than leftover view files, determine active pages: `PostView.vue` and `PhotosLayout.vue` are not wired into the current router.

**Source:** [router](../../../jgantts-com/src/router/index.ts), [bootstrap](../../../jgantts-com/src/main.ts), [App](../../../jgantts-com/src/App.vue), [layouts](../../../jgantts-com/src/layouts), [standalone views](../../../jgantts-com/src/views), [styles](../../../jgantts-com/src/assets/main.css).

[Website map](index.md)
