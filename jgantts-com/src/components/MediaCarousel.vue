<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'

type MediaAttachment = {
  description?: string | null
  preview_url: string
  type: 'audio' | 'gifv' | 'image' | 'unknown' | 'video'
  url: string
}

const props = defineProps<{
  attachments: MediaAttachment[]
  label: string
}>()

const visibleAttachments = computed(() => props.attachments.slice(0, 4))
const hiddenAttachmentCount = computed(() => Math.max(0, props.attachments.length - 4))
const galleryClass = computed(() => `media-count-${Math.min(props.attachments.length, 4)}`)
const dialogRef = ref<HTMLDialogElement | null>(null)
const activeImageIndex = ref(0)
const imageAttachments = computed(() => props.attachments.filter(({ type }) => type === 'image'))
const activeImage = computed(() => imageAttachments.value[activeImageIndex.value] ?? null)

async function openImage(attachment: MediaAttachment) {
  activeImageIndex.value = imageAttachments.value.indexOf(attachment)
  await nextTick()
  dialogRef.value?.showModal()
  document.documentElement.style.overflow = 'hidden'
}

function closeImage() {
  dialogRef.value?.close()
  document.documentElement.style.overflow = ''
}

function showPreviousImage() {
  activeImageIndex.value = Math.max(0, activeImageIndex.value - 1)
}

function showNextImage() {
  activeImageIndex.value = Math.min(imageAttachments.value.length - 1, activeImageIndex.value + 1)
}

function handleDialogKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowLeft') showPreviousImage()
  if (event.key === 'ArrowRight') showNextImage()
}

onBeforeUnmount(() => {
  document.documentElement.style.overflow = ''
})
</script>

<template>
  <section
    v-if="attachments.length > 1"
    class="media-gallery"
    :class="galleryClass"
    :aria-label="label"
  >
    <template
      v-for="(attachment, index) in visibleAttachments"
      :key="attachment.url"
    >
      <button
        v-if="attachment.type === 'image'"
        type="button"
        class="media-tile"
        :aria-label="`Open image ${index + 1}`"
        @click="openImage(attachment)"
      >
        <img
        :src="attachment.url || attachment.preview_url"
        :alt="attachment.description || `Mastodon post image ${index + 1}`"
        loading="lazy"
      />
        <span
          v-if="index === 3 && hiddenAttachmentCount"
          class="media-overflow"
          aria-hidden="true"
        >+{{ hiddenAttachmentCount }}</span>
      </button>
      <a
        v-else
        :href="attachment.url"
        class="media-tile"
        target="_blank"
        rel="noopener noreferrer"
      >
        <video
          v-if="attachment.type === 'video' || attachment.type === 'gifv'"
          :src="attachment.url"
          :poster="attachment.preview_url"
          controls
          playsinline
          @click.stop
        ></video>
        <span v-else>{{ attachment.type }} attachment</span>
      </a>
    </template>
  </section>

  <button
    v-else-if="attachments[0]?.type === 'image'"
    type="button"
    class="media-tile media-single"
    aria-label="Open image"
    @click="openImage(attachments[0])"
  >
    <img
      :src="attachments[0].url || attachments[0].preview_url"
      :alt="attachments[0].description || 'Mastodon post image'"
      loading="lazy"
    />
  </button>

  <a
    v-else-if="attachments[0]"
    :href="attachments[0].url"
    class="media-tile media-single"
    target="_blank"
    rel="noopener noreferrer"
  >
    <video
      v-if="attachments[0].type === 'video' || attachments[0].type === 'gifv'"
      :src="attachments[0].url"
      :poster="attachments[0].preview_url"
      controls
      playsinline
      @click.stop
    ></video>
    <span v-else>{{ attachments[0].type }} attachment</span>
  </a>

  <Teleport to="body">
    <dialog
      ref="dialogRef"
      class="photo-lightbox"
      aria-label="Photo viewer"
      @click.self="closeImage"
      @close="closeImage"
      @keydown="handleDialogKeydown"
    >
      <button type="button" class="lightbox-close" aria-label="Close photo viewer" @click="closeImage">×</button>
      <button
        v-if="imageAttachments.length > 1"
        type="button"
        class="lightbox-nav lightbox-previous"
        aria-label="Previous image"
        :disabled="activeImageIndex === 0"
        @click="showPreviousImage"
      >‹</button>
      <figure v-if="activeImage" class="lightbox-figure">
        <img :src="activeImage.url" :alt="activeImage.description || 'Expanded post image'" />
        <figcaption v-if="activeImage.description">{{ activeImage.description }}</figcaption>
      </figure>
      <button
        v-if="imageAttachments.length > 1"
        type="button"
        class="lightbox-nav lightbox-next"
        aria-label="Next image"
        :disabled="activeImageIndex === imageAttachments.length - 1"
        @click="showNextImage"
      >›</button>
    </dialog>
  </Teleport>
