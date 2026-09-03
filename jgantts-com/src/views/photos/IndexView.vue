<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import ClusteredPhotoMasonry from './ClusteredPhotoMasonry.vue'
import MediaCarousel from '@/components/MediaCarousel.vue'

type MastodonAccount = {
  acct: string
  avatar: string
  display_name: string
  url: string
  username: string
}

type MastodonAttachment = {
  blurhash?: string | null
  description?: string | null
  preview_url: string
  meta?: {
    original?: { aspect?: number; height?: number; width?: number }
  } | null
  remote_url?: string | null
  type: 'audio' | 'gifv' | 'image' | 'unknown' | 'video'
  url: string
}

type MastodonCard = {
  author_name?: string
  description?: string
  image?: string
  provider_name?: string
  title: string
  url: string
}

type MastodonMention = {
  acct: string
  id: string
  url: string
  username: string
}

type MastodonPollOption = {
  title: string
  votes_count: number | null
}

type MastodonPoll = {
  expired: boolean
  multiple: boolean
  options: MastodonPollOption[]
  voters_count: number | null
  votes_count: number | null
}

type MastodonStatus = {
  account: MastodonAccount
  application?: { name: string; website: string | null } | null
  card?: MastodonCard | null
  content: string
  created_at: string
  favourites_count: number
  id: string
  in_reply_to_id: string | null
  media_attachments: MastodonAttachment[]
  mentions: MastodonMention[]
  poll?: MastodonPoll | null
  reblogs_count: number
  replies_count: number
  sensitive: boolean
  spoiler_text: string
  tags: { name: string; url: string }[]
  uri: string
  url: string | null
  visibility: 'direct' | 'private' | 'public' | 'unlisted'
}

type MastodonContext = {
  ancestors: MastodonStatus[]
  descendants: MastodonStatus[]
}

type ThreadedStatus = MastodonStatus & {
  replies: ThreadedStatus[]
}

type DisplayStatus = ThreadedStatus & {
  depth: number
}

type TootThread = {
  comments: ThreadedStatus[]
  post: MastodonStatus
}

const host = 'mastodon.social'
const tootIds = [
  '117175619119315006',
  '117193518181386825',
  '117181311875674440',
  '117181377440082771',
  '117198059772006365',
  '117204084325016679'
]
const props = defineProps<{
  postId?: string
}>()
const router = useRouter() 

const toots = ref<(TootThread | null)[]>(tootIds.map(() => null))
const loading = ref(true)
const error = ref<string | null>(null)
const tootLoads = new Map<number, Promise<void>>()

const activeTootIndex = ref<number | null>(null)
const selectedPostVisibility = ref(1)
const commentsDrawerState = ref<0 | 1 | 2>(0)
const commentsDrawerOpen = computed(() => commentsDrawerState.value > 0)
const commentsDrawerFull = computed(() => commentsDrawerState.value === 2)
const commentsDrawerDragging = ref(false)
const commentsDrawerDragOffset = ref(0)
const commentsDrawerDragProgress = ref(0)
const commentsDrawerPreviewHeight = ref(0)
const commentsDrawerPreviewWidth = computed(
  () => `${91.111 + 8.889 * commentsDrawerDragProgress.value}%`,
)
const commentsDrawerPreviewFontSize = computed(
  () => `${0.82 + 0.08 * commentsDrawerDragProgress.value}rem`,
)
const commentsDrawerPreviewLineHeight = computed(
  () => `${1.35 + 0.13 * commentsDrawerDragProgress.value}`,
)
let commentsDrawerPointerStartY = 0
let commentsDrawerPointerStartOffset = 0
let commentsDrawerPointerStartedAt = 0
let commentsDrawerPointerStartState: 0 | 1 | 2 = 0
const commentsDrawerStateLabel = computed(() => ['Collapsed', 'Expanded', 'Fully expanded'][commentsDrawerState.value])
const activeToot = computed(() =>
  activeTootIndex.value === null ? null : toots.value[activeTootIndex.value] ?? null,
)
const photoPosts = computed(() => toots.value.map((toot) => toot?.post ?? null))
const commentsByPostId = computed(() => {
  const comments = new Map<string, DisplayStatus[]>()
  toots.value.forEach((toot) => {
    if (toot) comments.set(toot.post.id, flattenComments(toot.comments))
  })
  return comments
})
const replyCountsByPostId = computed(() => {
  const counts = new Map<string, number>()
  toots.value.forEach((toot) => {
    if (toot) counts.set(toot.post.id, countReplies(toot.comments))
  })
  return counts
})

const formatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})
const numberFormatter = new Intl.NumberFormat()

function selectToot(nextIndex: number) {
  activeTootIndex.value = nextIndex
  selectedPostVisibility.value = 1
  commentsDrawerState.value = 0
  commentsDrawerDragOffset.value = 0
  const postId = toots.value[nextIndex]?.post.id
  if (!postId) return

  if (props.postId !== postId) void router.push(`/photos/${postId}`)
}

function clearSelection() {
  activeTootIndex.value = null
  selectedPostVisibility.value = 1
  commentsDrawerState.value = 0
  commentsDrawerDragOffset.value = 0
  if (props.postId) void router.push('/photos')
}

