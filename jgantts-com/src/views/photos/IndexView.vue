<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
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
  '117198059772006365'
]
const activePostStorageKey = 'photos-active-post'

const toots = ref<(TootThread | null)[]>(tootIds.map(() => null))
const loading = ref(true)
const error = ref<string | null>(null)
const tootLoads = new Map<number, Promise<void>>()

const activeTootIndex = ref<number | null>(null)
const selectedPostVisibility = ref(1)
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
  const postId = toots.value[nextIndex]?.post.id
  if (!postId) return

  localStorage.setItem(activePostStorageKey, postId)
}

function clearSelection() {
  activeTootIndex.value = null
  selectedPostVisibility.value = 1
  localStorage.removeItem(activePostStorageKey)
}

function handlePageClick(event: MouseEvent) {
  if (!activeToot.value) return

  const target = event.target
  if (!(target instanceof Element)) return
  if (target.closest('.comments-section') || target.closest('.photo-card')) return

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
  try {
    const savedPostId = localStorage.getItem(activePostStorageKey)
    const savedPostIndex = tootIds.indexOf(savedPostId ?? '')

    if (savedPostIndex >= 0) activeTootIndex.value = savedPostIndex
    await Promise.all(tootIds.map((_, index) => ensureTootLoaded(index)))

    loading.value = false
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not load Mastodon conversation'
  } finally {
    loading.value = false
  }
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
  <main class="photos-page" @click="handlePageClick">
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
              }"
              :style="{ '--selected-post-visibility': selectedPostVisibility }"
              :aria-hidden="activeTootIndex !== tootIndex || selectedPostVisibility <= 0.01"
            >
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

                  <header class="comments-header">
                    <h1>Comments</h1>
                    <span>{{ formatCount(replyCountsByPostId.get(toot.post.id) ?? 0) }}</span>
                  </header>
                </div>

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
  display: grid;
  gap: 0.65rem;
  grid-template-rows: auto minmax(0, 1fr);
  max-height: calc(100dvh - 9rem - var(--photos-gutter));
  overflow: hidden;
  padding: 0.85rem;
  grid-column: 2;
  position: sticky;
  top: 8rem;
  opacity: var(--selected-post-visibility, 1);
  transform: translateX(calc((1 - var(--selected-post-visibility, 1)) * 0.75rem));
  width: 100%;
  z-index: 10;
}

.comments-section.is-out-of-view {
  pointer-events: none;
}

.comments-header {
  align-items: baseline;
  display: flex;
  justify-content: space-between;
  padding: 0 0.15rem;
}

.comments-panel-heading {
  display: grid;
  gap: 0.45rem;
  min-height: 0;
  padding: 0 0.15rem 0.2rem;
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

.comments-panel-heading .comments-header {
  border-top: 1px solid color-mix(in srgb, var(--photos-border) 58%, transparent);
  margin-top: 0.25rem;
  padding-top: 0.65rem;
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
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0.15rem;
  scrollbar-width: thin;
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

  .comments-section {
    bottom: calc(var(--photos-gutter) + env(safe-area-inset-bottom, 0px));
    grid-column: 1;
    left: calc(var(--photos-gutter) + env(safe-area-inset-left, 0px));
    max-height: min(42dvh, 28rem);
    position: fixed;
    right: calc(var(--photos-gutter) + env(safe-area-inset-right, 0px));
    top: auto;
    width: auto;
    transform: translateY(calc((1 - var(--selected-post-visibility, 1)) * 0.75rem));
  }

  .comments-section.is-out-of-view {
    transform: translateY(0.75rem);
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
