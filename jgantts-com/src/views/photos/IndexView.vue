<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import QRCode from 'qrcode'
import ClusteredPhotoMasonry from './ClusteredPhotoMasonry.vue'
import PhotoCommentsPanel from './PhotoCommentsPanel.vue'
import type {
  DisplayPhotoComment,
  PhotoCommentsStatus,
  PhotoCommentsThread,
  ThreadedPhotoComment,
} from './photo-comments-types'
import { formatEditorialDateTime, machineEditorialDateTime } from '@/posts/editorial-date-time'
import type { CanonicalPost, MastodonCommentsResponse } from '@/posts/types'
import { postPath } from '@/posts/post-url'

const props = defineProps<{
  postId?: string
}>()
const router = useRouter() 
const preselectedPostStorageKey = 'photo-gallery-preselected-post-v1'

function initialPreselectedPostId() {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  try {
    if (navigation?.type === 'reload') {
      const storedPostId = sessionStorage.getItem(preselectedPostStorageKey)
      if (storedPostId !== null) return storedPostId || undefined
    }

    sessionStorage.setItem(preselectedPostStorageKey, props.postId ?? '')
  } catch {
    // A blocked session store still gets correct behavior until the next full reload.
  }
  return props.postId
}

const initiallyRoutedPostId = initialPreselectedPostId()

