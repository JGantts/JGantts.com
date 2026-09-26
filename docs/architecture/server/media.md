# Photo media

**Responsibility:** retain uploaded originals, generate browser renditions/placeholders, manage ordering/hero metadata, and resolve media files.

**Entry points:** `MediaService.uploadImage`, `uploadBatch`, regeneration, metadata/order/hero operations; `/api/admin/media`, post media routes, `/media/:id/:variant`, and `media:regenerate`.

**Dependencies:** media/post repositories, [persistent storage](persistence.md), Sharp, HEIC conversion, and ThumbHash.

**Consumers:** [image presentation](../website/images.md), authoring, social-preview generation, HTML/feed images.

**Invariants:** originals remain downloadable; HEIC input gets browser-compatible renditions. Generation stages files before promotion and publishes rendition manifests. Paths must resolve inside the media root. Uploads do not publish posts; valid batch envelopes return ordered per-file successes/failures, so retry only failures. File delivery is ID/variant-based and does not check post publication status; draft visibility is not media access control. Versioned variants and revision redirects support long-lived caching.

**Source:** [media modules](../../../jgantts-server/src/media), [upload router](../../../jgantts-server/src/api/admin-media.ts), [delivery router](../../../jgantts-server/src/api/media.ts), [regeneration CLI](../../../jgantts-server/src/cli/regenerate-media.ts). Exact upload limits: [server README](../../../jgantts-server/README.md).

[Server map](index.md)
