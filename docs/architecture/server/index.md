# Content server map

`server.ts` composes repositories and services; `createApp` injects them into Express.
The browser reads public APIs and uses authenticated authoring endpoints.

- [Runtime and HTTP](http.md): startup, route boundaries, authentication.
- [Persistence](persistence.md): SQLite, migrations, and persistent files.
- [Posts](posts.md): authoring rules, publication, revisions, and slugs.
- [Media](media.md): uploads, renditions, and file delivery.
- [Social previews](previews.md): generated share images.
- [Site delivery](site.md): HTML, canonical URLs, feeds, and metadata.
- [Syndication](syndication/index.md): explicit outbound publication and durable jobs.
- [Comments](comments.md): cached inbound Mastodon replies.
- [Observability](observability.md): health, logs, and running build identity.

Related: [website](../website/index.md), [operations](../operations/index.md), [root map](../../../AGENTS.md).