</template>

<style scoped>
.media-gallery {
  aspect-ratio: 4 / 3;
  display: grid;
  gap: 0.25rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  overflow: hidden;
}

.media-count-2 {
  grid-template-rows: minmax(0, 1fr);
}

.media-count-3 .media-tile:first-child {
  grid-row: 1 / 3;
}

.media-tile {
  align-items: center;
  background: var(--photos-media-bg, #29231f);
  border-radius: 6px;
  color: #fffaf4;
  display: flex;
  justify-content: center;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  position: relative;
  text-decoration: none;
}

button.media-tile {
  border: 0;
  cursor: zoom-in;
  padding: 0;
}

.media-single {
  aspect-ratio: 4 / 3;
  border-radius: 8px;
}

.media-tile img,
.media-tile video {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.media-overflow {
  align-items: center;
  background: rgba(0, 0, 0, 0.58);
  display: flex;
  font-size: clamp(1.25rem, 5vw, 2rem);
  font-weight: 700;
  inset: 0;
  justify-content: center;
  position: absolute;
}

.media-tile:focus-visible {
  outline: 2px solid var(--photos-accent);
  outline-offset: 2px;
}

.photo-lightbox {
  background: transparent;
  border: 0;
  box-sizing: border-box;
  color: #fff;
  height: 100dvh;
  margin: 0;
  max-height: none;
  max-width: none;
  padding: clamp(1rem, 4vw, 3rem);
  width: 100vw;
}

.photo-lightbox::backdrop {
  background: rgba(8, 10, 10, 0.94);
  backdrop-filter: blur(10px);
}

.lightbox-figure {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  height: 100%;
  justify-content: center;
  margin: 0;
  pointer-events: none;
}

.lightbox-figure img {
  border-radius: 6px;
  box-shadow: 0 1rem 4rem rgba(0, 0, 0, 0.45);
  max-height: calc(100dvh - 8rem);
  max-width: calc(100vw - 8rem);
  object-fit: contain;
  pointer-events: auto;
}

.lightbox-figure figcaption {
  color: rgba(255, 255, 255, 0.82);
  font-size: 0.85rem;
  max-width: 44rem;
  text-align: center;
}

.lightbox-close,
.lightbox-nav {
  align-items: center;
  background: rgba(20, 24, 24, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 50%;
  color: #fff;
  cursor: pointer;
  display: flex;
  justify-content: center;
  position: fixed;
  z-index: 1;
}

.lightbox-nav:disabled {
  cursor: default;
  opacity: 0.25;
}

.lightbox-close {
  font-size: 1.8rem;
  height: 2.75rem;
  right: max(1rem, env(safe-area-inset-right));
  top: max(1rem, env(safe-area-inset-top));
  width: 2.75rem;
}

.lightbox-nav {
  font-size: 2.5rem;
  height: 3.25rem;
  top: 50%;
  transform: translateY(-50%);
  width: 3.25rem;
}

.lightbox-previous {
  left: max(1rem, env(safe-area-inset-left));
}

.lightbox-next {
  right: max(1rem, env(safe-area-inset-right));
}

@media (max-width: 36rem) {
  .photo-lightbox {
    padding: 3.5rem 0.75rem;
  }

  .lightbox-figure img {
    max-height: calc(100dvh - 7rem);
    max-width: calc(100vw - 1.5rem);
  }

  .lightbox-nav {
    bottom: max(1rem, env(safe-area-inset-bottom));
    top: auto;
    transform: none;
  }
}
</style>
