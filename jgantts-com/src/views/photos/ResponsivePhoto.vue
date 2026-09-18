<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { PhotoCommentsAttachment } from './photo-comments-types'
import { useDevicePixelRatio } from './device-pixel-ratio'
import { responsiveImagePlan, type ImageDisplayContext } from './responsive-image'

const props = withDefaults(defineProps<{
  alt: string
  attachment: PhotoCommentsAttachment
  context: ImageDisplayContext
  displayWidth: number
  fetchPriority?: 'auto' | 'high' | 'low'
  fit?: 'contain' | 'cover'
  loading?: 'eager' | 'lazy'
  previewUrl?: string
}>(), {
  fetchPriority: 'auto',
  fit: 'cover',
  loading: 'lazy',
})

const loaded = ref(false)
const devicePixelRatio = useDevicePixelRatio()
const connection = navigator as Navigator & { connection?: { saveData?: boolean } }
const plan = computed(() => props.attachment.localMedia
  ? responsiveImagePlan({
      context: props.context,
      devicePixelRatio: devicePixelRatio.value,
      displayWidth: props.displayWidth,
      media: props.attachment.localMedia,
      saveData: connection.connection?.saveData === true,
    })
  : null)
const legacySource = computed(() => props.context === 'lightbox'
  ? props.attachment.url || props.attachment.preview_url
  : props.attachment.preview_url || props.attachment.url)
const source = computed(() => plan.value?.fallbackSrc ?? legacySource.value)
const position = computed(() => {
  const media = props.attachment.localMedia
  if (media?.focalX === null || media?.focalY === null || !media) return 'center'
  return `${media.focalX * 100}% ${media.focalY * 100}%`
})
const previewStyle = computed(() => {
  const previewUrl = props.previewUrl
    || props.attachment.localMedia?.placeholder?.url
    || (props.context === 'lightbox' ? props.attachment.preview_url : '')
  if (!previewUrl) return undefined
  const safeUrl = previewUrl.replaceAll('"', '%22')
  return {
    backgroundImage: `url("${safeUrl}")`,
    backgroundPosition: position.value,
    backgroundSize: props.fit,
  }
})

watch(source, () => { loaded.value = false })
</script>

<template>
  <span
    class="responsive-photo"
    :class="{ 'is-loaded': loaded }"
    :style="previewStyle"
  >
    <picture>
      <source
        v-if="plan?.avifSrcSet"
        type="image/avif"
        :srcset="plan.avifSrcSet"
        :sizes="plan.sizes"
      >
      <source
        v-if="plan?.webpSrcSet"
        type="image/webp"
        :srcset="plan.webpSrcSet"
        :sizes="plan.sizes"
      >
      <img
        :src="source"
        :srcset="plan?.fallbackSrcSet || undefined"
        :sizes="plan?.sizes"
        :alt="alt"
        :width="attachment.localMedia?.width ?? undefined"
        :height="attachment.localMedia?.height ?? undefined"
        :loading="loading"
        :fetchpriority="fetchPriority"
        decoding="async"
        :style="{ objectFit: fit, objectPosition: position }"
        @load="loaded = true"
      >
    </picture>
  </span>
</template>

<style scoped>
.responsive-photo,
.responsive-photo picture,
.responsive-photo img {
  display: block;
  height: 100%;
  width: 100%;
}

.responsive-photo {
  background-color: var(--photos-media-bg, #29231f);
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
}

.responsive-photo img {
  opacity: 0;
  transition: opacity 220ms ease-out;
}

.responsive-photo.is-loaded img {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .responsive-photo img {
    transition: none;
  }
}
</style>
