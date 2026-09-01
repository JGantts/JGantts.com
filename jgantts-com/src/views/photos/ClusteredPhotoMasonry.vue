<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { calculatePhotoMasonry, type PhotoCard, type PlacedPhotoCard } from './masonry'

type Attachment = {
  description?: string | null
  meta?: { original?: { aspect?: number; height?: number; width?: number } } | null
  preview_url: string
  type: 'audio' | 'gifv' | 'image' | 'unknown' | 'video'
  url: string
}

type PhotoPost = {
  id: string
  created_at: string
  media_attachments: Attachment[]
}

const props = defineProps<{
  posts: Array<PhotoPost | null>
  activePostId?: string
}>()

const emit = defineEmits<{
  select: [postIndex: number]
  clear: []
  visibility: [isVisible: boolean]
}>()

const containerRef = ref<HTMLElement | null>(null)
const dialogRef = ref<HTMLDialogElement | null>(null)
const containerWidth = ref(0)
const viewportHeight = ref(0)
const activePhotoId = ref<string | null>(null)
const selectedPostVisible = ref(true)
let resizeObserver: ResizeObserver | null = null
let visibilityObserver: IntersectionObserver | null = null

function syncViewportHeight() {
  viewportHeight.value = window.innerHeight
}

const gap = 10
const columnCount = computed(() => {
  if (containerWidth.value < 520) return 6
  if (containerWidth.value < 840) return 12
  if (containerWidth.value < 1240) return 18
  return 24
})

const targetGalleryHeight = computed(() => Math.max(420, viewportHeight.value - 170))

const imageRecords = computed(() =>
  props.posts.flatMap((post, postIndex) =>
    (post?.media_attachments ?? [])
      .filter((attachment) => attachment.type === 'image')
      .map((attachment, attachmentIndex) => ({
        attachment,
        attachmentIndex,
        id: `${post!.id}:${attachmentIndex}`,
        post: post!,
        postIndex,
      })),
  ),
)

const cards = computed<PhotoCard[]>(() =>
  imageRecords.value.map(({ attachment, id, post }) => {
    const original = attachment.meta?.original
    const aspectRatio =
      original?.aspect ??
      (original?.width && original.height ? original.width / original.height : 4 / 3)
    return { id, clusterKey: post.id, aspectRatio }
  }),
)

const masonry = computed(() =>
  calculatePhotoMasonry(
    cards.value,
    containerWidth.value,
    columnCount.value,
    gap,
    targetGalleryHeight.value,
  ),
)

const recordsById = computed(() => new Map(imageRecords.value.map((record) => [record.id, record])))
const activePhotoIndex = computed(() =>
  imageRecords.value.findIndex((record) => record.id === activePhotoId.value),
)
const activePhoto = computed(() => imageRecords.value[activePhotoIndex.value] ?? null)

async function observeSelectedPost() {
  visibilityObserver?.disconnect()
  visibilityObserver = null

  if (!props.activePostId) {
    selectedPostVisible.value = true
    emit('visibility', true)
    return
  }

  await nextTick()
  const cluster = containerRef.value?.querySelector<HTMLElement>(
    `[data-cluster-key="${CSS.escape(props.activePostId)}"]`,
  )
  if (!cluster) return

  visibilityObserver = new IntersectionObserver(([entry]) => {
    const isVisible = entry?.isIntersecting ?? false
    selectedPostVisible.value = isVisible
    emit('visibility', isVisible)
  })
  visibilityObserver.observe(cluster)
}

watch(() => props.activePostId, observeSelectedPost)

function formatClusterDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

function openPhoto(id: string) {
  const record = recordsById.value.get(id)
  if (!record) return

  if (record.post.id === props.activePostId) {
    emit('clear')
    return
  }

  emit('select', record.postIndex)
}

function photoActionLabel(id: string): string {
  const record = recordsById.value.get(id)
  if (!record) return 'Select photo post'
  const date = formatClusterDate(record.post.created_at)
  return record.post.id === props.activePostId
    ? `Clear selected post from ${date}`
    : `Select post from ${date}`
}

function cornerRadii(card: PlacedPhotoCard, cards: PlacedPhotoCard[]) {
  const radius = 8
  const epsilon = 0.5
  const others = cards.filter((candidate) => candidate.id !== card.id)
  const coversX = (candidate: PlacedPhotoCard, x: number) =>
    candidate.x < x && candidate.x + candidate.width > x
  const coversY = (candidate: PlacedPhotoCard, y: number) =>
    candidate.y < y && candidate.y + candidate.height > y
  const above = (x: number) =>
    others.some((candidate) =>
      Math.abs(candidate.y + candidate.height - card.y) < epsilon && coversX(candidate, x),
    )
  const below = (x: number) =>
    others.some((candidate) =>
      Math.abs(candidate.y - (card.y + card.height)) < epsilon && coversX(candidate, x),
    )
  const left = (y: number) =>
    others.some((candidate) =>
      Math.abs(candidate.x + candidate.width - card.x) < epsilon && coversY(candidate, y),
    )
  const right = (y: number) =>
    others.some((candidate) =>
      Math.abs(candidate.x - (card.x + card.width)) < epsilon && coversY(candidate, y),
    )

  return [
    !above(card.x + epsilon) && !left(card.y + epsilon) ? radius : 0,
    !above(card.x + card.width - epsilon) && !right(card.y + epsilon) ? radius : 0,
    !below(card.x + card.width - epsilon) && !right(card.y + card.height - epsilon) ? radius : 0,
    !below(card.x + epsilon) && !left(card.y + card.height - epsilon) ? radius : 0,
  ]
}

