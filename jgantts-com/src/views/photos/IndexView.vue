<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import QRCode from 'qrcode'
import ClusteredPhotoMasonry from './ClusteredPhotoMasonry.vue'
import MediaCarousel from '@/components/MediaCarousel.vue'
import { formatEditorialDateTime, machineEditorialDateTime } from '@/posts/editorial-date-time'
import type { CanonicalPost } from '@/posts/types'
import { postPath } from '@/posts/post-url'

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
  remoteUrl: string | null
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

const toots = ref<(TootThread | null)[]>(tootIds.map(() => null))
const localPosts = ref<CanonicalPost[]>([])
const localThreads = ref<TootThread[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const tootLoads = new Map<number, Promise<void>>()

const activeTootIndex = ref<number | null>(null)
const selectedPostVisibility = ref(1)
const commentsDrawerState = ref<0 | 1 | 2>(0)
const commentsDrawerOpen = computed(() => commentsDrawerState.value > 0)
const commentsDrawerFull = computed(() => commentsDrawerState.value === 2)
const mobilePortraitDrawer = ref(false)
const commentsDrawerDragging = ref(false)
const commentsDrawerDragOffset = ref(0)
const shareQrCodeUrl = ref('')
const shareCopyStatus = ref('')
const qrDialogRef = ref<HTMLDialogElement | null>(null)
let commentsDrawerPointerStartY = 0
let commentsDrawerPointerStartOffset = 0
let commentsDrawerPointerStartedAt = 0
let commentsDrawerPointerStartState: 0 | 1 | 2 = 0
let mobilePortraitDrawerQuery: MediaQueryList | null = null
const activeToot = computed(() =>
  activeTootIndex.value === null ? null : allToots.value[activeTootIndex.value] ?? null,
)
const activeSharePhotoUrl = computed(() => {
  const attachment = activeToot.value?.post.media_attachments.find((item) => item.type === 'image')
  return attachment?.url || attachment?.preview_url || ''
})
const allToots = computed(() => [...toots.value.filter((toot): toot is TootThread => Boolean(toot)), ...localThreads.value])
const photoPosts = computed(() => allToots.value.map((toot) => toot.post))
const initiallyFeaturedPostId = computed(() => {
  if (!initiallyRoutedPostId) return undefined
  const localPost = localPosts.value.find((post) => post.slug === initiallyRoutedPostId)
  return localPost ? `local:${localPost.id}` : initiallyRoutedPostId
})
const commentsByPostId = computed(() => {
  const comments = new Map<string, DisplayStatus[]>()
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

function photoRouteId(post: MastodonStatus) {
  const localPost = localPosts.value.find((candidate) => `local:${candidate.id}` === post.id)
  return localPost?.slug ?? post.id
}

function photoShareUrl(post: MastodonStatus) {
  return new URL(`/photos/${encodeURIComponent(photoRouteId(post))}`, window.location.origin).toString()
}

function photoShareTitle(post: MastodonStatus) {
  const localPost = localPosts.value.find((candidate) => `local:${candidate.id}` === post.id)
  return localPost?.title || 'A photo by Jacob Gantt'
}

function photoSocialShareUrl(network: 'facebook' | 'x' | 'linkedin', post: MastodonStatus) {
  const url = encodeURIComponent(photoShareUrl(post))
  const title = encodeURIComponent(photoShareTitle(post))
  if (network === 'facebook') return `https://www.facebook.com/sharer/sharer.php?u=${url}`
  if (network === 'linkedin') return `https://www.linkedin.com/sharing/share-offsite/?url=${url}`
  return `https://twitter.com/intent/tweet?url=${url}&text=${title}`
}

function photoEmailShareUrl(post: MastodonStatus) {
  const subject = encodeURIComponent(photoShareTitle(post))
  const body = encodeURIComponent(`I thought you might enjoy this:\n\n${photoShareUrl(post)}`)
  return `mailto:?subject=${subject}&body=${body}`
}

async function preparePhotoQrCode(post: MastodonStatus | undefined) {
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

async function copyPhotoShareLink(post: MastodonStatus) {
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
  qrDialogRef.value.showModal()
}

function closeQrFullscreen() {
  qrDialogRef.value?.close()
}

function closeQrFromBackdrop(event: MouseEvent) {
  if (event.target === event.currentTarget) closeQrFullscreen()
}

const formatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})
const numberFormatter = new Intl.NumberFormat()
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
  commentsDrawerState.value = 0
  commentsDrawerDragOffset.value = 0
  const postId = post.id

  const localPost = localPosts.value.find((candidate) => `local:${candidate.id}` === postId)
  const routeId = localPost?.slug ?? postId
  if (props.postId !== routeId) void router.push(`/photos/${routeId}`)
}

function clearSelection() {
  activeTootIndex.value = null
  selectedPostVisibility.value = 1
  commentsDrawerState.value = 0
  commentsDrawerDragOffset.value = 0
  if (props.postId) void router.push('/photos')
}

function syncSelectionFromRoute(postId = props.postId) {
  const localIndex = localPosts.value.findIndex((post) => post.slug === postId)
  activeTootIndex.value = postId
    ? (tootIds.indexOf(postId) >= 0
      ? tootIds.indexOf(postId)
      : localIndex >= 0 ? tootIds.length + localIndex : -1)
    : null
  if (activeTootIndex.value === -1) activeTootIndex.value = null
  selectedPostVisibility.value = 1
  commentsDrawerState.value = 0
  commentsDrawerDragOffset.value = 0
}

function isMobilePortraitDrawer() {
  return mobilePortraitDrawerQuery?.matches
    ?? window.matchMedia('(max-width: 44rem) and (orientation: portrait)').matches
}

function syncMobilePortraitDrawer() {
  mobilePortraitDrawer.value = isMobilePortraitDrawer()
}

function stepCommentsDrawer(direction: -1 | 1) {
  commentsDrawerState.value = Math.min(
    2,
    Math.max(0, commentsDrawerState.value + direction),
  ) as 0 | 1 | 2
  commentsDrawerDragOffset.value = 0
}

function lowerCommentsDrawer() {
  commentsDrawerState.value = 0
  commentsDrawerDragOffset.value = 0
}

function toggleCommentsDrawer() {
  commentsDrawerState.value = commentsDrawerState.value === 2
    ? 1
    : Math.min(2, commentsDrawerState.value + 1) as 0 | 1 | 2
  commentsDrawerDragOffset.value = 0
}

function commentsDrawerOffsets(panel: HTMLElement) {
  const handle = panel.querySelector<HTMLElement>('.comments-drawer-handle')
  const collapsedHeight = handle?.offsetHeight ?? 72
  const closed = Math.max(0, panel.offsetHeight - collapsedHeight)
  return [closed, Math.min(closed, window.innerHeight * 0.42), 0] as const
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
}

function finishCommentsDrawerDrag(event: PointerEvent) {
  if (!commentsDrawerDragging.value) return

  const panel = (event.currentTarget as HTMLElement).closest<HTMLElement>('.comments-section')
  const handle = panel?.querySelector<HTMLElement>('.comments-drawer-handle')
  if (!panel || !handle) return
  const elapsed = Math.max(1, performance.now() - commentsDrawerPointerStartedAt)
  const distance = event.clientY - commentsDrawerPointerStartY
  const velocity = distance / elapsed
  const offsets = commentsDrawerOffsets(panel)

  // A bottom sheet should respond to an intentional swipe without requiring the
  // user to drag through half of a tall viewport. Keep distance as a fallback
  // for slower, deliberate swipes (especially useful with a thumb).
  if (velocity < -0.35 || distance < -44) {
    commentsDrawerState.value = Math.min(2, commentsDrawerPointerStartState + 1) as 0 | 1 | 2
  } else if (velocity > 0.35 || distance > 44) {
    commentsDrawerState.value = Math.max(0, commentsDrawerPointerStartState - 1) as 0 | 1 | 2
  } else if (Math.abs(distance) < 8 && elapsed < 350) {
    toggleCommentsDrawer()
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
}

function cancelCommentsDrawerDrag() {
  if (!commentsDrawerDragging.value) return
  commentsDrawerState.value = commentsDrawerPointerStartState
  commentsDrawerDragging.value = false
  commentsDrawerDragOffset.value = 0
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
  void preparePhotoQrCode(toot?.post)
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
  mobilePortraitDrawerQuery = window.matchMedia('(max-width: 44rem) and (orientation: portrait)')
  syncMobilePortraitDrawer()
  mobilePortraitDrawerQuery.addEventListener('change', syncMobilePortraitDrawer)
  document.addEventListener('click', handlePageClick)

  try {
    syncSelectionFromRoute()
    await Promise.all([
      ...tootIds.map((_, index) => ensureTootLoaded(index)),
      fetch('/api/posts?limit=50').then(async (response) => {
        if (!response.ok) return
        const page = await response.json() as { items?: CanonicalPost[] }
        const routedSlug = props.postId
        const items = page.items ?? []
        if (routedSlug && !tootIds.includes(routedSlug) && !items.some((post) => post.slug === routedSlug)) {
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
              meta: { original: { height: media.height ?? undefined, width: media.width ?? undefined } },
              preview_url: media.urls.thumbnail,
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
          remoteUrl: null,
        }))
        await Promise.all(localThreads.value.map(async (thread, index) => {
          try {
            const commentsResponse = await fetch(`/api/posts/${encodeURIComponent(localPosts.value[index]!.slug)}/comments/mastodon`)
            if (!commentsResponse.ok) return
            const result = await commentsResponse.json() as {
              comments?: Array<Record<string, any>>
              remoteUrl?: string | null
            }
            thread.remoteUrl = result.remoteUrl ?? null
            const statuses = (result.comments ?? []).map((comment) => ({
              account: { acct: comment.account.handle, avatar: comment.account.avatarUrl ?? '/favicon.png', display_name: comment.account.displayName, url: comment.account.url, username: comment.account.handle },
              content: comment.contentHtml,
              created_at: comment.createdAt,
              favourites_count: 0,
              id: comment.id,
              media_attachments: [],
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
            })) as MastodonStatus[]
            thread.comments = buildCommentTree(statuses)
          } catch {
            // The local post remains browsable when its remote discussion is unavailable.
          }
        }))
      }).catch(() => {
        // Mastodon remains useful when the local-post API is temporarily unavailable.
      }),
    ])

    // The first route sync runs before the asynchronous local-post collection is
    // available. Resolve it again now so a hard refresh retains the selected post.
    syncSelectionFromRoute()
    loading.value = false
    if (props.postId && activeToot.value) {
      if (isMobilePortraitDrawer()) commentsDrawerState.value = 1
      await scrollToRoutedPost(props.postId, activeToot.value.post.id)
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not load Mastodon conversation'
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  mobilePortraitDrawerQuery?.removeEventListener('change', syncMobilePortraitDrawer)
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
    remoteUrl: post.url,
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

function commentCountLabel(postId: string): string {
  const count = replyCountsByPostId.value.get(postId) ?? 0
  return `${formatCount(count)} ${count === 1 ? 'comment' : 'comments'}`
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
            :initially-featured-post-id="initiallyFeaturedPostId"
            @select="selectToot"
            @clear="clearSelection"
            @visibility="selectedPostVisibility = $event"
          />

          <template
            v-for="(toot, tootIndex) in allToots"
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
              }"
              :aria-hidden="activeTootIndex !== tootIndex || selectedPostVisibility <= 0.01"
              aria-label="Post comments"
            >
              <div
                class="comments-drawer-handle"
                @pointerdown="startCommentsDrawerDrag"
                @pointermove="moveCommentsDrawer"
                @pointerup="finishCommentsDrawerDrag"
                @pointercancel="cancelCommentsDrawerDrag"
              >
                <span class="comments-drawer-grabber" aria-hidden="true"></span>
                <div class="comments-drawer-controls" aria-label="Comments panel controls">
                  <button
                    type="button"
                    aria-label="Close comments"
                    @click.stop="clearSelection"
                    @pointerdown.stop
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24">
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    aria-label="Move comments panel up"
                    :disabled="commentsDrawerState === 2"
                    @click.stop="stepCommentsDrawer(1)"
                    @pointerdown.stop
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24">
                      <path d="m6 15 6-6 6 6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    aria-label="Move comments panel fully down"
                    :disabled="commentsDrawerState === 0"
                    @click.stop="lowerCommentsDrawer"
                    @pointerdown.stop
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                </div>
                <div class="comments-drawer-post">
                  <div class="comments-drawer-post-summary" v-html="toot.post.content"></div>
                  <time
                    v-if="!toot.post.id.startsWith('local:')"
                    class="comments-drawer-post-date"
                    :datetime="toot.post.created_at"
                  >
                    {{ formatDate(toot.post.created_at) }}
                  </time>
                  <span class="comments-drawer-comments-meta">
                    {{ commentCountLabel(toot.post.id) }}
                  </span>
                </div>
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

              <div
                class="comments-drawer-scroll"
                :aria-hidden="mobilePortraitDrawer && !commentsDrawerOpen"
                :inert="mobilePortraitDrawer && !commentsDrawerOpen"
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
                  <time v-if="!toot.post.id.startsWith('local:')" class="comments-post-date" :datetime="toot.post.created_at">
                    {{ formatDate(toot.post.created_at) }}
                  </time>
                </div>

                <header class="comments-header">
                  <h1>Replies</h1>
                  <span>{{ formatCount(replyCountsByPostId.get(toot.post.id) ?? 0) }} {{ (replyCountsByPostId.get(toot.post.id) ?? 0) === 1 ? 'reply' : 'replies' }}</span>
                  <details class="photo-share-menu">
                    <summary class="photo-share-button" aria-label="Share this photo post">
                      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M18 16a3 3 0 0 0-2.4 1.2l-6.7-3.9a3.4 3.4 0 0 0 0-2.6l6.7-3.9A3 3 0 1 0 15 5a3 3 0 0 0 .1.7L8.4 9.6a3 3 0 1 0 0 4.8l6.7 3.9A3 3 0 1 0 18 16Z"/></svg>
                      Share
                    </summary>
                    <div class="photo-share-popover">
                      <p>Share this photo post</p>
                      <a :href="photoSocialShareUrl('facebook', toot.post)" target="_blank" rel="noopener noreferrer">Share on Facebook <span aria-hidden="true">↗</span></a>
                      <a :href="photoSocialShareUrl('x', toot.post)" target="_blank" rel="noopener noreferrer">Share on X <span aria-hidden="true">↗</span></a>
                      <a :href="photoSocialShareUrl('linkedin', toot.post)" target="_blank" rel="noopener noreferrer">Share on LinkedIn <span aria-hidden="true">↗</span></a>
                      <a :href="photoEmailShareUrl(toot.post)">Share by email</a>
                      <button type="button" @click="copyPhotoShareLink(toot.post)">Copy link</button>
                      <p class="photo-share-status" role="status" aria-live="polite">{{ shareCopyStatus }}</p>
                      <details class="photo-qr-share">
                        <summary>Share as QR code</summary>
                        <div class="photo-qr-panel">
                          <button
                            v-if="shareQrCodeUrl"
                            type="button"
                            class="photo-qr-fullscreen-trigger"
                            aria-label="Enlarge QR code to fill the window"
                            @click="openQrFullscreen"
                          >
                            <img :src="shareQrCodeUrl" alt="QR code for this photo post">
                            <span>
                              <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" /></svg>
                              Tap to enlarge
                            </span>
                          </button>
                          <p v-else>QR code unavailable.</p>
                          <p>Scan to open this photo post</p>
                          <a v-if="shareQrCodeUrl" :href="shareQrCodeUrl" :download="`${photoRouteId(toot.post)}-qr-code.png`">Download QR code</a>
                        </div>
                      </details>
                    </div>
                  </details>
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

                <a
                  v-if="toot.remoteUrl"
                  class="mastodon-reply-link"
                  :href="toot.remoteUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                >Reply on Mastodon <span aria-hidden="true">↗</span></a>
              </div>
            </section>
          </template>
      </section>
    </section>

    <dialog
      ref="qrDialogRef"
      class="photo-qr-dialog"
      aria-labelledby="photo-qr-dialog-title"
      @click="closeQrFromBackdrop"
    >
      <img
        v-if="activeSharePhotoUrl"
        :src="activeSharePhotoUrl"
        alt=""
        class="photo-qr-dialog-backdrop"
        aria-hidden="true"
        @click="closeQrFullscreen"
      >
      <div class="photo-qr-dialog-content">
        <figure v-if="activeSharePhotoUrl" class="photo-qr-dialog-photo">
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
  grid-template-columns: minmax(0, 1fr) auto auto;
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

.comments-post-text :deep(.local-post-title) {
  font-size: 1.05rem;
  font-style: italic;
}

.comments-post-text :deep(.local-post-title em) {
  font-style: italic;
}

.comments-post-text :deep(.local-post-overlay) {
  display: grid;
  gap: 0.65rem;
}

.comments-post-text :deep(.local-post-overlay p) {
  display: block;
  margin: 0;
}

.comments-post-text :deep(.local-post-overlay p + p)::before {
  content: none;
}

.comments-post-text :deep(.local-post-location),
.comments-post-text :deep(.local-post-datetime) {
  color: var(--photos-muted);
  font-family: 'Azeret Mono Variable', monospace;
  font-size: 0.75rem;
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

.photo-share-menu {
  position: relative;
}

.photo-share-button {
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
  gap: 0.4rem;
  list-style: none;
  padding: 0.55rem 0.75rem;
}

.photo-share-button::-webkit-details-marker,
.photo-qr-share > summary::-webkit-details-marker {
  display: none;
}

.photo-share-button svg {
  fill: currentColor;
  height: 0.9rem;
  width: 0.9rem;
}

.photo-share-button:hover {
  filter: brightness(1.08);
}

.photo-share-button:focus-visible,
.photo-share-popover a:focus-visible,
.photo-share-popover button:focus-visible,
.photo-qr-share > summary:focus-visible {
  outline: 2px solid var(--photos-accent);
  outline-offset: 2px;
}

.photo-share-popover {
  background: var(--photos-panel);
  border: 1px solid var(--photos-border);
  border-radius: 0.65rem;
  box-shadow: 0 0.55rem 1.5rem color-mix(in srgb, var(--photos-text) 15%, transparent);
  display: grid;
  gap: 0.12rem;
  min-width: 14rem;
  padding: 0.55rem;
  position: absolute;
  right: 0;
  top: calc(100% + 0.45rem);
  z-index: 4;
}

.photo-share-popover > p:first-child {
  color: var(--photos-muted);
  font-family: 'Azeret Mono Variable', monospace;
  font-size: 0.64rem;
  padding: 0.3rem 0.45rem;
  text-transform: uppercase;
}

.photo-share-popover > a,
.photo-share-popover > button,
.photo-qr-share > summary {
  border-radius: 0.35rem;
  color: var(--photos-text);
  cursor: pointer;
  display: block;
  padding: 0.5rem 0.45rem;
  text-align: left;
  text-decoration: none;
}

.photo-share-popover > a:hover,
.photo-share-popover > button:hover,
.photo-qr-share > summary:hover {
  background: var(--photos-accent-soft);
}

.photo-share-status {
  color: var(--photos-muted);
  font-size: 0.68rem;
  min-height: 1em;
  padding: 0 0.45rem;
}

.photo-qr-share {
  border-top: 1px solid var(--photos-border);
  margin-top: 0.2rem;
  padding-top: 0.2rem;
}

.photo-qr-share > summary {
  list-style: none;
}

.photo-qr-panel {
  display: grid;
  gap: 0.45rem;
  justify-items: center;
  padding: 0.5rem 0.45rem 0.3rem;
  text-align: center;
}

.photo-qr-fullscreen-trigger {
  background: white;
  border: 0;
  border-radius: 0.3rem;
  cursor: zoom-in;
  display: block;
  overflow: hidden;
  padding: 0;
  position: relative;
  touch-action: manipulation;
}

.photo-qr-fullscreen-trigger img {
  background: white;
  border-radius: 0.3rem;
  display: block;
  height: min(10rem, 100%);
  width: min(10rem, 100%);
}

.photo-qr-fullscreen-trigger > span {
  align-items: center;
  background: rgba(0, 0, 0, 0.78);
  bottom: 0;
  color: white;
  display: flex;
  font-family: 'Azeret Mono Variable', monospace;
  font-size: 0.6rem;
  gap: 0.3rem;
  justify-content: center;
  left: 0;
  padding: 0.42rem 0.25rem;
  position: absolute;
  right: 0;
}

.photo-qr-fullscreen-trigger > span svg {
  fill: none;
  height: 0.7rem;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
  width: 0.7rem;
}

.photo-qr-fullscreen-trigger:focus-visible {
  outline: 2px solid var(--photos-accent);
  outline-offset: 2px;
}

.photo-qr-panel p {
  color: var(--photos-muted);
  font-size: 0.68rem;
}

.photo-qr-panel a {
  color: var(--photos-accent);
  font-size: 0.7rem;
}

.photo-qr-dialog {
  background: rgba(17, 20, 19, 0.7);
  border: 0;
  box-sizing: border-box;
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
  background: rgba(17, 20, 19, 0.88);
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
  background: rgba(255, 255, 255, 0.96);
  border-radius: clamp(0.75rem, 2vw, 1.25rem);
  box-shadow: 0 1.5rem 5rem rgba(0, 0, 0, 0.38);
  box-sizing: border-box;
  color: #211d1a;
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
  background: #171918;
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
  color: #6d6257;
  font-size: clamp(0.75rem, 2vw, 0.9rem);
  margin-top: 0.25rem;
}

.photo-qr-dialog-code {
  flex: 0 1 auto;
  height: min(48vmin, calc(100dvh - 13rem));
  image-rendering: pixelated;
  min-height: 10rem;
  min-width: 10rem;
  object-fit: contain;
  width: min(48vmin, calc(50vw - 4rem));
}

.photo-qr-dialog-url {
  color: #6d6257;
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
  background: #eee5db;
  border: 1px solid #d6c8b8;
  border-radius: 50%;
  color: #211d1a;
  cursor: pointer;
  display: inline-flex;
  flex: 0 0 auto;
  height: 2.25rem;
  justify-content: center;
  width: 2.25rem;
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
  outline: 2px solid #2f7568;
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
  background: #2f7568;
  border: 1px solid #2f7568;
  border-radius: 999px;
  color: white;
  cursor: pointer;
  font-family: 'Azeret Mono Variable', monospace;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.6rem 0.8rem;
  text-decoration: none;
}

.photo-qr-dialog-actions a {
  background: white;
  color: #2f7568;
}

.photo-qr-dialog-actions button:focus-visible,
.photo-qr-dialog-actions a:focus-visible {
  outline: 2px solid #2f7568;
  outline-offset: 2px;
}

.photo-qr-dialog-status {
  color: #6d6257;
  font-size: 0.72rem;
  min-height: 1em;
}

@media (max-width: 46rem) {
  .photo-qr-dialog-content {
    background: rgba(255, 255, 255, 0.94);
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

.comments-header h1 {
  font-size: 1.05rem;
  font-weight: 800;
}

.comments-header > span {
  color: var(--photos-muted);
  font-family: 'Azeret Mono Variable', monospace;
  font-size: 0.78rem;
}

.mastodon-reply-link {
  align-items: center;
  border: 1px solid var(--photos-border);
  border-radius: 0.45rem;
  color: var(--photos-accent);
  display: flex;
  font-family: 'Azeret Mono Variable', monospace;
  font-size: 0.74rem;
  font-weight: 700;
  justify-content: space-between;
  margin-top: 0.75rem;
  padding: 0.7rem 0.8rem;
  text-decoration: none;
}

.mastodon-reply-link:hover {
  background: var(--photos-accent-soft);
  border-color: var(--photos-accent);
}

.mastodon-reply-link span {
  color: inherit;
  font: inherit;
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
    --drawer-handle-height: 7.25rem;
    --drawer-closed-offset: calc(100% - var(--drawer-handle-height) - env(safe-area-inset-bottom, 0px));

    border-radius: 1.1rem 1.1rem 0 0;
    bottom: 0;
    display: grid;
    grid-column: 1;
    grid-template-rows: var(--drawer-handle-height) minmax(0, 1fr);
    height: calc(100dvh - max(0.5rem, env(safe-area-inset-top, 0px)));
    left: max(0.35rem, env(safe-area-inset-left, 0px));
    max-height: none;
    padding: 0;
    position: fixed;
    right: max(0.35rem, env(safe-area-inset-right, 0px));
    top: auto;
    overflow-y: hidden;
    touch-action: pan-y;
    width: auto;
    transform: translateY(var(--drawer-closed-offset));
    transition: transform 240ms cubic-bezier(0.22, 0.72, 0.22, 1), opacity 160ms ease;
  }

  .comments-section.is-drawer-open {
    transform: translateY(min(42dvh, var(--drawer-closed-offset)));
  }

  .comments-section.is-drawer-open:not(.is-drawer-full) {
    grid-template-rows:
      var(--drawer-handle-height)
      calc(100% - var(--drawer-handle-height) - min(42dvh, var(--drawer-closed-offset)));
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
    padding: 0.4rem 0.85rem max(1rem, env(safe-area-inset-bottom, 0px));
    scrollbar-gutter: stable;
    -webkit-overflow-scrolling: touch;
  }

  .comments-section.is-drawer-open .comments-drawer-scroll,
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
    box-sizing: border-box;
    color: var(--photos-text);
    cursor: grab;
    display: grid;
    gap: 0.1rem;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: 1rem minmax(0, 1fr);
    margin: 0;
    height: var(--drawer-handle-height);
    min-height: 0;
    padding: 0 1rem 0.7rem 3.6rem;
    position: relative;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    z-index: 5;
  }

  .comments-drawer-grabber {
    align-self: center;
    background: var(--photos-border);
    border-radius: 999px;
    display: block;
    grid-column: 1 / -1;
    height: 0.28rem;
    justify-self: center;
    width: 2.75rem;
  }

  .comments-drawer-handle:active {
    cursor: grabbing;
  }

  .comments-drawer-controls {
    display: grid;
    gap: 0.18rem;
    left: 0.55rem;
    position: absolute;
    top: 1rem;
    z-index: 2;
  }

  .comments-drawer-controls button {
    align-items: center;
    background: var(--photos-control);
    border: 1px solid var(--photos-border);
    border-radius: 50%;
    color: var(--photos-text);
    cursor: pointer;
    display: inline-flex;
    height: 1.45rem;
    justify-content: center;
    padding: 0;
    touch-action: manipulation;
    width: 1.45rem;
  }

  .comments-drawer-controls button:disabled {
    cursor: default;
    opacity: 0.32;
  }

  .comments-drawer-controls button:not(:disabled):active {
    background: var(--photos-control-hover);
    border-color: var(--photos-accent);
  }

  .comments-drawer-controls button:focus-visible {
    outline: 2px solid var(--photos-accent);
    outline-offset: 1px;
  }

  .comments-drawer-controls svg {
    fill: none;
    height: 0.78rem;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 2;
    width: 0.78rem;
  }

  .comments-drawer-post {
    align-self: stretch;
    display: grid;
    gap: 0.18rem;
    grid-template-columns: minmax(0, 1fr) auto;
    min-width: 0;
    overflow: hidden;
  }

  .comments-drawer-post-summary {
    font-size: 0.85rem;
    grid-column: 1 / -1;
    line-height: 1.3;
    max-height: 4.35rem;
    overflow: hidden;
  }

  .comments-drawer-post-summary :deep(p) {
    margin: 0;
  }

  .comments-drawer-post-summary :deep(.local-post-overlay) {
    display: grid;
    gap: 0.08rem;
  }

  .comments-drawer-post-summary :deep(.local-post-title) {
    font-size: 1rem;
    font-weight: 850;
  }

  .comments-drawer-post-summary :deep(.local-post-location),
  .comments-drawer-post-summary :deep(.local-post-datetime),
  .comments-drawer-post-date,
  .comments-drawer-comments-meta {
    color: var(--photos-muted);
    font-family: 'Azeret Mono Variable', monospace;
    font-size: 0.62rem;
    line-height: 1.25;
  }

  .comments-drawer-post-date {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .comments-drawer-comments-meta {
    color: var(--photos-accent);
    font-weight: 700;
    justify-self: end;
  }

  .comments-drawer-post-summary :deep(a) {
    color: inherit;
    pointer-events: none;
    text-decoration: none;
  }

  .comments-drawer-post-summary :deep(img) {
    height: 1em;
    vertical-align: -0.1em;
    width: 1em;
  }

  .comments-panel-heading {
    display: none;
  }

  .comments-header {
    grid-template-columns: minmax(0, 1fr) auto;
    margin-top: 0;
    top: -0.4rem;
  }

  .comments-header > span {
    display: none;
  }

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
