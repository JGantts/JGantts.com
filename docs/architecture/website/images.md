# Image presentation

**Responsibility:** arrange post clusters, select suitable image renditions, and present expanded images and comment attachments.

**Entry points:** `ClusteredPhotoMasonry.vue` accepts posts/selection and emits interaction events; `ResponsivePhoto.vue` accepts an attachment, display context, and width. `responsiveImagePlan` computes rendition choices; `MediaCarousel.vue` presents attachment collections.

**Dependencies:** [media manifests](../server/media.md), `masonry.ts`, device-pixel-ratio observation, ThumbHash placeholders, and browser size/visibility observers.

**Consumers:** [photo browsing](photos.md), its comments panel, and other carousel users.

**Invariants:** preserve aspect ratios and focal points; choose renditions using display size, pixel ratio, and data-saving preference. Remote attachments without local manifests retain fallback URLs. Exposure history influences gallery ordering but unavailable browser storage must remain tolerable. Lightbox and grid contexts have different image needs.

**Source:** [masonry and responsive components/helpers](../../../jgantts-com/src/views/photos), [carousel](../../../jgantts-com/src/components/MediaCarousel.vue). Colocated tests cover layout and rendition behavior; [browser tests](../../../jgantts-com/tests/e2e) cover integration.

[Website map](index.md)