function cardBorderRadius(card: PlacedPhotoCard, cards: PlacedPhotoCard[]) {
  return cornerRadii(card, cards).map((radius) => `${radius}px`).join(' ')
}

function highlightPath(card: PlacedPhotoCard, cards: PlacedPhotoCard[], clusterX: number, clusterY: number) {
  const x = card.x - clusterX
  const y = card.y - clusterY
  const width = card.width
  const height = card.height
  const [topLeft, topRight, bottomRight, bottomLeft] = cornerRadii(card, cards)
  return [
    `M ${x + topLeft} ${y}`,
    `H ${x + width - topRight}`,
    `Q ${x + width} ${y} ${x + width} ${y + topRight}`,
    `V ${y + height - bottomRight}`,
    `Q ${x + width} ${y + height} ${x + width - bottomRight} ${y + height}`,
    `H ${x + bottomLeft}`,
    `Q ${x} ${y + height} ${x} ${y + height - bottomLeft}`,
    `V ${y + topLeft}`,
    `Q ${x} ${y} ${x + topLeft} ${y}`,
    'Z',
  ].join(' ')
}

function closePhoto() {
  dialogRef.value?.close()
  document.documentElement.style.overflow = ''
}

function showPhoto(offset: number) {
  const nextIndex = Math.min(
    imageRecords.value.length - 1,
    Math.max(0, activePhotoIndex.value + offset),
  )
  const nextPhoto = imageRecords.value[nextIndex]
  if (!nextPhoto) return
  activePhotoId.value = nextPhoto.id
  emit('select', nextPhoto.postIndex)
}

function handleDialogKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowLeft') showPhoto(-1)
  if (event.key === 'ArrowRight') showPhoto(1)
}

onMounted(() => {
  syncViewportHeight()
  window.addEventListener('resize', syncViewportHeight, { passive: true })

  resizeObserver = new ResizeObserver(([entry]) => {
    containerWidth.value = entry?.contentRect.width ?? 0
  })
  if (containerRef.value) resizeObserver.observe(containerRef.value)
  observeSelectedPost()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  visibilityObserver?.disconnect()
  window.removeEventListener('resize', syncViewportHeight)
  document.documentElement.style.overflow = ''
})
</script>

<template>
  <section class="gallery-shell" aria-label="Photo posts">
    <div
      ref="containerRef"
      class="photo-masonry"
      :style="{ height: `${masonry.height}px` }"
    >
      <section
        v-for="cluster in masonry.clusters"
        :key="cluster.key"
        :data-cluster-key="cluster.key"
        class="photo-cluster"
        :class="{
          'is-active': cluster.key === activePostId,
          'is-muted': activePostId && selectedPostVisible && cluster.key !== activePostId,
        }"
        :style="{
          left: `${cluster.x}px`,
          top: `${cluster.y}px`,
          width: `${cluster.width}px`,
          height: `${cluster.height}px`,
        }"
        :aria-label="`Post from ${formatClusterDate(recordsById.get(cluster.cards[0].id)!.post.created_at)}`"
      >
        <button
          v-for="card in cluster.cards"
          :key="card.id"
          type="button"
          class="photo-card"
          :style="{
            left: `${card.x - cluster.x}px`,
            top: `${card.y - cluster.y}px`,
            width: `${card.width}px`,
            height: `${card.height}px`,
            borderRadius: cardBorderRadius(card, cluster.cards),
          }"
          :aria-label="photoActionLabel(card.id)"
          @click="openPhoto(card.id)"
        >
          <img
            :src="recordsById.get(card.id)!.attachment.url || recordsById.get(card.id)!.attachment.preview_url"
            :alt="recordsById.get(card.id)!.attachment.description || 'Mastodon post photo'"
            loading="lazy"
          />
        </button>
        <svg
          v-if="cluster.key === activePostId"
          class="cluster-highlight"
          :viewBox="`-8 -8 ${cluster.width + 16} ${cluster.height + 16}`"
          :style="{
            left: '-8px',
            top: '-8px',
            width: `${cluster.width + 16}px`,
            height: `${cluster.height + 16}px`,
          }"
          aria-hidden="true"
        >
          <defs>
            <filter
              :id="`post-highlight-${cluster.key}`"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
              color-interpolation-filters="sRGB"
            >
              <feMorphology in="SourceAlpha" operator="dilate" radius="3" result="expanded" />
              <feComposite in="expanded" in2="SourceAlpha" operator="out" result="outer-ring" />
              <feFlood flood-color="currentColor" flood-opacity="0.9" result="ring-color" />
              <feComposite in="ring-color" in2="outer-ring" operator="in" />
            </filter>
          </defs>
          <g :filter="`url(#post-highlight-${cluster.key})`">
            <path
              v-for="card in cluster.cards"
              :key="card.id"
              :d="highlightPath(card, cluster.cards, cluster.x, cluster.y)"
              fill="currentColor"
            />
          </g>
        </svg>
      </section>
    </div>

    <p v-if="!imageRecords.length" class="empty-gallery">No photos found in these posts.</p>

    <Teleport to="body">
      <dialog
        ref="dialogRef"
        class="photo-lightbox"
        aria-label="Photo viewer"
        @click.self="closePhoto"
        @close="closePhoto"
        @keydown="handleDialogKeydown"
      >
        <button type="button" class="lightbox-close" aria-label="Close photo viewer" @click="closePhoto">×</button>
        <button
          type="button"
          class="lightbox-nav lightbox-previous"
          aria-label="Previous photo"
          :disabled="activePhotoIndex <= 0"
          @click="showPhoto(-1)"
        >←</button>
        <figure v-if="activePhoto" class="lightbox-figure">
          <img
            :src="activePhoto.attachment.url || activePhoto.attachment.preview_url"
            :alt="activePhoto.attachment.description || 'Expanded Mastodon post photo'"
          />
          <figcaption>
            <span>{{ formatClusterDate(activePhoto.post.created_at) }}</span>
            <span v-if="activePhoto.attachment.description">{{ activePhoto.attachment.description }}</span>
          </figcaption>
        </figure>
        <button
          type="button"
          class="lightbox-nav lightbox-next"
          aria-label="Next photo"
          :disabled="activePhotoIndex >= imageRecords.length - 1"
          @click="showPhoto(1)"
        >→</button>
      </dialog>
    </Teleport>
  </section>
