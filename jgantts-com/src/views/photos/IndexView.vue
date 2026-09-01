<script setup lang="ts">
import useEmblaCarousel from 'embla-carousel-vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
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
]
const activePostStorageKey = 'photos-active-post'
const commentScrollStorageKey = 'photos-comment-scroll'

const toots = ref<TootThread[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const [tootCarouselRef, tootCarouselApi] = useEmblaCarousel({
  align: 'center',
  containScroll: false,
  loop: false,
})
const activeTootIndex = ref(0)
const tootScrollSnaps = ref<number[]>([])
const commentsSectionRef = ref<HTMLElement | null>(null)
const hasMultipleToots = computed(() => toots.value.length > 1)
const activeToot = computed(() => toots.value[activeTootIndex.value] ?? null)
let commentScrollPositions = loadCommentScrollPositions()
let scrollSaveFrame: number | null = null

const formatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function postUrl(post: MastodonStatus): string {
  return post.url ?? `https://${host}/@${post.account.acct}/${post.id}`
}

function loadCommentScrollPositions(): Record<string, number> {
  try {
    const storedPositions = JSON.parse(localStorage.getItem(commentScrollStorageKey) ?? '{}')
    return typeof storedPositions === 'object' && storedPositions !== null ? storedPositions : {}
  } catch {
    return {}
  }
}

function saveCommentPosition() {
  const postId = activeToot.value?.post.id
  const commentsSection = commentsSectionRef.value
  if (!postId || !commentsSection) return

  const sectionTop = commentsSection.getBoundingClientRect().top + window.scrollY
  if (window.scrollY < sectionTop - 1) return

  commentScrollPositions[postId] = Math.max(0, window.scrollY - sectionTop)
  localStorage.setItem(commentScrollStorageKey, JSON.stringify(commentScrollPositions))
}

function restoreCommentPosition(postId: string) {
  const savedPosition = commentScrollPositions[postId]
  if (savedPosition === undefined) return

  requestAnimationFrame(() => {
    const commentsSection = commentsSectionRef.value
    if (!commentsSection) return

    const sectionTop = commentsSection.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: sectionTop + savedPosition })
  })
}

function handlePageScroll() {
  if (scrollSaveFrame !== null) return

  scrollSaveFrame = requestAnimationFrame(() => {
    scrollSaveFrame = null
    saveCommentPosition()
  })
}

function syncCarouselState() {
  const api = tootCarouselApi.value
  if (!api) return

  tootScrollSnaps.value = api.scrollSnapList()
}

async function handleTootSelection() {
  const api = tootCarouselApi.value
  if (!api) return

  const nextIndex = api.selectedScrollSnap()
  if (nextIndex === activeTootIndex.value) return

  saveCommentPosition()
  activeTootIndex.value = nextIndex

  const postId = toots.value[nextIndex]?.post.id
  if (!postId) return

  localStorage.setItem(activePostStorageKey, postId)
  await nextTick()
  restoreCommentPosition(postId)
}

function scrollToToot(index: number) {
  tootCarouselApi.value?.scrollTo(index)
}

function scrollToPreviousToot() {
  tootCarouselApi.value?.scrollPrev()
}

function scrollToNextToot() {
  tootCarouselApi.value?.scrollNext()
}

watch(
  tootCarouselApi,
  (api) => {
    if (!api) return

    syncCarouselState()
    api.on('reInit', syncCarouselState).on('select', handleTootSelection)
  },
  { immediate: true },
)

