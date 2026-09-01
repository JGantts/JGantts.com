<script setup lang="ts">
import { computed } from 'vue'

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
</script>

<template>
  <section
    v-if="attachments.length > 1"
    class="media-gallery"
    :class="galleryClass"
    :aria-label="label"
  >
    <a
      v-for="(attachment, index) in visibleAttachments"
      :key="attachment.url"
      :href="attachment.url"
      class="media-tile"
      target="_blank"
      rel="noopener noreferrer"
    >
      <img
        v-if="attachment.type === 'image'"
        :src="attachment.url || attachment.preview_url"
        :alt="attachment.description || `Mastodon post image ${index + 1}`"
      />
      <video
        v-else-if="attachment.type === 'video' || attachment.type === 'gifv'"
        :src="attachment.url"
        :poster="attachment.preview_url"
        controls
        playsinline
        @click.stop
      ></video>
      <span v-else>{{ attachment.type }} attachment</span>
      <span
        v-if="index === 3 && hiddenAttachmentCount"
        class="media-overflow"
        aria-hidden="true"
      >
        +{{ hiddenAttachmentCount }}
      </span>
    </a>
  </section>

  <a
    v-else-if="attachments[0]"
    :href="attachments[0].url"
    class="media-tile media-single"
    target="_blank"
    rel="noopener noreferrer"
  >
    <img
      v-if="attachments[0].type === 'image'"
      :src="attachments[0].url || attachments[0].preview_url"
      :alt="attachments[0].description || 'Mastodon post image'"
    />
    <video
      v-else-if="attachments[0].type === 'video' || attachments[0].type === 'gifv'"
      :src="attachments[0].url"
      :poster="attachments[0].preview_url"
      controls
      playsinline
      @click.stop
    ></video>
    <span v-else>{{ attachments[0].type }} attachment</span>
  </a>
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
</style>
