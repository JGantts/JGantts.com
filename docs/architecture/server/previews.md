# Social-preview images

**Responsibility:** generate deterministic photo collages for external link previews and report whether the stored image matches current content.

**Entry points:** `SocialPreviewService.status`, `generate`, `generateAll`, and `getFile`; admin preview-generation routes and `social-previews:regenerate`. Public files use `/media/social/:postId/:fingerprint.jpg`.

**Dependencies:** post/media repositories, Sharp, layout calculations, and [persistent media storage](persistence.md).

**Consumers:** the publication route, authoring preview controls, [site metadata](site.md), and outbound syndication URL construction.

**Invariants:** selection uses ready media, with the effective hero first. Fingerprints include rendering inputs/version so immutable image URLs identify generated content. Concurrent generation for a post shares work. Site preview resolution can fall back to photo media when a collage is unavailable; preview tokens are cache identities, not draft-access credentials.

**Source:** [service, layout, repository, and types](../../../jgantts-server/src/social-preview), [preview resolver](../../../jgantts-server/src/site/post-preview.ts), [regeneration CLI](../../../jgantts-server/src/cli/regenerate-social-previews.ts), [tests](../../../jgantts-server/test/social-preview.test.ts).

[Server map](index.md)