function syncSelectionFromRoute(postId = props.postId) {
  activeTootIndex.value = postId ? tootIds.indexOf(postId) : null
  if (activeTootIndex.value === -1) activeTootIndex.value = null
  selectedPostVisibility.value = 1
  commentsDrawerState.value = 0
  commentsDrawerDragOffset.value = 0
}

function isMobilePortraitDrawer() {
  return window.matchMedia('(max-width: 44rem) and (orientation: portrait)').matches
}

function stepCommentsDrawer(direction: -1 | 1) {
  commentsDrawerState.value = Math.min(
    2,
    Math.max(0, commentsDrawerState.value + direction),
  ) as 0 | 1 | 2
  commentsDrawerDragOffset.value = 0
}

function commentsDrawerOffsets(panel: HTMLElement) {
  const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
  const collapsedHeight = 6.25 * rootFontSize
  const closed = Math.max(0, panel.offsetHeight - collapsedHeight)
  return [closed, Math.min(closed, window.innerHeight * 0.22), 0] as const
}

function startCommentsDrawerDrag(event: PointerEvent) {
  if (!isMobilePortraitDrawer() || (event.pointerType === 'mouse' && event.button !== 0)) return

  const panel = (event.currentTarget as HTMLElement).closest<HTMLElement>('.comments-section')
  if (!panel) return
  const handle = panel.querySelector<HTMLElement>('.comments-drawer-handle')
  if (!handle) return

  commentsDrawerDragging.value = true
  commentsDrawerPointerStartState = commentsDrawerState.value
  commentsDrawerPointerStartY = event.clientY
  commentsDrawerPointerStartOffset = commentsDrawerOffsets(panel)[commentsDrawerState.value]
  commentsDrawerPointerStartedAt = performance.now()
  commentsDrawerDragOffset.value = commentsDrawerPointerStartOffset
  commentsDrawerDragProgress.value = commentsDrawerOpen.value ? 1 : 0
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function moveCommentsDrawer(event: PointerEvent) {
  if (!commentsDrawerDragging.value) return

  const panel = (event.currentTarget as HTMLElement).closest<HTMLElement>('.comments-section')
  if (!panel) return
  const handle = panel.querySelector<HTMLElement>('.comments-drawer-handle')
  if (!handle) return

  const [closedOffset] = commentsDrawerOffsets(panel)
  commentsDrawerDragOffset.value = Math.min(
    closedOffset,
    Math.max(0, commentsDrawerPointerStartOffset + event.clientY - commentsDrawerPointerStartY),
  )
  commentsDrawerDragProgress.value = closedOffset
    ? 1 - commentsDrawerDragOffset.value / closedOffset
    : 1

  const preview = panel.querySelector<HTMLElement>(
    '.comments-drawer-preview',
  )
  if (preview) {
    const collapsedHeight = Number.parseFloat(getComputedStyle(preview).lineHeight) * 3
    const expandedHeight = Math.min(preview.scrollHeight, window.innerHeight * 0.4)
    commentsDrawerPreviewHeight.value = collapsedHeight
      + (expandedHeight - collapsedHeight) * commentsDrawerDragProgress.value
  }
}

function finishCommentsDrawerDrag(event: PointerEvent) {
  if (!commentsDrawerDragging.value) return

  const panel = (event.currentTarget as HTMLElement).closest<HTMLElement>('.comments-section')
  const handle = panel?.querySelector<HTMLElement>('.comments-drawer-handle')
  if (!panel || !handle) return
  const elapsed = Math.max(1, performance.now() - commentsDrawerPointerStartedAt)
  const velocity = (event.clientY - commentsDrawerPointerStartY) / elapsed
  const offsets = commentsDrawerOffsets(panel)

  if (velocity < -0.35) {
    commentsDrawerState.value = Math.min(2, commentsDrawerPointerStartState + 1) as 0 | 1 | 2
  } else if (velocity > 0.35) {
    commentsDrawerState.value = Math.max(0, commentsDrawerPointerStartState - 1) as 0 | 1 | 2
  } else {
    let nearestState: 0 | 1 | 2 = 0
    offsets.forEach((offset, index) => {
      if (
        Math.abs(offset - commentsDrawerDragOffset.value)
        < Math.abs(offsets[nearestState] - commentsDrawerDragOffset.value)
      ) {
        nearestState = index as 0 | 1 | 2
      }
    })
    commentsDrawerState.value = nearestState
  }
  commentsDrawerDragging.value = false
  commentsDrawerDragOffset.value = 0
  commentsDrawerDragProgress.value = commentsDrawerState.value > 0 ? 1 : 0
  commentsDrawerPreviewHeight.value = 0
}

function handleCommentsDrawerWheel(event: WheelEvent) {
  if (!isMobilePortraitDrawer() || commentsDrawerFull.value) return
  event.preventDefault()
}

async function scrollToRoutedPost(postId: string) {
  await nextTick()

  // ResizeObserver supplies the masonry width on the next frame. Retry briefly so
  // direct links land correctly even when photos and layout initialize at once.
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    if (props.postId !== postId) return

    const cluster = document.querySelector<HTMLElement>(
      `[data-cluster-key="${CSS.escape(postId)}"]`,
    )
    if (cluster && cluster.offsetHeight > 0) {
      const topBreathingRoom = Math.max(24, Math.min(48, window.innerHeight * 0.04))
      window.scrollTo({
        top: window.scrollY + cluster.getBoundingClientRect().top - topBreathingRoom,
      })
      return
    }
  }
}