onMounted(async () => {
  window.addEventListener('scroll', handlePageScroll, { passive: true })

  try {
    toots.value = await Promise.all(tootIds.map(loadToot))
    const savedPostId = localStorage.getItem(activePostStorageKey)
    const savedPostIndex = toots.value.findIndex(({ post }) => post.id === savedPostId)

    if (savedPostIndex >= 0) activeTootIndex.value = savedPostIndex

    await nextTick()
    tootCarouselApi.value?.reInit()
    tootCarouselApi.value?.scrollTo(activeTootIndex.value, true)

    const activePostId = activeToot.value?.post.id
    if (activePostId) restoreCommentPosition(activePostId)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not load Mastodon conversation'
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  saveCommentPosition()
  window.removeEventListener('scroll', handlePageScroll)
  if (scrollSaveFrame !== null) cancelAnimationFrame(scrollSaveFrame)
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
  return new Intl.NumberFormat().format(value)
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
          <header v-if="activeToot" class="post-meta-header">
            <a :href="activeToot.post.account.url" class="author-link">
              <img :src="activeToot.post.account.avatar" alt="" class="avatar avatar-large" />
              <span class="author-text">
                <strong>{{ displayName(activeToot.post.account) }}</strong>
                <span>@{{ activeToot.post.account.acct }}</span>
              </span>
            </a>
          </header>

          <div class="toot-viewport" ref="tootCarouselRef">
            <div class="toot-container">
              <section v-for="toot in toots" :key="toot.post.id" class="toot-thread">
        <article class="mastodon-post">
          <header class="post-date-header">
            <a :href="postUrl(toot.post)" class="timestamp">{{ formatDate(toot.post.created_at) }}</a>
          </header>

          <p v-if="toot.post.spoiler_text" class="content-warning">{{ toot.post.spoiler_text }}</p>

          <div class="status-content" v-html="toot.post.content"></div>

          <MediaCarousel
            v-if="toot.post.media_attachments.length"
            :attachments="toot.post.media_attachments"
            label="Post media"
          />

          <div v-if="toot.post.poll" class="poll">
            <div
              v-for="option in toot.post.poll.options"
              :key="option.title"
              class="poll-option"
            >
              <span class="poll-bar" :style="{ width: `${pollOptionPercent(option, toot.post.poll)}%` }"></span>
              <span class="poll-title">{{ option.title }}</span>
              <span class="poll-percent">{{ pollOptionPercent(option, toot.post.poll) }}%</span>
            </div>
            <p class="poll-meta">
              {{ formatCount(toot.post.poll.votes_count ?? 0) }} votes
            </p>
          </div>

          <a v-if="toot.post.card" :href="toot.post.card.url" class="link-card">
            <img v-if="toot.post.card.image" :src="toot.post.card.image" alt="" />
            <span class="link-card-copy">
              <span>{{ toot.post.card.provider_name }}</span>
              <strong>{{ toot.post.card.title }}</strong>
              <small>{{ toot.post.card.description }}</small>
            </span>
          </a>

          <footer class="status-stats">
            <span>{{ formatCount(toot.post.replies_count) }} replies</span>
            <span>{{ formatCount(toot.post.reblogs_count) }} boosts</span>
            <span>{{ formatCount(toot.post.favourites_count) }} favorites</span>
          </footer>
        </article>

              </section>
            </div>
          </div>

          <div v-if="hasMultipleToots" class="toot-carousel-controls">
            <button
              type="button"
              class="toot-carousel-control"
              aria-label="Previous post"
              :disabled="activeTootIndex === 0"
              @click="scrollToPreviousToot"
            >
              ←
            </button>
            <div class="toot-carousel-dots" aria-label="Post selection">
              <button
                v-for="(_, index) in tootScrollSnaps"
                :key="index"
                type="button"
                class="toot-carousel-dot"
                :class="{ 'is-selected': index === activeTootIndex }"
                :aria-label="`Show post ${index + 1}`"
                :aria-current="index === activeTootIndex ? 'true' : undefined"
                @click="scrollToToot(index)"
              />
            </div>
            <button
              type="button"
              class="toot-carousel-control"
              aria-label="Next post"
              :disabled="activeTootIndex === tootScrollSnaps.length - 1"
              @click="scrollToNextToot"
            >
              →
            </button>
          </div>

          <section
            v-if="activeToot"
            :key="activeToot.post.id"
            ref="commentsSectionRef"
            class="comments-section"
          >
            <header class="comments-header">
              <h1>Comments</h1>
              <span>{{ formatCount(countReplies(activeToot.comments)) }}</span>
            </header>

            <ol v-if="activeToot.comments.length" class="comment-list">
              <li
                v-for="comment in flattenComments(activeToot.comments)"
                :key="comment.id"
                :style="{ '--reply-depth': Math.min(comment.depth, 6) }"
                class="comment-item"
              >
                <article class="comment" :class="{ 'is-reply': comment.depth > 0 }">
                  <header class="status-header">
                    <a :href="comment.account.url" class="author-link">
                      <img :src="comment.account.avatar" alt="" class="avatar" />
                      <span class="author-text">
                        <strong>{{ displayName(comment.account) }}</strong>
                        <span>@{{ comment.account.acct }}</span>
                      </span>
                    </a>
                    <a :href="comment.url ?? comment.uri" class="timestamp">{{ formatDate(comment.created_at) }}</a>
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

            <p v-else class="empty-state">No comments yet.</p>
          </section>
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
  max-width: 60rem;
}

.toot-carousel {
  display: grid;
  gap: 1rem;
}

.toot-viewport {
  margin-bottom: calc(-1 * var(--photos-card-shadow-space));
  margin-left: calc(-1 * (var(--photos-gutter) + env(safe-area-inset-left, 0px)));
  margin-right: calc(-1 * (var(--photos-gutter) + env(safe-area-inset-right, 0px)));
  margin-top: calc(-1 * var(--photos-card-shadow-space));
  overflow: hidden;
  padding-bottom: var(--photos-card-shadow-space);
  padding-top: var(--photos-card-shadow-space);
}

.toot-container {
  display: flex;
  gap: 1rem;
  touch-action: pan-y pinch-zoom;
}

.toot-thread {
  display: grid;
  flex: 0 0 calc(68% - 0.75rem);
  gap: 0.75rem;
  margin-right: 0;
  min-width: 0;
}

.toot-carousel-controls {
  align-items: center;
  display: grid;
  grid-template-columns: 2rem 1fr 2rem;
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
  padding: 0 0.15rem;
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
  display: grid;
  gap: 0.65rem;
  margin-top: 0.75rem;
}

.comments-header {
  align-items: baseline;
  display: flex;
  justify-content: space-between;
  padding: 0 0.15rem;
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

.comment-list {
  display: grid;
  gap: 0.75rem;
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

@media (max-width: 36rem) {
  .toot-thread {
    flex-basis: calc(88% - 0.5rem);
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
  .toot-thread {
    flex-basis: min(56%, 30rem);
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

}
</style>