const localPosts = ref<CanonicalPost[]>([])
const localThreads = ref<PhotoCommentsThread[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const activeTootIndex = ref<number | null>(null)
const selectedPostVisibility = ref(1)
const commentsOpen = ref(false)
const commentsModalOpen = ref(false)
const shareQrCodeUrl = ref('')
const shareCopyStatus = ref('')
const qrDialogRef = ref<HTMLDialogElement | null>(null)
const qrDialogOpen = ref(false)
let qrPreviousDocumentOverflow: string | null = null
const activeToot = computed(() =>
  activeTootIndex.value === null ? null : allToots.value[activeTootIndex.value] ?? null,
)
const activeSharePhotoUrl = computed(() => {
  const attachment = activeToot.value?.post.media_attachments.find((item) => item.type === 'image')
  return attachment?.preview_url || attachment?.url || ''
})
const allToots = computed(() => localThreads.value)
const photoPosts = computed(() => allToots.value.map((toot) => toot.post))
const initiallyFeaturedPostId = computed(() => {
  if (!initiallyRoutedPostId) return undefined
  const localPost = localPosts.value.find((post) => post.slug === initiallyRoutedPostId)
  return localPost ? `local:${localPost.id}` : undefined
})
const commentsByPostId = computed(() => {
  const comments = new Map<string, DisplayPhotoComment[]>()
  allToots.value.forEach((toot) => {
    comments.set(toot.post.id, flattenComments(toot.comments))
  })
  return comments
})
const replyCountsByPostId = computed(() => {
  const counts = new Map<string, number>()
  allToots.value.forEach((toot) => {
    counts.set(toot.post.id, countReplies(toot.comments))
  })
  return counts
})

function photoRouteId(post: PhotoCommentsStatus) {
  const localPost = localPosts.value.find((candidate) => `local:${candidate.id}` === post.id)
  return localPost?.slug ?? post.id
}

function photoShareUrl(post: PhotoCommentsStatus) {
  return new URL(`/photos/${encodeURIComponent(photoRouteId(post))}`, window.location.origin).toString()
}

function photoShareTitle(post: PhotoCommentsStatus) {
  const localPost = localPosts.value.find((candidate) => `local:${candidate.id}` === post.id)
  return localPost?.title || 'A photo by Jacob Gantt'
}

function photoSocialShareUrl(network: 'facebook' | 'x' | 'linkedin', post: PhotoCommentsStatus) {
  const url = encodeURIComponent(photoShareUrl(post))
  const title = encodeURIComponent(photoShareTitle(post))
  if (network === 'facebook') return `https://www.facebook.com/sharer/sharer.php?u=${url}`
  if (network === 'linkedin') return `https://www.linkedin.com/sharing/share-offsite/?url=${url}`
  return `https://twitter.com/intent/tweet?url=${url}&text=${title}`
}

function photoEmailShareUrl(post: PhotoCommentsStatus) {
  const subject = encodeURIComponent(photoShareTitle(post))
  const body = encodeURIComponent(`I thought you might enjoy this:\n\n${photoShareUrl(post)}`)
  return `mailto:?subject=${subject}&body=${body}`
}

async function preparePhotoQrCode(post: PhotoCommentsStatus | undefined) {
  shareQrCodeUrl.value = ''
  if (!post) return
  try {
    shareQrCodeUrl.value = await QRCode.toDataURL(photoShareUrl(post), {
      errorCorrectionLevel: 'M', margin: 2, width: 512,
    })
  } catch {
    shareQrCodeUrl.value = ''
  }
}

async function copyPhotoShareLink(post: PhotoCommentsStatus) {
  try {
    await navigator.clipboard.writeText(photoShareUrl(post))
    shareCopyStatus.value = 'Link copied!'
  } catch {
    shareCopyStatus.value = 'Could not copy the link.'
  }
  window.setTimeout(() => { shareCopyStatus.value = '' }, 2500)
}

function openQrFullscreen() {
  if (!shareQrCodeUrl.value || !qrDialogRef.value) return
  if (qrDialogRef.value.open) return
  qrPreviousDocumentOverflow = document.documentElement.style.overflow
  document.documentElement.style.overflow = 'hidden'
  try {
    qrDialogRef.value.showModal()
    qrDialogOpen.value = true
  } catch {
    restoreQrDocumentOverflow()
  }
}

function closeQrFullscreen() {
  if (qrDialogRef.value?.open) qrDialogRef.value.close()
  else restoreQrDocumentOverflow()
}

function restoreQrDocumentOverflow() {
  qrDialogOpen.value = false
  if (qrPreviousDocumentOverflow === null) return
  document.documentElement.style.overflow = qrPreviousDocumentOverflow
  qrPreviousDocumentOverflow = null
}

function closeQrFromBackdrop(event: MouseEvent) {
  if (event.target === event.currentTarget) closeQrFullscreen()
}

function closePhotoShareMenus() {
  document.querySelectorAll<HTMLDetailsElement>('.photo-share-menu[open]').forEach((menu) => {
    menu.open = false
  })
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function localPostDateTime(post: CanonicalPost): { datetime: string; label: string } | null {
  const label = formatEditorialDateTime(post.date, post.time)
  const datetime = machineEditorialDateTime(post.date, post.time)
  return label && datetime ? { datetime, label } : null
}

function localPostOverlay(post: CanonicalPost): string {
  const dateTime = localPostDateTime(post)
  const content = [
    post.title ? `<p class="local-post-title"><em>${escapeHtml(post.title)}</em></p>` : '',
    post.bodyHtml,
    post.location ? `<p class="local-post-location">${escapeHtml(post.location)}</p>` : '',
    dateTime ? `<p class="local-post-datetime"><time datetime="${dateTime.datetime}">${escapeHtml(dateTime.label)}</time></p>` : '',
  ].filter(Boolean).join('')
  return `<div class="local-post-overlay">${content}</div>`
}

function selectToot(nextIndex: number) {
  const post = allToots.value[nextIndex]?.post
  if (!post) return
  activeTootIndex.value = nextIndex
  selectedPostVisibility.value = 1
  commentsOpen.value = false
  const postId = post.id

  const localPost = localPosts.value.find((candidate) => `local:${candidate.id}` === postId)
  const routeId = localPost?.slug ?? postId
  if (props.postId !== routeId) void router.push(`/photos/${routeId}`)
}

async function clearSelection(options: { restoreFocus?: boolean } = {}) {
  const selectedPostId = activeToot.value?.post.id
  closePhotoShareMenus()
  activeTootIndex.value = null
  selectedPostVisibility.value = 1
  commentsOpen.value = false
  commentsModalOpen.value = false
  if (props.postId) await router.push('/photos')
  if (!options.restoreFocus || !selectedPostId) return
  await nextTick()
  document.querySelector<HTMLElement>(
    `[data-cluster-key="${CSS.escape(selectedPostId)}"] .photo-card`,
  )?.focus()
}

function syncSelectionFromRoute(postId = props.postId) {
  const localIndex = localPosts.value.findIndex((post) => post.slug === postId)
  activeTootIndex.value = postId && localIndex >= 0 ? localIndex : null
  if (activeTootIndex.value === -1) activeTootIndex.value = null
  selectedPostVisibility.value = 1
}

async function scrollToRoutedPost(routeId: string, clusterId = routeId) {
  await nextTick()

  // ResizeObserver supplies the masonry width on the next frame. Retry briefly so
  // direct links land correctly even when photos and layout initialize at once.
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    if (props.postId !== routeId) return

    const cluster = document.querySelector<HTMLElement>(
      `[data-cluster-key="${CSS.escape(clusterId)}"]`,
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

watch(activeToot, (toot) => {
  shareCopyStatus.value = ''
  closePhotoShareMenus()
  void preparePhotoQrCode(toot?.post)
})

function handlePageClick(event: MouseEvent) {
  const activePostId = activeToot.value?.post.id
  if (!activePostId) return

  const target = event.target
  if (!(target instanceof Element)) return
  if (!target.closest('.photo-share-menu')) closePhotoShareMenus()
  if (target.closest('.photo-comments') || target.closest('.photo-lightbox')) return

  const photoCard = target.closest('.photo-card')
  const photoCluster = photoCard?.closest<HTMLElement>('[data-cluster-key]')
  if (photoCluster?.dataset.clusterKey === activePostId) return

  clearSelection()
}

onMounted(async () => {
  document.addEventListener('click', handlePageClick)

  try {
    syncSelectionFromRoute()
    await fetch('/api/posts?limit=50').then(async (response) => {
        if (!response.ok) return
        const page = await response.json() as { items?: CanonicalPost[] }
        const routedSlug = props.postId
        const items = page.items ?? []
        if (routedSlug && !items.some((post) => post.slug === routedSlug)) {
          const routedResponse = await fetch(`/api/posts/${encodeURIComponent(routedSlug)}`)
          if (routedResponse.ok) items.push(await routedResponse.json() as CanonicalPost)
        }
        localPosts.value = items.filter((post) => post.media.length > 0)
        localThreads.value = localPosts.value.map((post) => ({
          post: {
            account: { acct: 'jgantts', avatar: '/favicon.png', display_name: 'Jacob Gantt', url: '/', username: 'jgantts' },
            content: localPostOverlay(post),
            created_at: post.publishedAt,
            favourites_count: 0,
            id: `local:${post.id}`,
            media_attachments: post.media.map((media) => ({
              description: media.altText,
              localMedia: media,
              meta: { original: { height: media.height ?? undefined, width: media.width ?? undefined } },
              preview_url: media.urls.thumbnail,
              thumbhash: media.thumbhash,
              type: 'image' as const,
              url: media.urls.large,
            })),
            mentions: [],
            reblogs_count: 0,
            replies_count: 0,
            sensitive: false,
            spoiler_text: '',
            tags: [],
            uri: postPath(post),
            url: postPath(post),
            visibility: 'public' as const,
            in_reply_to_id: null,
          },
          comments: [],
          discussionState: 'loading',
          remoteUrl: null,
          stale: false,
          truncated: false,
        }))
        void Promise.all(localThreads.value.map(async (thread, index) => {
          try {
            const commentsResponse = await fetch(`/api/posts/${encodeURIComponent(localPosts.value[index]!.slug)}/comments/mastodon`)
            if (!commentsResponse.ok) {
              thread.discussionState = 'unavailable'
              return
            }
            const result = await commentsResponse.json() as MastodonCommentsResponse
            thread.remoteUrl = result.remoteUrl ?? null
            thread.discussionState = result.state
            thread.stale = result.stale
            thread.truncated = result.truncated
            const statuses = (result.comments ?? []).map((comment) => ({
              account: { acct: comment.account.handle, avatar: comment.account.avatarUrl ?? '/favicon.png', display_name: comment.account.displayName, url: comment.account.url, username: comment.account.handle },
              content: comment.contentHtml,
              created_at: comment.createdAt,
              favourites_count: 0,
              id: comment.id,
              media_attachments: comment.attachments.map((attachment) => ({
                description: attachment.description,
                preview_url: attachment.previewUrl,
                type: 'image' as const,
                url: attachment.url,
              })),
              mentions: [],
              reblogs_count: 0,
              replies_count: 0,
              sensitive: false,
              spoiler_text: '',
              tags: [],
              uri: comment.url,
              url: comment.url,
              visibility: 'public' as const,
              in_reply_to_id: comment.parentId,
            })) as PhotoCommentsStatus[]
            thread.comments = buildCommentTree(statuses)
          } catch {
            // The local post remains browsable when its remote discussion is unavailable.
            thread.discussionState = 'unavailable'
          }
        }))
      }).catch(() => {
        error.value = 'Could not load photo posts.'
      })

    // The first route sync runs before the asynchronous local-post collection is
    // available. Resolve it again now so a hard refresh retains the selected post.
    syncSelectionFromRoute()
    loading.value = false
    if (props.postId && activeToot.value) {
      await scrollToRoutedPost(props.postId, activeToot.value.post.id)
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not load photo posts.'
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handlePageClick)
  restoreQrDocumentOverflow()
})

function buildCommentTree(descendants: PhotoCommentsStatus[]): ThreadedPhotoComment[] {
  const statuses = new Map<string, ThreadedPhotoComment>()

  descendants.forEach((status) => {
    statuses.set(status.id, {
      ...status,
      replies: [],
    })
  })

  const roots: ThreadedPhotoComment[] = []

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

function countReplies(statuses: ThreadedPhotoComment[]): number {
  return statuses.reduce((count, status) => count + 1 + countReplies(status.replies), 0)
}

function flattenComments(statuses: ThreadedPhotoComment[], depth = 0): DisplayPhotoComment[] {
  return statuses.flatMap((status) => [
    {
      ...status,
      depth,
    },
    ...flattenComments(status.replies, depth + 1),
  ])
}

</script>

<template>
  <main class="photos-page">
    <section class="conversation-shell" aria-live="polite">
      <div v-if="loading" class="loading-state">
        Loading photo posts...
      </div>

      <div v-else-if="error" class="error-state">
        <p>{{ error }}</p>
      </div>

      <section
        v-if="!loading && !error && allToots.length"
        class="toot-carousel"
        aria-label="Photo posts"
      >
          <div
            class="gallery-surface"
            :aria-hidden="commentsModalOpen ? 'true' : undefined"
            :inert="commentsModalOpen || undefined"
          >
            <ClusteredPhotoMasonry
              :posts="photoPosts"
              :active-post-id="activeToot?.post.id"
              :initially-featured-post-id="initiallyFeaturedPostId"
              :interaction-paused="commentsModalOpen"
              @select="selectToot"
              @clear="clearSelection"
              @visibility="selectedPostVisibility = $event"
            />
          </div>

          <PhotoCommentsPanel
            v-if="activeToot"
            :key="activeToot.post.id"
            v-model:open="commentsOpen"
            :comments="commentsByPostId.get(activeToot.post.id) ?? []"
            :discussion-state="activeToot.discussionState"
            :email-share-url="photoEmailShareUrl(activeToot.post)"
            :facebook-share-url="photoSocialShareUrl('facebook', activeToot.post)"
            :linkedin-share-url="photoSocialShareUrl('linkedin', activeToot.post)"
            :post="activeToot.post"
            :qr-code-url="shareQrCodeUrl"
            :qr-download-name="`${photoRouteId(activeToot.post)}-qr-code.png`"
            :remote-url="activeToot.remoteUrl"
            :reply-count="replyCountsByPostId.get(activeToot.post.id) ?? 0"
            :share-status="shareCopyStatus"
            :stale="activeToot.stale"
            :truncated="activeToot.truncated"
            :x-share-url="photoSocialShareUrl('x', activeToot.post)"
            @clear-selection="clearSelection({ restoreFocus: true })"
            @close-share-menus="closePhotoShareMenus"
            @copy-link="copyPhotoShareLink(activeToot.post)"
            @modal-change="commentsModalOpen = $event"
            @open-qr="openQrFullscreen"
          />
      </section>
    </section>

    <dialog
      ref="qrDialogRef"
      class="photo-qr-dialog"
      aria-labelledby="photo-qr-dialog-title"
      @click="closeQrFromBackdrop"
      @close="restoreQrDocumentOverflow"
    >
      <img
        v-if="qrDialogOpen && activeSharePhotoUrl"
        :src="activeSharePhotoUrl"
        alt=""
        class="photo-qr-dialog-backdrop"
        aria-hidden="true"
        @click="closeQrFullscreen"
      >
      <div class="photo-qr-dialog-content">
        <figure v-if="qrDialogOpen && activeSharePhotoUrl" class="photo-qr-dialog-photo">
          <img :src="activeSharePhotoUrl" alt="The photo being shared">
          <figcaption>{{ activeToot ? photoShareTitle(activeToot.post) : 'Photo by Jacob Gantt' }}</figcaption>
        </figure>
        <div class="photo-qr-dialog-share">
          <header>
            <div>
              <h2 id="photo-qr-dialog-title">Scan to view this photo</h2>
              <p>Point a phone camera at the code.</p>
            </div>
            <button type="button" class="photo-qr-dialog-close" aria-label="Close full-screen QR code" @click="closeQrFullscreen">
              <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </header>
          <img v-if="shareQrCodeUrl" :src="shareQrCodeUrl" alt="QR code for this photo post" class="photo-qr-dialog-code">
          <p v-if="activeToot" class="photo-qr-dialog-url">{{ photoShareUrl(activeToot.post) }}</p>
          <div v-if="activeToot" class="photo-qr-dialog-actions">
            <button type="button" @click="copyPhotoShareLink(activeToot.post)">Copy link</button>
            <a :href="shareQrCodeUrl" :download="`${photoRouteId(activeToot.post)}-qr-code.png`">Download QR code</a>
          </div>
          <p class="photo-qr-dialog-status" role="status" aria-live="polite">{{ shareCopyStatus }}</p>
        </div>
      </div>
    </dialog>
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
  min-height: 100dvh;
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

.gallery-surface {
  min-width: 0;
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


.photo-qr-dialog {
  background: color-mix(in srgb, var(--photos-media-bg) 72%, transparent);
  border: 0;
  box-sizing: border-box;
  color-scheme: light dark;
  display: none;
  height: 100dvh;
  margin: 0;
  max-height: none;
  max-width: none;
  padding: max(0.75rem, env(safe-area-inset-top, 0px)) max(0.75rem, env(safe-area-inset-right, 0px)) max(0.75rem, env(safe-area-inset-bottom, 0px)) max(0.75rem, env(safe-area-inset-left, 0px));
  width: 100vw;
}

.photo-qr-dialog[open] {
  display: flex;
}

.photo-qr-dialog::backdrop {
  background: color-mix(in srgb, var(--photos-media-bg) 88%, transparent);
}

.photo-qr-dialog-backdrop {
  filter: blur(20px) brightness(0.42) saturate(0.8);
  height: calc(100% + 3rem);
  inset: -1.5rem;
  object-fit: cover;
  opacity: 0.7;
  pointer-events: auto;
  position: fixed;
  transform: scale(1.04);
  width: calc(100% + 3rem);
}

.photo-qr-dialog-content {
  background: color-mix(in srgb, var(--photos-panel) 96%, transparent);
  border-radius: clamp(0.75rem, 2vw, 1.25rem);
  box-shadow: 0 1.5rem 5rem rgba(0, 0, 0, 0.38);
  box-sizing: border-box;
  color: var(--photos-text);
  display: grid;
  flex: 1;
  gap: clamp(0.8rem, 2vw, 1.5rem);
  grid-template-columns: minmax(0, 0.9fr) minmax(18rem, 1fr);
  margin: auto;
  max-height: 100%;
  max-width: 72rem;
  overflow: auto;
  padding: clamp(1rem, 3vmin, 2rem);
  position: relative;
  width: 100%;
  z-index: 1;
}

.photo-qr-dialog-photo {
  align-self: stretch;
  background: var(--photos-media-bg);
  border-radius: 0.75rem;
  display: grid;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

.photo-qr-dialog-photo img {
  height: 100%;
  max-height: calc(100dvh - 4rem);
  min-height: 18rem;
  object-fit: cover;
  width: 100%;
}

.photo-qr-dialog-photo figcaption {
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.82));
  bottom: 0;
  color: white;
  font-size: 0.85rem;
  font-weight: 650;
  left: 0;
  padding: 2.5rem 1rem 1rem;
  position: absolute;
  right: 0;
}

.photo-qr-dialog-share {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: clamp(0.5rem, 1.5vh, 1rem);
  justify-content: center;
  min-width: 0;
}

.photo-qr-dialog-share > header {
  align-items: flex-start;
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  max-width: 36rem;
  width: 100%;
}

.photo-qr-dialog-share h2 {
  font-size: clamp(1.15rem, 3vw, 1.65rem);
  font-weight: 800;
}

.photo-qr-dialog-share header p {
  color: var(--photos-muted);
  font-size: clamp(0.75rem, 2vw, 0.9rem);
  margin-top: 0.25rem;
}

.photo-qr-dialog-code {
  background: white;
  border-radius: 0.5rem;
  flex: 0 1 auto;
  height: min(48vmin, calc(100dvh - 13rem));
  image-rendering: pixelated;
  min-height: 10rem;
  min-width: 10rem;
  object-fit: contain;
  width: min(48vmin, calc(50vw - 4rem));
}

.photo-qr-dialog-url {
  color: var(--photos-muted);
  font-family: 'Azeret Mono Variable', monospace;
  font-size: clamp(0.62rem, 1.8vw, 0.78rem);
  max-width: 100%;
  overflow: hidden;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.photo-qr-dialog-close {
  align-items: center;
  background: var(--photos-control);
  border: 1px solid var(--photos-border);
  border-radius: 50%;
  color: var(--photos-text);
  cursor: pointer;
  display: inline-flex;
  flex: 0 0 auto;
  height: 44px;
  justify-content: center;
  width: 44px;
}

.photo-qr-dialog-close svg {
  fill: none;
  height: 1.2rem;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-width: 2;
  width: 1.2rem;
}

.photo-qr-dialog-close:focus-visible {
  outline: 2px solid var(--photos-accent);
  outline-offset: 2px;
}

.photo-qr-dialog-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

.photo-qr-dialog-actions button,
.photo-qr-dialog-actions a {
  align-items: center;
  background: var(--photos-accent);
  border: 1px solid var(--photos-accent);
  border-radius: 999px;
  color: var(--photos-panel);
  cursor: pointer;
  display: inline-flex;
  font-family: 'Azeret Mono Variable', monospace;
  font-size: 0.72rem;
  font-weight: 700;
  min-height: 44px;
  padding: 0.6rem 0.8rem;
  text-decoration: none;
}

.photo-qr-dialog-actions a {
  background: var(--photos-panel);
  color: var(--photos-accent);
}

.photo-qr-dialog-actions button:focus-visible,
.photo-qr-dialog-actions a:focus-visible {
  outline: 2px solid var(--photos-accent);
  outline-offset: 2px;
}

.photo-qr-dialog-status {
  color: var(--photos-muted);
  font-size: 0.72rem;
  min-height: 1em;
}

@media (max-width: 46rem) {
  .photo-qr-dialog-content {
    background: color-mix(in srgb, var(--photos-panel) 94%, transparent);
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .photo-qr-dialog-photo {
    display: none;
  }

  .photo-qr-dialog-code {
    height: min(72vmin, calc(100dvh - 14rem));
    width: min(72vmin, calc(100vw - 3.5rem));
  }
}

@media (orientation: landscape) and (max-height: 36rem) {
  .photo-qr-dialog-content {
    gap: 0.75rem;
    grid-template-columns: minmax(0, 0.75fr) minmax(17rem, 1fr);
    overflow: hidden;
    padding: 0.75rem;
  }

  .photo-qr-dialog-photo figcaption,
  .photo-qr-dialog-share header p {
    display: none;
  }

  .photo-qr-dialog-share {
    gap: 0.35rem;
  }

  .photo-qr-dialog-share h2 {
    font-size: 1rem;
  }

  .photo-qr-dialog-code {
    height: min(35vmin, calc(100dvh - 11rem));
    min-height: 7rem;
    min-width: 7rem;
    width: min(35vmin, calc(50vw - 3rem));
  }

  .photo-qr-dialog-actions button,
  .photo-qr-dialog-actions a {
    min-height: 40px;
    padding: 0.45rem 0.7rem;
  }
}


@media (max-width: 64rem), (max-height: 36rem) {
  .toot-carousel {
    grid-template-columns: minmax(0, 1fr);
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