watch(() => props.postId, (postId) => {
  syncSelectionFromRoute(postId)
})

function handlePageClick(event: MouseEvent) {
  const activePostId = activeToot.value?.post.id
  if (!activePostId) return

  const target = event.target
  if (!(target instanceof Element)) return
  if (target.closest('.comments-section') || target.closest('.photo-lightbox')) return

  const photoCard = target.closest('.photo-card')
  const photoCluster = photoCard?.closest<HTMLElement>('[data-cluster-key]')
  if (photoCluster?.dataset.clusterKey === activePostId) return

  clearSelection()
}

function ensureTootLoaded(index: number): Promise<void> {
  if (toots.value[index]) return Promise.resolve()

  const existingLoad = tootLoads.get(index)
  if (existingLoad) return existingLoad

  const load = loadToot(tootIds[index])
    .then((toot) => {
      toots.value[index] = toot
    })
    .finally(() => tootLoads.delete(index))

  tootLoads.set(index, load)
  return load
}

onMounted(async () => {
  document.addEventListener('click', handlePageClick)

  try {
    syncSelectionFromRoute()
    await Promise.all(tootIds.map((_, index) => ensureTootLoaded(index)))

    loading.value = false
    if (props.postId && tootIds.includes(props.postId)) {
      await scrollToRoutedPost(props.postId)
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not load Mastodon conversation'
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handlePageClick)
})

async function loadToot(tootId: string): Promise<TootThread> {
  const [statusResponse, contextResponse] = await Promise.all([
    fetch(`https://${host}/api/v1/statuses/${tootId}`),
    fetch(`https://${host}/api/v1/statuses/${tootId}/context`),
  ])

  if (!statusResponse.ok) {
    throw new Error(`Could not load Mastodon post ${tootId} (${statusResponse.status})`)
  }

  if (!contextResponse.ok) {
    throw new Error(`Could not load comments for Mastodon post ${tootId} (${contextResponse.status})`)
  }

  const [post, context] = await Promise.all([
    statusResponse.json() as Promise<MastodonStatus>,
    contextResponse.json() as Promise<MastodonContext>,
  ])

  return {
    post,
    comments: buildCommentTree(context.descendants ?? []),
  }
}

function buildCommentTree(descendants: MastodonStatus[]): ThreadedStatus[] {
  const statuses = new Map<string, ThreadedStatus>()

  descendants.forEach((status) => {
    statuses.set(status.id, {
      ...status,
      replies: [],
    })
  })

  const roots: ThreadedStatus[] = []

  statuses.forEach((status) => {
    const parent = status.in_reply_to_id ? statuses.get(status.in_reply_to_id) : null

    if (parent) {
      parent.replies.push(status)
      return
    }

    roots.push(status)
  })

  return roots
}

function countReplies(statuses: ThreadedStatus[]): number {
  return statuses.reduce((count, status) => count + 1 + countReplies(status.replies), 0)
}

function flattenComments(statuses: ThreadedStatus[], depth = 0): DisplayStatus[] {
  return statuses.flatMap((status) => [
    {
      ...status,
      depth,
    },
    ...flattenComments(status.replies, depth + 1),
  ])
}

function displayName(account: MastodonAccount): string {
  return account.display_name.trim() || account.username
}

function formatDate(date: string): string {
  return formatter.format(new Date(date))
}

function formatCount(value: number): string {
  return numberFormatter.format(value)
}

function pollOptionPercent(option: MastodonPollOption, poll: MastodonPoll): number {
  if (!poll.votes_count) {
    return 0
  }

  return Math.round(((option.votes_count ?? 0) / poll.votes_count) * 100)
}
</script>

<template>
  <main class="photos-page">
    <section class="conversation-shell" aria-live="polite">
      <div v-if="loading" class="loading-state">
        Loading Mastodon conversation...
      </div>

      <div v-else-if="error" class="error-state">
        <p>{{ error }}</p>
        <a :href="`https://${host}/api/v1/statuses/${tootIds[0]}`">Open the Mastodon API response</a>
      </div>

      <section
        v-show="!loading && !error && toots.length"
        class="toot-carousel"
        aria-label="Mastodon posts"
      >
          <ClusteredPhotoMasonry
            :posts="photoPosts"
            :active-post-id="activeToot?.post.id"
            @select="selectToot"
            @clear="clearSelection"
            @visibility="selectedPostVisibility = $event"
          />

          <template
            v-for="(toot, tootIndex) in toots"
            :key="toot?.post.id ?? tootIds[tootIndex]"
          >
            <section
              v-if="toot"
              v-show="activeTootIndex === tootIndex"
              class="comments-section"
              :class="{
                'is-active': activeTootIndex === tootIndex,
                'is-out-of-view': activeTootIndex === tootIndex && selectedPostVisibility <= 0.01,
                'is-drawer-open': commentsDrawerOpen,
                'is-drawer-full': commentsDrawerFull,
                'is-drawer-dragging': commentsDrawerDragging,
              }"
              :style="{
                '--selected-post-visibility': selectedPostVisibility,
                '--drawer-drag-offset': `${commentsDrawerDragOffset}px`,
                '--drawer-drag-progress': commentsDrawerDragProgress,
                '--drawer-preview-height': `${commentsDrawerPreviewHeight}px`,
                '--drawer-preview-width': commentsDrawerPreviewWidth,
                '--drawer-preview-font-size': commentsDrawerPreviewFontSize,
                '--drawer-preview-line-height': commentsDrawerPreviewLineHeight,
              }"
              :aria-hidden="activeTootIndex !== tootIndex || selectedPostVisibility <= 0.01"
              aria-label="Post comments"
              @wheel="handleCommentsDrawerWheel"
              @pointerdown="commentsDrawerFull ? undefined : startCommentsDrawerDrag($event)"
              @pointermove="commentsDrawerFull ? undefined : moveCommentsDrawer($event)"
              @pointerup="commentsDrawerFull ? undefined : finishCommentsDrawerDrag($event)"
              @pointercancel="commentsDrawerFull ? undefined : finishCommentsDrawerDrag($event)"
            >
                <span
                  class="comments-drawer-grabber"
                  role="slider"
                  tabindex="0"
                  aria-label="Comments panel position"
                  aria-valuemin="0"
                  aria-valuemax="2"
                  :aria-valuenow="commentsDrawerState"
                  :aria-valuetext="commentsDrawerStateLabel"
                  @keydown.up.prevent="stepCommentsDrawer(1)"
                  @keydown.right.prevent="stepCommentsDrawer(1)"
                  @keydown.down.prevent="stepCommentsDrawer(-1)"
                  @keydown.left.prevent="stepCommentsDrawer(-1)"
                  @pointerdown.stop="startCommentsDrawerDrag"
                  @pointermove.stop="moveCommentsDrawer"
                  @pointerup.stop="finishCommentsDrawerDrag"
                  @pointercancel.stop="finishCommentsDrawerDrag"
                ></span>

              <div class="comments-drawer-scroll">
                <div
                  class="comments-drawer-handle"
                >
                  <div class="comments-drawer-preview" v-html="toot.post.content"></div>
                </div>

                <button
                  type="button"
                  class="comments-close"
                  aria-label="Close comments"
                  @click="clearSelection"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>

                <div class="comments-panel-heading" v-memo="[toot.post.id]">
                  <header class="post-meta-header">
                    <a :href="toot.post.account.url" class="author-link">
                      <img
                        :src="toot.post.account.avatar"
                        alt=""
                        class="avatar avatar-large"
                        decoding="async"
                      />
                      <span class="author-text">
                        <strong>{{ displayName(toot.post.account) }}</strong>
                        <span>@{{ toot.post.account.acct }}</span>
                      </span>
                    </a>
                  </header>

                  <div class="comments-post-text" v-html="toot.post.content"></div>
                  <time class="comments-post-date" :datetime="toot.post.created_at">
                    {{ formatDate(toot.post.created_at) }}
                  </time>
                </div>

                <header class="comments-header">
                  <h1>Comments</h1>
                  <span>{{ formatCount(replyCountsByPostId.get(toot.post.id) ?? 0) }}</span>
                </header>

                <ol
                  v-if="toot.comments.length"
                  v-memo="[toot.post.id]"
                  class="comment-list"
                >
                  <li
                    v-for="comment in commentsByPostId.get(toot.post.id) ?? []"
                    :key="comment.id"
                    :style="{ '--reply-depth': Math.min(comment.depth, 6) }"
                    class="comment-item"
                  >
                    <article class="comment" :class="{ 'is-reply': comment.depth > 0 }">
                      <header class="status-header">
                        <a :href="comment.account.url" class="author-link">
                          <img
                            :src="comment.account.avatar"
                            alt=""
                            class="avatar"
                            decoding="async"
                            loading="lazy"
                          />
                          <span class="author-text">
                            <strong>{{ displayName(comment.account) }}</strong>
                            <span>@{{ comment.account.acct }}</span>
                          </span>
                        </a>
                        <a :href="comment.url ?? comment.uri" class="timestamp">
                          {{ formatDate(comment.created_at) }}
                        </a>
                      </header>

                      <p v-if="comment.spoiler_text" class="content-warning">{{ comment.spoiler_text }}</p>
                      <div class="status-content" v-html="comment.content"></div>

                      <MediaCarousel
                        v-if="comment.media_attachments.length"
                        :attachments="comment.media_attachments"
                        label="Reply media"
                      />

                      <footer class="comment-stats">
                        <span>{{ formatCount(comment.reblogs_count) }} boosts</span>
                        <span>{{ formatCount(comment.favourites_count) }} favorites</span>
                      </footer>
                    </article>
                  </li>
                </ol>

                <p v-else class="empty-state" v-memo="[toot.post.id]">No comments yet.</p>
              </div>
            </section>
          </template>
      </section>
    </section>
  </main>