</template>

<style scoped>
.gallery-shell,
.photo-masonry {
  width: 100%;
}

.photo-masonry {
  position: relative;
  transition: height 220ms ease;
}

.photo-cluster {
  position: absolute;
  transform-origin: center;
  transition: filter 180ms ease, left 220ms ease, opacity 180ms ease, top 220ms ease, transform 180ms ease;
}

.photo-cluster.is-muted {
  filter: saturate(0.32) brightness(0.84);
  opacity: 0.58;
  transform: scale(0.97);
}

.photo-card {
  background: var(--photos-media-bg);
  border: 0;
  border-radius: 8px;
  box-shadow: var(--photos-card-shadow);
  cursor: pointer;
  overflow: hidden;
  padding: 0;
  position: absolute;
  transition: box-shadow 160ms ease;
}

.photo-cluster.is-active .photo-card {
  cursor: pointer;
  z-index: 1;
}

.cluster-highlight {
  color: var(--photos-accent);
  overflow: visible;
  pointer-events: none;
  position: absolute;
  z-index: 2;
}

.photo-card::after {
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: inherit;
  content: '';
  inset: 0;
  pointer-events: none;
  position: absolute;
}

.photo-card img {
  height: 100%;
  object-fit: cover;
  object-position: center;
  transition: transform 240ms ease;
  width: 100%;
}

.photo-card:hover img {
  transform: scale(1.025);
}

.photo-card:focus-visible {
  outline: 3px solid var(--photos-accent);
  outline-offset: 2px;
  z-index: 2;
}

.empty-gallery {
  color: var(--photos-muted);
  padding: 2rem 0;
  text-align: center;
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
  backdrop-filter: blur(12px);
  background: rgba(8, 10, 10, 0.94);
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
  max-height: calc(100dvh - 8rem);
  max-width: calc(100vw - 8rem);
  object-fit: contain;
  pointer-events: auto;
}

.lightbox-figure figcaption {
  color: rgba(255, 255, 255, 0.82);
  display: grid;
  font-size: 0.78rem;
  gap: 0.25rem;
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

.lightbox-close {
  font-size: 1.8rem;
  height: 2.75rem;
  right: max(1rem, env(safe-area-inset-right));
  top: max(1rem, env(safe-area-inset-top));
  width: 2.75rem;
}

.lightbox-nav {
  height: 3.25rem;
  top: 50%;
  transform: translateY(-50%);
  width: 3.25rem;
}

.lightbox-nav:disabled {
  cursor: default;
  opacity: 0.25;
}

.lightbox-previous { left: max(1rem, env(safe-area-inset-left)); }
.lightbox-next { right: max(1rem, env(safe-area-inset-right)); }

@media (prefers-reduced-motion: reduce) {
  .photo-cluster,
  .photo-masonry,
  .photo-card img { transition: none; }
}

@media (max-width: 36rem) {
  .photo-lightbox { padding: 3.5rem 0.75rem; }
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
