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
  visibility: [visibility: number]
}>()

const containerRef = ref<HTMLElement | null>(null)
const dialogRef = ref<HTMLDialogElement | null>(null)
const containerWidth = ref(0)
const viewportHeight = ref(0)
const activePhotoId = ref<string | null>(null)
const expandedPhotoUrl = ref('')
const selectedPostVisibility = ref(1)
let resizeObserver: ResizeObserver | null = null
let selectedPostElement: HTMLElement | null = null
let visibilityFrame: number | null = null
let selectedPostSetupFrame: number | null = null
let preloadFrame: number | null = null
let fullSizeLoadToken = 0
const originalPhotoPreloads = new Map<string, HTMLLinkElement>()
const clusterDateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

function syncViewportHeight() {
  viewportHeight.value = window.innerHeight
  scheduleSelectedPostVisibilityUpdate()
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
    return {
      id,
      clusterKey: post.id,
      aspectRatio,
      sourceWidth: original?.width,
      sourceHeight: original?.height,
    }
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
const effectiveActivePostId = computed(() =>
  selectedPostVisibility.value > 0.01 ? props.activePostId : undefined,
)

function preloadActivePostPhotos() {
  if (!props.activePostId) return

  imageRecords.value
    .filter((record) => record.post.id === props.activePostId)
    .forEach((record) => {
      if (originalPhotoPreloads.has(record.id) || !record.attachment.url) return

      const preload = document.createElement('link')
      preload.rel = 'preload'
      preload.as = 'image'
      preload.href = record.attachment.url
      preload.setAttribute('fetchpriority', 'low')
      document.head.appendChild(preload)
      originalPhotoPreloads.set(record.id, preload)
    })
}

function scheduleActivePostPhotoPreloads() {
  if (preloadFrame !== null) return

  // Give Safari one frame to paint the selection and comments panel before starting
  // downloads for the lightbox originals.
  preloadFrame = requestAnimationFrame(() => {
    preloadFrame = requestAnimationFrame(() => {
      preloadFrame = null
      preloadActivePostPhotos()
    })
  })
}

function displayPhotoUrl(id: string) {
  const record = recordsById.value.get(id)
  if (!record) return ''
  return record.attachment.preview_url
    || record.attachment.url
}

function prepareExpandedPhoto(id: string) {
  const record = recordsById.value.get(id)
  if (!record) return

  const previewUrl = record.attachment.preview_url || record.attachment.url
  const originalUrl = record.attachment.url || previewUrl
  const loadToken = ++fullSizeLoadToken
  expandedPhotoUrl.value = previewUrl
  if (!originalUrl || originalUrl === previewUrl) return

  // Let the dialog paint its cached preview before asking Safari to decode the original.
  requestAnimationFrame(() => {
    if (loadToken !== fullSizeLoadToken) return
    const image = new Image()
    image.decoding = 'async'
    image.onload = async () => {
      try {
        await image.decode()
      } catch {
        // The load event already guarantees a usable image on browsers that reject decode().
      }
      if (loadToken === fullSizeLoadToken) expandedPhotoUrl.value = originalUrl
    }
    image.src = originalUrl
  })
}

async function observeSelectedPost() {
  if (selectedPostSetupFrame !== null) {
    cancelAnimationFrame(selectedPostSetupFrame)
    selectedPostSetupFrame = null
  }
  selectedPostElement = null
  const activePostId = props.activePostId

  if (!activePostId) {
    selectedPostVisibility.value = 1
    emit('visibility', 1)
    return
  }

  await nextTick()
  if (props.activePostId !== activePostId) return
  const cluster = containerRef.value?.querySelector<HTMLElement>(
    `[data-cluster-key="${CSS.escape(activePostId)}"]`,
  )
  if (!cluster) return

  selectedPostElement = cluster
  // Layout reads here used to block the first selected-state paint on mobile Safari.
  // A second animation frame preserves the visibility tracking without putting it on
  // the tap-to-panel critical path.
  selectedPostSetupFrame = requestAnimationFrame(() => {
    selectedPostSetupFrame = null
    scheduleSelectedPostVisibilityUpdate()
  })
}

function updateSelectedPostVisibility() {
  visibilityFrame = null
  if (!selectedPostElement) return

  const bounds = selectedPostElement.getBoundingClientRect()
  const isMobile = window.matchMedia('(max-width: 44rem)').matches
  const commentsPanel = document.querySelector<HTMLElement>('.comments-section.is-active')
  const mobilePanelBottom = isMobile && commentsPanel
    ? window.innerHeight
      - commentsPanel.offsetHeight
      - (Number.parseFloat(getComputedStyle(commentsPanel).bottom) || 0)
    : window.innerHeight
  const visibleViewportBottom = Math.min(window.innerHeight, mobilePanelBottom)
  const fadeDistance = Math.max(180, Math.min(360, window.innerHeight * 0.35))
  const distancePastBoundary = bounds.bottom < 0
    ? -bounds.bottom
    : bounds.top > visibleViewportBottom
      ? bounds.top - visibleViewportBottom
      : 0
  const visibility = Math.max(0, 1 - distancePastBoundary / fadeDistance)
  selectedPostVisibility.value = visibility
  emit('visibility', visibility)
}

function scheduleSelectedPostVisibilityUpdate() {
  if (visibilityFrame !== null) return
  visibilityFrame = requestAnimationFrame(updateSelectedPostVisibility)
}

watch(() => props.activePostId, observeSelectedPost)
watch([() => props.activePostId, imageRecords], scheduleActivePostPhotoPreloads, { immediate: true })

function formatClusterDate(value: string): string {
  return clusterDateFormatter.format(new Date(value))
}

async function openPhoto(id: string) {
  const record = recordsById.value.get(id)
  if (!record) return
  const activePostId = effectiveActivePostId.value

  if (record.post.id === activePostId) {
    activePhotoId.value = id
    prepareExpandedPhoto(id)
    await nextTick()
    dialogRef.value?.showModal()
    document.documentElement.style.overflow = 'hidden'
    return
  }

  if (activePostId) {
    emit('clear')
    return
  }

  selectedPostVisibility.value = 1
  emit('visibility', 1)
  emit('select', record.postIndex)
}

function photoActionLabel(id: string): string {
  const record = recordsById.value.get(id)
  if (!record) return 'Select photo post'
  const date = formatClusterDate(record.post.created_at)
  if (record.post.id === effectiveActivePostId.value) return `Open photo from selected post dated ${date}`
  return effectiveActivePostId.value
    ? 'Clear selected post'
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

type HighlightPoint = { x: number; y: number }
type HighlightEdge = {
  direction: 0 | 1 | 2 | 3
  end: HighlightPoint
  start: HighlightPoint
}

const normalizedCoordinate = (value: number) => Math.round(value * 1000) / 1000
const pointKey = (point: HighlightPoint) => `${point.x}:${point.y}`

function roundedLoopPath(points: HighlightPoint[], radius = 10): string {
  if (points.length < 3) return ''

  let simplified = points
  let changed = true
  while (changed && simplified.length > 3) {
    changed = false
    const next = simplified.filter((point, index, allPoints) => {
      const previous = allPoints[(index - 1 + allPoints.length) % allPoints.length]!
      const following = allPoints[(index + 1) % allPoints.length]!
      const isCollinear = Math.abs(
        (point.x - previous.x) * (following.y - point.y)
          - (point.y - previous.y) * (following.x - point.x),
      ) < 0.001
      if (isCollinear) changed = true
      return !isCollinear
    })
    simplified = next
  }

  const corners = simplified.map((point, index) => {
    const previous = simplified[(index - 1 + simplified.length) % simplified.length]!
    const following = simplified[(index + 1) % simplified.length]!
    const incomingLength = Math.hypot(point.x - previous.x, point.y - previous.y)
    const outgoingLength = Math.hypot(following.x - point.x, following.y - point.y)
    const cornerRadius = Math.min(radius, incomingLength / 2, outgoingLength / 2)
    return {
      point,
      before: {
        x: point.x + ((previous.x - point.x) / incomingLength) * cornerRadius,
        y: point.y + ((previous.y - point.y) / incomingLength) * cornerRadius,
      },
      after: {
        x: point.x + ((following.x - point.x) / outgoingLength) * cornerRadius,
        y: point.y + ((following.y - point.y) / outgoingLength) * cornerRadius,
      },
    }
  })
  const formatPoint = (point: HighlightPoint) =>
    `${normalizedCoordinate(point.x)} ${normalizedCoordinate(point.y)}`
  const first = corners[0]!
  const commands = [`M ${formatPoint(first.after)}`]

  for (let index = 1; index < corners.length; index += 1) {
    const corner = corners[index]!
    commands.push(
      `L ${formatPoint(corner.before)}`,
      `Q ${formatPoint(corner.point)} ${formatPoint(corner.after)}`,
    )
  }
  commands.push(
    `L ${formatPoint(first.before)}`,
    `Q ${formatPoint(first.point)} ${formatPoint(first.after)}`,
    'Z',
  )
  return commands.join(' ')
}

function clusterSilhouettePath(
  cards: PlacedPhotoCard[],
  clusterX: number,
  clusterY: number,
): string {
  const expansion = gap / 2
  const rectangles = cards.map((card) => ({
    left: normalizedCoordinate(card.x - clusterX - expansion),
    right: normalizedCoordinate(card.x - clusterX + card.width + expansion),
    top: normalizedCoordinate(card.y - clusterY - expansion),
    bottom: normalizedCoordinate(card.y - clusterY + card.height + expansion),
  }))
  const xs = [...new Set(rectangles.flatMap((rect) => [rect.left, rect.right]))].sort((a, b) => a - b)
  const ys = [...new Set(rectangles.flatMap((rect) => [rect.top, rect.bottom]))].sort((a, b) => a - b)
  const occupied = Array.from({ length: ys.length - 1 }, (_, row) =>
    Array.from({ length: xs.length - 1 }, (_, column) => {
      const centerX = (xs[column]! + xs[column + 1]!) / 2
      const centerY = (ys[row]! + ys[row + 1]!) / 2
      return rectangles.some((rect) =>
        centerX > rect.left && centerX < rect.right
          && centerY > rect.top && centerY < rect.bottom,
      )
    }),
  )
  const edges: HighlightEdge[] = []
  const addEdge = (
    start: HighlightPoint,
    end: HighlightPoint,
    direction: HighlightEdge['direction'],
  ) => edges.push({ start, end, direction })

  occupied.forEach((row, rowIndex) => {
    row.forEach((isOccupied, columnIndex) => {
      if (!isOccupied) return
      const left = xs[columnIndex]!
      const right = xs[columnIndex + 1]!
      const top = ys[rowIndex]!
      const bottom = ys[rowIndex + 1]!
      if (!occupied[rowIndex - 1]?.[columnIndex]) {
        addEdge({ x: left, y: top }, { x: right, y: top }, 0)
      }
      if (!occupied[rowIndex]?.[columnIndex + 1]) {
        addEdge({ x: right, y: top }, { x: right, y: bottom }, 1)
      }
      if (!occupied[rowIndex + 1]?.[columnIndex]) {
        addEdge({ x: right, y: bottom }, { x: left, y: bottom }, 2)
      }
      if (!occupied[rowIndex]?.[columnIndex - 1]) {
        addEdge({ x: left, y: bottom }, { x: left, y: top }, 3)
      }
    })
  })

  const outgoingEdges = new Map<string, number[]>()
  edges.forEach((edge, index) => {
    const key = pointKey(edge.start)
    outgoingEdges.set(key, [...(outgoingEdges.get(key) ?? []), index])
  })
  const unusedEdges = new Set(edges.map((_, index) => index))
  const loops: HighlightPoint[][] = []
  const turnRank = [1, 0, 3, 2]

  while (unusedEdges.size) {
    const firstEdgeIndex = unusedEdges.values().next().value as number
    let currentEdgeIndex = firstEdgeIndex
    const loop: HighlightPoint[] = [edges[firstEdgeIndex]!.start]

    while (unusedEdges.has(currentEdgeIndex)) {
      const currentEdge = edges[currentEdgeIndex]!
      unusedEdges.delete(currentEdgeIndex)
      loop.push(currentEdge.end)
      if (pointKey(currentEdge.end) === pointKey(loop[0]!)) break

      const candidates = (outgoingEdges.get(pointKey(currentEdge.end)) ?? [])
        .filter((candidateIndex) => unusedEdges.has(candidateIndex))
      if (!candidates.length) break
      candidates.sort((leftIndex, rightIndex) => {
        const leftTurn = (edges[leftIndex]!.direction - currentEdge.direction + 4) % 4
        const rightTurn = (edges[rightIndex]!.direction - currentEdge.direction + 4) % 4
        return turnRank.indexOf(leftTurn) - turnRank.indexOf(rightTurn)
      })
      currentEdgeIndex = candidates[0]!
    }

    if (pointKey(loop[0]!) === pointKey(loop[loop.length - 1]!)) loop.pop()
    if (loop.length >= 3) loops.push(loop)
  }

  return loops.map((loop) => roundedLoopPath(loop)).filter(Boolean).join(' ')
}

// These decorations only change when the masonry geometry changes. Keeping them out of the
// render path means selecting a post does not recalculate every card corner and SVG outline.
const cardBorderRadii = computed(() => {
  const radii = new Map<string, string>()
  masonry.value.clusters.forEach((cluster) => {
    cluster.cards.forEach((card) => {
      radii.set(card.id, cardBorderRadius(card, cluster.cards))
    })
  })
  return radii
})

const clusterHighlightPaths = computed(() => {
  const paths = new Map<string, string>()
  masonry.value.clusters.forEach((cluster) => {
    paths.set(cluster.key, clusterSilhouettePath(cluster.cards, cluster.x, cluster.y))
  })
  return paths
})

function closePhoto() {
  fullSizeLoadToken += 1
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
  prepareExpandedPhoto(nextPhoto.id)
  emit('select', nextPhoto.postIndex)
}

function handleDialogKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowLeft') showPhoto(-1)
  if (event.key === 'ArrowRight') showPhoto(1)
}

onMounted(() => {
  syncViewportHeight()
  window.addEventListener('resize', syncViewportHeight, { passive: true })
  window.addEventListener('scroll', scheduleSelectedPostVisibilityUpdate, { passive: true })

  resizeObserver = new ResizeObserver(([entry]) => {
    containerWidth.value = entry?.contentRect.width ?? 0
    scheduleSelectedPostVisibilityUpdate()
  })
  if (containerRef.value) resizeObserver.observe(containerRef.value)
  observeSelectedPost()
})

onBeforeUnmount(() => {
  fullSizeLoadToken += 1
  originalPhotoPreloads.forEach((preload) => preload.remove())
  resizeObserver?.disconnect()
  if (visibilityFrame !== null) cancelAnimationFrame(visibilityFrame)
  if (selectedPostSetupFrame !== null) cancelAnimationFrame(selectedPostSetupFrame)
  if (preloadFrame !== null) cancelAnimationFrame(preloadFrame)
  window.removeEventListener('resize', syncViewportHeight)
  window.removeEventListener('scroll', scheduleSelectedPostVisibilityUpdate)
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
          'is-active': cluster.key === effectiveActivePostId,
          'is-muted': effectiveActivePostId && cluster.key !== effectiveActivePostId,
        }"
        :style="{
          '--selection-emphasis': effectiveActivePostId && cluster.key !== effectiveActivePostId
            ? selectedPostVisibility
            : 0,
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
            borderRadius: cardBorderRadii.get(card.id),
          }"
          :aria-label="photoActionLabel(card.id)"
          @click="openPhoto(card.id)"
        >
          <img
            :src="displayPhotoUrl(card.id)"
            :alt="recordsById.get(card.id)!.attachment.description || 'Mastodon post photo'"
            loading="lazy"
          />
        </button>
          <svg
            class="cluster-highlight"
            :class="{ 'is-visible': cluster.key === effectiveActivePostId }"
            :viewBox="`-8 -8 ${cluster.width + 16} ${cluster.height + 16}`"
            :style="{
              left: '-8px',
              top: '-8px',
              width: `${cluster.width + 16}px`,
              height: `${cluster.height + 16}px`,
            }"
            aria-hidden="true"
          >
          <path
            class="cluster-highlight-line"
            :d="clusterHighlightPaths.get(cluster.key)"
            vector-effect="non-scaling-stroke"
          />
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
            :src="expandedPhotoUrl"
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
  filter: saturate(calc(1 - (0.68 * var(--selection-emphasis))))
    brightness(calc(1 - (0.16 * var(--selection-emphasis))));
  opacity: calc(1 - (0.42 * var(--selection-emphasis)));
  pointer-events: none;
  position: absolute;
  transition: filter 180ms ease, left 220ms ease, opacity 180ms ease, top 220ms ease;
}

.photo-card {
  background: var(--photos-media-bg);
  border: 0;
  border-radius: 8px;
  box-shadow: var(--photos-card-shadow);
  cursor: pointer;
  overflow: hidden;
  padding: 0;
  pointer-events: auto;
  position: absolute;
  transform-origin: center;
  transition: box-shadow 160ms ease, transform 180ms ease;
}

.photo-cluster .photo-card {
  transform: scale(calc(1 - (0.03 * var(--selection-emphasis))));
}

.photo-cluster.is-active .photo-card {
  cursor: pointer;
  z-index: 1;
}

.cluster-highlight {
  color: var(--photos-accent);
  opacity: 0;
  overflow: visible;
  pointer-events: none;
  position: absolute;
  transition: opacity 120ms ease-out;
  will-change: opacity;
  z-index: 2;
}

.cluster-highlight.is-visible {
  opacity: 1;
}

.cluster-highlight-line {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.cluster-highlight-line {
  filter: drop-shadow(0 1px 3px var(--photos-highlight-shadow));
  stroke: currentColor;
  stroke-width: 3;
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
  .cluster-highlight,
  .photo-cluster,
  .photo-masonry,
  .photo-card,
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