</template>

<style scoped>
.photos-page {
  --photos-gutter: clamp(0.75rem, 2vw, 1.5rem);
  --photos-bg: #f4efe8;
  --photos-panel: #fffaf4;
  --photos-border: #d6c8b8;
  --photos-text: #211d1a;
  --photos-muted: #6d6257;
  --photos-accent: #2f7568;
  --photos-accent-soft: #dcece7;
  --photos-control: #eee5db;
  --photos-control-hover: #e3d7ca;
  --photos-media-bg: #29231f;
  --photos-poll-bg: #efe4d7;
  --photos-card-border: rgba(92, 72, 53, 0.22);
  --photos-card-shadow: 0 0 0.45rem rgba(74, 56, 40, 0.12), 0 0.4rem 1.1rem rgba(74, 56, 40, 0.14);
  --photos-highlight-border: rgba(33, 29, 26, 0.72);
  --photos-highlight-shadow: rgba(33, 29, 26, 0.35);
  --photos-card-shadow-space: 1.5rem;

  background: linear-gradient(
    180deg,
    var(--photos-bg) 0,
    var(--photos-bg) 0.5rem,
    var(--photos-panel) 0.5rem,
    var(--photos-panel) 7rem,
    var(--photos-bg) min(24rem, 52vh),
    var(--photos-bg) 100%
  );
  color: var(--photos-text);
  font-size: 0.85rem;
  min-height: 100vh;
  padding-bottom: var(--photos-gutter);
  padding-left: calc(var(--photos-gutter) + env(safe-area-inset-left, 0px));
  padding-right: calc(var(--photos-gutter) + env(safe-area-inset-right, 0px));
  padding-top: var(--photos-gutter);
}

.conversation-shell {
  margin: 0 auto;
  width: 100%;
}

.toot-carousel {
  --toot-card-width: min(calc(68% - 0.75rem), 40rem);
  --comments-panel-gap: clamp(1.25rem, 2vw, 2rem);

  box-sizing: border-box;
  display: grid;
  gap: 1rem var(--comments-panel-gap);
  grid-template-columns: minmax(0, 1fr) 22rem;
}

.toot-viewport {
  margin-bottom: calc(-1 * var(--photos-card-shadow-space));
  margin-left: calc(-1 * (var(--photos-gutter) + env(safe-area-inset-left, 0px)));
  margin-right: calc(-1 * (var(--photos-gutter) + env(safe-area-inset-right, 0px)));
  margin-top: calc(-1 * var(--photos-card-shadow-space));
  padding-bottom: var(--photos-card-shadow-space);
  padding-top: var(--photos-card-shadow-space);

  overscroll-behavior-x: contain;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.toot-viewport::-webkit-scrollbar {
  display: none;
}

.toot-container {
  display: flex;
  gap: 1rem;
  min-width: 100%;
}

.toot-container::before,
.toot-container::after {
  content: '';
  flex: 0 0 max(0px, calc((100% - var(--toot-card-width)) / 2 - 1rem));
}

.toot-thread {
  display: grid;
  flex: 0 0 var(--toot-card-width);
  gap: 0.75rem;
  margin-right: 0;
  min-width: 0;
  scroll-snap-align: center;
  scroll-snap-stop: always;
}

.toot-placeholder {
  align-items: center;
  background: var(--photos-panel);
  border: 1px solid var(--photos-border);
  border-radius: 10px;
  color: var(--photos-muted);
  display: flex;
  justify-content: center;
  min-height: 18rem;
}

.toot-carousel-controls {
  align-items: center;
  display: grid;
  grid-template-columns: 2rem 1fr 2rem;
  margin-inline: auto;
  max-width: 40rem;
  width: 100%;
}

.toot-carousel-control,
.toot-carousel-dot {
  background: none;
  border: 0;
  color: inherit;
  cursor: pointer;
}

.toot-carousel-control {
  background: var(--photos-control);
  border: 1px solid var(--photos-border);
  border-radius: 50%;
  font-size: 1rem;
  height: 2rem;
  line-height: 1;
  width: 2rem;
}

.toot-carousel-control:not(:disabled):hover {
  background: var(--photos-control-hover);
  border-color: var(--photos-accent);
}

.toot-carousel-control:disabled {
  cursor: default;
  opacity: 0.4;
}

.toot-carousel-dots {
  display: flex;
  gap: 0.45rem;
  justify-content: center;
}

.toot-carousel-dot {
  background: var(--photos-border);
  border-radius: 50%;
  height: 0.5rem;
  padding: 0;
  width: 0.5rem;
}

.toot-carousel-dot.is-selected {
  background: var(--photos-accent);
}

.toot-carousel-control:focus-visible,
.toot-carousel-dot:focus-visible {
  outline: 2px solid var(--photos-accent);
  outline-offset: 2px;
}

.loading-state,
.error-state,
.empty-state,
.mastodon-post,
.comment {
  background: var(--photos-panel);
  border: 1px solid var(--photos-border);
  border-radius: 8px;
}

.loading-state,
.error-state,
.empty-state {
  color: var(--photos-muted);
  padding: 1.25rem;
}

.error-state {
  display: grid;
  gap: 0.6rem;
}

.mastodon-post {
  border: 0.5px solid var(--photos-card-border);
  box-shadow: var(--photos-card-shadow);
  display: grid;
  gap: 0.85rem;
  padding: clamp(0.8rem, 2vw, 1.1rem);
}

.status-header {
  align-items: center;
  display: flex;
  gap: 0.75rem;
  justify-content: space-between;
}

.post-meta-header {
  align-items: center;
  display: flex;
  gap: 0.75rem;
  justify-content: space-between;
  margin-inline: auto;
  max-width: 40rem;
  padding: 0 0.15rem;
  width: 100%;
}

.post-date-header {
  display: flex;
  justify-content: flex-end;
}

.author-link {
  align-items: center;
  color: inherit;
  display: flex;
  gap: 0.6rem;
  min-width: 0;
  text-decoration: none;
}

.author-link:hover strong,
.timestamp:hover,
.status-content :deep(a):hover,
.error-state a:hover {
  color: var(--photos-accent);
  text-decoration: underline;
}

.avatar {
  border-radius: 8px;
  flex: 0 0 auto;
  height: 2rem;
  object-fit: cover;
  width: 2rem;
}

.avatar-large {
  height: 2.5rem;
  width: 2.5rem;
}

.author-text {
  display: grid;
  gap: 0.15rem;
  min-width: 0;
}

.author-text strong,
.author-text span,
.timestamp,
.poll-title,
.poll-percent {
  overflow-wrap: anywhere;
}

.author-text strong {
  font-size: 0.9rem;
  font-weight: 750;
}

.author-text span,
.timestamp,
.status-stats,
.comment-stats,
.poll-meta,
.link-card-copy span,
.link-card-copy small {
  color: var(--photos-muted);
  font-size: 0.7rem;
  line-height: 1.35;
}

.timestamp,
.error-state a {
  color: var(--photos-muted);
  flex: 0 0 auto;
  font-family: 'Azeret Mono Variable', monospace;
  text-decoration: none;
}

.content-warning {
  background: var(--photos-accent-soft);
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.4;
  padding: 0.5rem 0.6rem;
}

.status-content {
  font-size: clamp(0.9rem, 1.6vw, 1.05rem);
  font-weight: 320;
  line-height: 1.55;
}

.comment .status-content {
  font-size: 0.85rem;
}

.status-content :deep(p + p) {
  margin-top: 0.85rem;
}

.status-content :deep(a) {
  color: var(--photos-accent);
  font-weight: 520;
  text-decoration: none;
}

.media-grid {
  display: grid;
  gap: 0.55rem;
  grid-template-columns: repeat(auto-fit, minmax(min(13rem, 100%), 1fr));
}

.media-grid.compact {
  grid-template-columns: repeat(auto-fit, minmax(min(9rem, 100%), 1fr));
}

.media-item {
  align-items: center;
  aspect-ratio: 4 / 3;
  background: var(--photos-media-bg);
  border-radius: 8px;
  color: #fffaf4;
  display: flex;
  justify-content: center;
  overflow: hidden;
  text-decoration: none;
}

.media-item img,
.media-item video {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.poll {
  display: grid;
  gap: 0.55rem;
}

.poll-option {
  background: var(--photos-poll-bg);
  border-radius: 6px;
  display: grid;
  gap: 0.5rem;
  grid-template-columns: 1fr auto;
  overflow: hidden;
  padding: 0.6rem 0.75rem;
  position: relative;
}

.poll-bar {
  background: var(--photos-accent-soft);
  bottom: 0;
  left: 0;
  position: absolute;
  top: 0;
}

.poll-title,
.poll-percent {
  font-size: 0.82rem;
  font-weight: 650;
  position: relative;
  z-index: 1;
}

.poll-meta {
  font-family: 'Azeret Mono Variable', monospace;
}

.link-card {
  border: 1px solid var(--photos-border);
  border-radius: 8px;
  color: inherit;
  display: grid;
  gap: 0.85rem;
  grid-template-columns: minmax(0, 8rem) 1fr;
  overflow: hidden;
  text-decoration: none;
}

.link-card img {
  height: 100%;
  min-height: 6rem;
  object-fit: cover;
  width: 100%;
}

.link-card-copy {
  display: grid;
  gap: 0.25rem;
  padding: 0.75rem 0.75rem 0.75rem 0;
}

.link-card-copy strong {
  font-size: 0.95rem;
  font-weight: 750;
  line-height: 1.25;
}

.status-stats,
.comment-stats {
  border-top: 1px solid var(--photos-border);
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  padding-top: 0.9rem;
}

.comments-section {
  align-self: start;
  background: var(--photos-panel);
  border: 1px solid var(--photos-border);
  border-radius: 12px;
  box-sizing: border-box;
  box-shadow: var(--photos-card-shadow);
  max-height: calc(100dvh - 9rem - var(--photos-gutter));
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0.85rem;
  grid-column: 2;
  position: sticky;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  top: 8rem;
  opacity: var(--selected-post-visibility, 1);
  transform: translateX(calc((1 - var(--selected-post-visibility, 1)) * 0.75rem));
  width: 100%;
  z-index: 10;
}

.comments-section.is-out-of-view {
  pointer-events: none;
}

.comments-drawer-handle {
  display: none;
}

.comments-drawer-scroll {
  display: contents;
}

.comments-header {
  align-items: baseline;
  background: color-mix(in srgb, var(--photos-panel) 92%, transparent);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid color-mix(in srgb, var(--photos-border) 58%, transparent);
  border-top: 1px solid color-mix(in srgb, var(--photos-border) 58%, transparent);
  display: grid;
  gap: 0.65rem;
  grid-template-columns: minmax(0, 1fr) auto;
  margin: 0.65rem -0.85rem 0.75rem;
  padding: 0.65rem 0.85rem;
  position: sticky;
  top: -0.85rem;
  z-index: 2;
}

.comments-panel-heading {
  display: grid;
  gap: 0.45rem;
  min-height: 0;
  padding: 0 2.75rem 0.2rem 0.15rem;
}

.comments-post-text {
  font-size: 0.85rem;
  line-height: 1.45;
  max-height: min(10rem, 22dvh);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.comments-post-text :deep(p + p) {
  margin-top: 0.65rem;
}

.comments-post-text :deep(a) {
  color: var(--photos-accent);
  text-decoration: none;
}

.comments-post-text :deep(img) {
  height: 1em;
  vertical-align: -0.1em;
  width: 1em;
}

.comments-post-date {
  color: color-mix(in srgb, var(--photos-muted) 62%, transparent);
  font-family: 'Azeret Mono Variable', monospace;
  font-size: 0.62rem;
  line-height: 1.3;
}

.comments-header h1 {
  font-size: 1.05rem;
  font-weight: 800;
}

.comments-header span {
  color: var(--photos-muted);
  font-family: 'Azeret Mono Variable', monospace;
  font-size: 0.78rem;
}

.comments-close {
  align-items: center;
  align-self: center;
  background: var(--photos-control);
  border: 1px solid var(--photos-border);
  border-radius: 50%;
  color: var(--photos-text);
  cursor: pointer;
  display: inline-flex;
  height: 1.75rem;
  justify-content: center;
  padding: 0;
  position: absolute;
  right: 0.85rem;
  top: 0.85rem;
  width: 1.75rem;
  z-index: 3;
}

.comments-close:hover {
  background: var(--photos-control-hover);
  border-color: var(--photos-accent);
}

.comments-close:focus-visible {
  outline: 2px solid var(--photos-accent);
  outline-offset: 2px;
}

.comments-close svg {
  fill: none;
  height: 0.9rem;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-width: 2;
  width: 0.9rem;
}

.comment-list {
  display: grid;
  gap: 0.75rem;
  padding: 0.15rem;
}

.comment-item {
  margin-left: calc(var(--reply-depth) * 1rem);
}

.comment {
  border: 0.5px solid var(--photos-card-border);
  box-shadow: var(--photos-card-shadow);
  display: grid;
  gap: 0.65rem;
  padding: 0.75rem;
}

@media (max-width: 44rem) {
  .toot-carousel {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 44rem) and (orientation: portrait) {
  .comments-section {
    --drawer-handle-height: 6.25rem;
    --drawer-closed-offset: calc(100% - var(--drawer-handle-height) - env(safe-area-inset-bottom, 0px));

    bottom: 0;
    grid-column: 1;
    height: min(78dvh, 40rem);
    left: max(0.5rem, env(safe-area-inset-left, 0px));
    max-height: none;
    padding: 0;
    position: fixed;
    right: max(0.5rem, env(safe-area-inset-right, 0px));
    top: auto;
    overflow-y: hidden;
    touch-action: none;
    width: auto;
    transform: translateY(var(--drawer-closed-offset));
    transition: transform 240ms cubic-bezier(0.22, 0.72, 0.22, 1), opacity 160ms ease;
  }

  .comments-section.is-drawer-open {
    transform: translateY(min(22dvh, var(--drawer-closed-offset)));
  }

  .comments-section.is-drawer-full {
    touch-action: pan-y;
    transform: translateY(0);
  }

  .comments-drawer-scroll {
    box-sizing: border-box;
    display: block;
    height: 100%;
    overflow: hidden;
    padding: 1rem 0.85rem 0.85rem;
  }

  .comments-section.is-drawer-full .comments-drawer-scroll {
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .comments-section.is-drawer-dragging {
    transform: translateY(var(--drawer-drag-offset));
    transition: none;
  }

  .comments-section.is-out-of-view {
    opacity: 0;
    pointer-events: none;
  }

  .comments-drawer-handle {
    background: color-mix(in srgb, var(--photos-panel) 94%, transparent);
    border: 0;
    border-bottom: 1px solid var(--photos-border);
    color: var(--photos-text);
    cursor: grab;
    display: block;
    margin: 0 -0.85rem 0.65rem;
    min-height: calc(var(--drawer-handle-height) - 1rem);
    padding: 0.15rem 1rem 0.75rem;
    position: relative;
    transition: padding 240ms cubic-bezier(0.22, 0.72, 0.22, 1);
  }

  .comments-drawer-grabber {
    background: color-mix(in srgb, var(--photos-panel) 94%, transparent);
    cursor: grab;
    display: block;
    height: 1rem;
    left: 0;
    margin: 0;
    position: absolute;
    right: 0;
    top: 0;
    touch-action: none;
    z-index: 5;
  }

  .comments-drawer-grabber:active {
    cursor: grabbing;
  }

  .comments-drawer-grabber:focus-visible {
    outline: 2px solid var(--photos-accent);
    outline-offset: -2px;
  }

  .comments-drawer-grabber::after {
    background: var(--photos-border);
    border-radius: 999px;
    content: '';
    height: 0.28rem;
    left: 50%;
    position: absolute;
    top: 0.37rem;
    transform: translateX(-50%);
    width: 2.5rem;
  }

  .comments-drawer-handle:focus-visible {
    outline: 2px solid var(--photos-accent);
    outline-offset: -3px;
  }

  .comments-drawer-preview {
    box-sizing: border-box;
    font-size: 0.82rem;
    line-height: 1.35;
    margin-inline: auto;
    max-height: 4.05em;
    overflow: hidden;
    padding-right: 0.2rem;
    position: relative;
    text-align: left;
    transition: max-height 320ms cubic-bezier(0.22, 0.72, 0.22, 1),
      font-size 240ms ease,
      line-height 240ms ease,
      width 240ms ease;
    width: 91.111%;
  }

  .comments-drawer-preview::after {
    background: linear-gradient(90deg, transparent, var(--photos-panel) 45%);
    bottom: 0;
    content: '\2026';
    padding-left: 1.5rem;
    position: absolute;
    right: 0;
  }

  .comments-section.is-drawer-open .comments-drawer-handle {
    cursor: grab;
    min-height: 0;
    padding-bottom: 1rem;
    padding-top: 0.35rem;
  }

  .comments-section.is-drawer-open .comments-drawer-preview {
    font-size: 0.9rem;
    line-height: 1.48;
    max-height: none;
    overflow: visible;
    width: 100%;
  }

  .comments-section.is-drawer-open .comments-drawer-preview::after {
    opacity: 0;
    transition: opacity 100ms ease;
  }

  .comments-section.is-drawer-dragging .comments-drawer-preview {
    font-size: var(--drawer-preview-font-size);
    line-height: var(--drawer-preview-line-height);
    max-height: var(--drawer-preview-height);
    transition: none;
    width: var(--drawer-preview-width);
  }

  .comments-section.is-drawer-dragging .comments-drawer-preview::after {
    opacity: calc(1 - var(--drawer-drag-progress));
  }

  .comments-drawer-preview :deep(p) {
    display: inline;
  }

  .comments-drawer-preview :deep(p + p)::before {
    content: ' ';
  }

  .comments-drawer-preview :deep(a) {
    color: var(--photos-accent);
    pointer-events: none;
    text-decoration: underline;
    text-decoration-color: color-mix(in srgb, var(--photos-accent) 35%, transparent);
    text-underline-offset: 0.15em;
  }

  .comments-drawer-preview :deep(img) {
    height: 1em;
    vertical-align: -0.1em;
    width: 1em;
  }

  .comments-panel-heading,
  .comments-close {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .comments-section {
    transition: none;
  }
}

@media (max-width: 36rem) {
  .toot-carousel {
    --toot-card-width: calc(88% - 0.5rem);
  }

  .status-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.65rem;
  }

  .timestamp {
    margin-left: calc(2rem + 0.6rem);
  }

  .link-card {
    grid-template-columns: 1fr;
  }

  .link-card-copy {
    padding: 0 0.75rem 0.75rem;
  }

  .comment-item {
    margin-left: calc(var(--reply-depth) * 0.45rem);
  }
}

@media (orientation: landscape) and (max-height: 36rem) and (max-width: 64rem) {
  .toot-carousel {
    --toot-card-width: min(56%, 30rem);
  }

  .comments-section {
    bottom: auto;
    grid-column: 1;
    left: auto;
    max-height: calc(
      100dvh
      - max(0.75rem, env(safe-area-inset-top, 0px))
      - max(0.75rem, env(safe-area-inset-bottom, 0px))
    );
    position: fixed;
    right: max(0.75rem, env(safe-area-inset-right, 0px));
    top: 50%;
    transform: translate(
      calc((1 - var(--selected-post-visibility, 1)) * 0.75rem),
      -50%
    );
    width: min(26rem, calc(52vw - 0.75rem));
  }

  .comments-section.is-out-of-view {
    transform: translate(0.75rem, -50%);
  }
}
</style>

<style>
html.dark .photos-page {
  --photos-bg: #111716;
  --photos-panel: #1b2422;
  --photos-border: #40504c;
  --photos-text: #f2f4ed;
  --photos-muted: #b7c0ba;
  --photos-accent: #8dd6c3;
  --photos-accent-soft: #294a42;
  --photos-control: #25302e;
  --photos-control-hover: #303e3b;
  --photos-media-bg: #090e0d;
  --photos-poll-bg: #263330;
  --photos-card-border: rgba(202, 218, 211, 0.16);
  --photos-card-shadow: 0 0 0.5rem rgba(0, 0, 0, 0.28), 0 0.45rem 1.3rem rgba(0, 0, 0, 0.34);
  --photos-highlight-border: rgba(244, 239, 232, 0.78);
  --photos-highlight-shadow: rgba(0, 0, 0, 0.75);

}
</style>
