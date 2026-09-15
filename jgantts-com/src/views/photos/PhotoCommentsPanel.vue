<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import MediaCarousel from '@/components/MediaCarousel.vue'
import type { DisplayPhotoComment, PhotoCommentsStatus } from './photo-comments-types'

const props = defineProps<{
  comments: DisplayPhotoComment[]
  discussionState: 'available' | 'loading' | 'not_syndicated' | 'unavailable'
  emailShareUrl: string
  facebookShareUrl: string
  linkedinShareUrl: string
  open: boolean
  post: PhotoCommentsStatus
  qrCodeUrl: string
  qrDownloadName: string
  remoteUrl: string | null
  replyCount: number
  shareStatus: string
  stale: boolean
  truncated: boolean
  xShareUrl: string
}>()

const emit = defineEmits<{
  clearSelection: []
  closeShareMenus: []
  copyLink: []
  modalChange: [open: boolean]
  openQr: []
  'update:open': [open: boolean]
}>()

const sheetQueryText = '(max-width: 64rem), (max-height: 36rem)'
const portraitSheetQueryText = '(max-width: 64rem) and (orientation: portrait)'
const isSheet = ref(false)
const isPortraitSheet = ref(false)
const panelRef = ref<HTMLElement | null>(null)
const dockTriggerRef = ref<HTMLButtonElement | null>(null)
const closeButtonRef = ref<HTMLButtonElement | null>(null)
let sheetQuery: MediaQueryList | null = null
let portraitSheetQuery: MediaQueryList | null = null
let lockedScrollY = 0
let previousDocumentOverflow = ''
let previousBodyPosition = ''
let previousBodyTop = ''
let previousBodyWidth = ''
let scrollLocked = false
let ownsHistoryEntry = false
const sheetDragOffset = ref(0)
const sheetDragging = ref(false)
const dockDragOffset = ref(0)
let sheetDragPointerId: number | null = null
let sheetDragStartY = 0
let sheetDragLastY = 0
let sheetDragLastTime = 0
let sheetDragVelocity = 0
let dockDragPointerId: number | null = null
let dockDragStartY = 0
let dockDragLastY = 0
let dockDragLastTime = 0
let dockDragVelocity = 0
let dockDragMoved = false
let sheetCloseTimer: number | null = null

const modalOpen = computed(() => isSheet.value && props.open)
const replyLabel = computed(() => `${props.replyCount} ${props.replyCount === 1 ? 'reply' : 'replies'}`)
const gestureStyles = computed(() => {
  const panelHeight = panelRef.value?.getBoundingClientRect().height || window.innerHeight || 1
  return {
    '--comments-backdrop-opacity': String(Math.max(0, 1 - sheetDragOffset.value / panelHeight)),
    '--dock-drag-y': `${dockDragOffset.value}px`,
    '--sheet-drag-y': `${sheetDragOffset.value}px`,
  }
})
const postContextCollapsible = computed(() => (
  isSheet.value
  || props.post.content
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .length > 320
))

const formatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})
const numberFormatter = new Intl.NumberFormat()

function displayName(account: PhotoCommentsStatus['account']): string {
  return account.display_name.trim() || account.username
}

function formatDate(date: string): string {
  return formatter.format(new Date(date))
}

function formatCount(value: number): string {
  return numberFormatter.format(value)
}

function syncSheetQuery() {
  isSheet.value = sheetQuery?.matches ?? window.matchMedia(sheetQueryText).matches
  isPortraitSheet.value = portraitSheetQuery?.matches ?? window.matchMedia(portraitSheetQueryText).matches
  if (!isPortraitSheet.value) resetGestures()
}

function resetSheetDrag() {
  if (sheetCloseTimer !== null) window.clearTimeout(sheetCloseTimer)
  sheetCloseTimer = null
  sheetDragOffset.value = 0
  sheetDragging.value = false
  sheetDragPointerId = null
  sheetDragVelocity = 0
}

function resetDockDrag() {
  dockDragOffset.value = 0
  dockDragPointerId = null
  dockDragVelocity = 0
  dockDragMoved = false
}

function resetGestures() {
  resetSheetDrag()
  resetDockDrag()
}

function beginSheetDrag(event: PointerEvent) {
  if (!isPortraitSheet.value || event.button !== 0) return
  const target = event.target
  if (target instanceof Element && target.closest('button, a, summary')) return
  sheetDragPointerId = event.pointerId
  sheetDragStartY = event.clientY
  sheetDragLastY = event.clientY
  sheetDragLastTime = event.timeStamp
  sheetDragVelocity = 0
  sheetDragging.value = true
  ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
}

function moveSheetDrag(event: PointerEvent) {
  if (event.pointerId !== sheetDragPointerId) return
  const elapsed = Math.max(1, event.timeStamp - sheetDragLastTime)
  sheetDragVelocity = (event.clientY - sheetDragLastY) / elapsed
  sheetDragLastY = event.clientY
  sheetDragLastTime = event.timeStamp
  sheetDragOffset.value = Math.max(0, event.clientY - sheetDragStartY)
}

function endSheetDrag(event: PointerEvent, cancelled = false) {
  if (event.pointerId !== sheetDragPointerId) return
  ;(event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId)
  const panelHeight = panelRef.value?.getBoundingClientRect().height || window.innerHeight
  const shouldClose = !cancelled && (
    sheetDragOffset.value > Math.min(140, panelHeight * 0.2)
    || (sheetDragOffset.value > 24 && sheetDragVelocity > 0.55)
  )
  sheetDragging.value = false
  sheetDragPointerId = null

  if (!shouldClose) {
    sheetDragOffset.value = 0
    return
  }

  sheetDragOffset.value = panelHeight
  sheetCloseTimer = window.setTimeout(() => requestClose(), 180)
}

function beginDockDrag(event: PointerEvent) {
  if (!isPortraitSheet.value || event.button !== 0) return
  const target = event.target
  if (target instanceof Element && target.closest('.comments-dock-clear')) return
  dockDragPointerId = event.pointerId
  dockDragStartY = event.clientY
  dockDragLastY = event.clientY
  dockDragLastTime = event.timeStamp
  dockDragVelocity = 0
  dockDragMoved = false
  ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
}

function moveDockDrag(event: PointerEvent) {
  if (event.pointerId !== dockDragPointerId) return
  const elapsed = Math.max(1, event.timeStamp - dockDragLastTime)
  dockDragVelocity = (event.clientY - dockDragLastY) / elapsed
  dockDragLastY = event.clientY
  dockDragLastTime = event.timeStamp
  const delta = Math.min(0, event.clientY - dockDragStartY)
  if (Math.abs(delta) > 8) dockDragMoved = true
  dockDragOffset.value = Math.max(-96, delta)
}

function endDockDrag(event: PointerEvent, cancelled = false) {
  if (event.pointerId !== dockDragPointerId) return
  ;(event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId)
  const shouldOpen = !cancelled && (
    dockDragOffset.value < -48
    || (dockDragOffset.value < -16 && dockDragVelocity < -0.5)
  )
  if (dockDragMoved) event.preventDefault()
  resetDockDrag()
  if (shouldOpen) openPanel()
}

function lockDocumentScroll() {
  if (scrollLocked) return
  lockedScrollY = window.scrollY
  previousDocumentOverflow = document.documentElement.style.overflow
  previousBodyPosition = document.body.style.position
  previousBodyTop = document.body.style.top
  previousBodyWidth = document.body.style.width
  document.documentElement.style.overflow = 'hidden'
  document.body.style.position = 'fixed'
  document.body.style.top = `-${lockedScrollY}px`
  document.body.style.width = '100%'
  scrollLocked = true
}

function unlockDocumentScroll() {
  if (!scrollLocked) return
  document.documentElement.style.overflow = previousDocumentOverflow
  document.body.style.position = previousBodyPosition
  document.body.style.top = previousBodyTop
  document.body.style.width = previousBodyWidth
  window.scrollTo({ top: lockedScrollY })
  scrollLocked = false
}

function focusableElements() {
  if (!panelRef.value) return []
  return Array.from(panelRef.value.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), details > summary, [tabindex]:not([tabindex="-1"])',
  )).filter((element) => !element.hasAttribute('hidden') && element.offsetParent !== null)
}

function handlePanelKeydown(event: KeyboardEvent) {
  if (!modalOpen.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    requestClose()
    return
  }
  if (event.key !== 'Tab') return

  const focusable = focusableElements()
  if (!focusable.length) {
    event.preventDefault()
    panelRef.value?.focus()
    return
  }

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

function addHistoryEntry() {
  if (ownsHistoryEntry) return
  if (history.state?.photoCommentsSheet) {
    ownsHistoryEntry = true
    return
  }
  history.pushState({ ...history.state, photoCommentsSheet: true }, '', window.location.href)
  ownsHistoryEntry = true
}

function removeHistoryEntry() {
  if (!ownsHistoryEntry) return false
  ownsHistoryEntry = false
  history.back()
  return true
}

function discardHistoryEntry() {
  if (!ownsHistoryEntry) return
  ownsHistoryEntry = false
  if (!history.state?.photoCommentsSheet) return
  const nextState = { ...history.state }
  delete nextState.photoCommentsSheet
  history.replaceState(nextState, '', window.location.href)
}

function openPanel() {
  emit('update:open', true)
}

function handleDockClick(event: MouseEvent) {
  const target = event.target
  if (target instanceof Element && target.closest('.comments-dock-clear')) return
  openPanel()
}

async function shareFromSheet() {
  if (typeof navigator.share !== 'function') {
    emit('copyLink')
    return
  }

  try {
    await navigator.share({
      title: document.title,
      url: window.location.href,
    })
  } catch (error) {
    if (!(error instanceof DOMException) || error.name !== 'AbortError') emit('copyLink')
  }
}

function requestClose() {
  emit('closeShareMenus')
  if (modalOpen.value && removeHistoryEntry()) return
  emit('update:open', false)
}

function handlePopState() {
  if (!props.open || !isSheet.value) return
  ownsHistoryEntry = false
  emit('update:open', false)
}

watch(modalOpen, async (open) => {
  emit('modalChange', open)
  if (open) {
    lockDocumentScroll()
    addHistoryEntry()
    await nextTick()
    closeButtonRef.value?.focus()
  } else {
    resetGestures()
    unlockDocumentScroll()
    discardHistoryEntry()
    await nextTick()
    dockTriggerRef.value?.focus()
  }
}, { immediate: true })

onMounted(() => {
  sheetQuery = window.matchMedia(sheetQueryText)
  portraitSheetQuery = window.matchMedia(portraitSheetQueryText)
  syncSheetQuery()
  sheetQuery.addEventListener('change', syncSheetQuery)
  portraitSheetQuery.addEventListener('change', syncSheetQuery)
  window.addEventListener('popstate', handlePopState)
})

onBeforeUnmount(() => {
  sheetQuery?.removeEventListener('change', syncSheetQuery)
  portraitSheetQuery?.removeEventListener('change', syncSheetQuery)
  window.removeEventListener('popstate', handlePopState)
  unlockDocumentScroll()
  discardHistoryEntry()
  resetGestures()
  emit('modalChange', false)
})
</script>

<template>
  <div class="photo-comments" :style="gestureStyles">
    <div
      v-show="!open"
      class="comments-dock"
      @click="handleDockClick"
      @pointerdown="beginDockDrag"
      @pointermove="moveDockDrag"
      @pointerup="endDockDrag"
      @pointercancel="endDockDrag($event, true)"
    >
      <button
        ref="dockTriggerRef"
        type="button"
        class="comments-dock-trigger"
        :aria-expanded="open"
        aria-controls="photo-comments-panel"
      >
        <span>View comments</span>
        <strong>{{ replyLabel }}</strong>
      </button>
      <button
        type="button"
        class="comments-dock-clear"
        aria-label="Close selected photo"
        @click="emit('clearSelection')"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
    </div>

    <button
      v-if="isPortraitSheet && open"
      type="button"
      class="comments-backdrop"
      tabindex="-1"
      aria-hidden="true"
      @click="requestClose"
    ></button>

    <section
      v-show="!isSheet || open"
      id="photo-comments-panel"
      ref="panelRef"
      class="comments-section"
      :class="{
        'is-dragging': sheetDragging,
        'is-modal-sheet': isSheet,
        'is-open': open,
        'is-portrait-sheet': isPortraitSheet,
      }"
      :role="isSheet ? 'dialog' : 'region'"
      :aria-modal="isSheet && open ? 'true' : undefined"
      aria-labelledby="photo-comments-title"
      tabindex="-1"
      @keydown="handlePanelKeydown"
    >
      <header
        class="comments-panel-header"
        @pointerdown="beginSheetDrag"
        @pointermove="moveSheetDrag"
        @pointerup="endSheetDrag"
        @pointercancel="endSheetDrag($event, true)"
      >
        <div>
          <h1 id="photo-comments-title">Replies</h1>
          <span>{{ replyLabel }}</span>
        </div>
        <button
          v-if="isSheet"
          type="button"
          class="photo-share-button photo-share-native"
          aria-label="Share this photo post"
          @click="shareFromSheet"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M18 16a3 3 0 0 0-2.4 1.2l-6.7-3.9a3.4 3.4 0 0 0 0-2.6l6.7-3.9A3 3 0 1 0 15 5a3 3 0 0 0 .1.7L8.4 9.6a3 3 0 1 0 0 4.8l6.7 3.9A3 3 0 1 0 18 16Z"/></svg>
          Share
        </button>
        <details v-else class="photo-share-menu">
          <summary class="photo-share-button" aria-label="Share this photo post">
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M18 16a3 3 0 0 0-2.4 1.2l-6.7-3.9a3.4 3.4 0 0 0 0-2.6l6.7-3.9A3 3 0 1 0 15 5a3 3 0 0 0 .1.7L8.4 9.6a3 3 0 1 0 0 4.8l6.7 3.9A3 3 0 1 0 18 16Z"/></svg>
            Share
          </summary>
          <div class="photo-share-popover">
            <p>Share this photo post</p>
            <a :href="facebookShareUrl" target="_blank" rel="noopener noreferrer">Share on Facebook <span aria-hidden="true">↗</span></a>
            <a :href="xShareUrl" target="_blank" rel="noopener noreferrer">Share on X <span aria-hidden="true">↗</span></a>
            <a :href="linkedinShareUrl" target="_blank" rel="noopener noreferrer">Share on LinkedIn <span aria-hidden="true">↗</span></a>
            <a :href="emailShareUrl">Share by email</a>
            <button type="button" @click="emit('copyLink')">Copy link</button>
            <p class="photo-share-status" role="status" aria-live="polite">{{ shareStatus }}</p>
            <details class="photo-qr-share">
              <summary>Share as QR code</summary>
              <div class="photo-qr-panel">
                <button
                  v-if="qrCodeUrl"
                  type="button"
                  class="photo-qr-fullscreen-trigger"
                  aria-label="Enlarge QR code to fill the window"
                  @click="emit('openQr')"
                >
                  <img :src="qrCodeUrl" alt="QR code for this photo post">
                  <span>
                    <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" /></svg>
                    Tap to enlarge
                  </span>
                </button>
                <p v-else>QR code unavailable.</p>
                <p>Scan to open this photo post</p>
                <a v-if="qrCodeUrl" :href="qrCodeUrl" :download="qrDownloadName">Download QR code</a>
              </div>
            </details>
          </div>
        </details>
        <button
          ref="closeButtonRef"
          type="button"
          class="comments-close"
          :aria-label="isSheet ? 'Close comments' : 'Close selected photo'"
          @click="isSheet ? requestClose() : emit('clearSelection')"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </header>

      <div class="comments-panel-scroll">
        <component
          :is="postContextCollapsible ? 'details' : 'section'"
          class="comments-context"
          :aria-labelledby="postContextCollapsible ? undefined : 'photo-comments-context-title'"
        >
          <summary v-if="postContextCollapsible">About this photo</summary>
          <h2 v-else id="photo-comments-context-title">About this photo</h2>
          <div class="comments-context-content">
            <header class="post-meta-header">
              <a :href="post.account.url" class="author-link">
                <img :src="post.account.avatar" alt="" class="avatar avatar-large" decoding="async" />
                <span class="author-text">
                  <strong>{{ displayName(post.account) }}</strong>
                  <span>@{{ post.account.acct }}</span>
                </span>
              </a>
            </header>
            <div class="comments-post-text" v-html="post.content"></div>
            <time v-if="!post.id.startsWith('local:')" class="comments-post-date" :datetime="post.created_at">
              {{ formatDate(post.created_at) }}
            </time>
          </div>
        </component>

        <p v-if="discussionState === 'loading'" class="comments-notice" role="status">
          Loading replies…
        </p>
        <p v-else-if="discussionState === 'unavailable'" class="comments-notice" role="status">
          Replies are temporarily unavailable.
        </p>
        <p v-if="stale" class="comments-notice" role="status">
          Showing cached replies while Mastodon is unavailable.
        </p>
        <p v-if="truncated" class="comments-notice">
          This discussion has more replies than can be shown here.
        </p>

        <ol v-if="comments.length" class="comment-list">
          <li
            v-for="comment in comments"
            :key="comment.id"
            :style="{ '--reply-depth': Math.min(comment.depth, 6) }"
            class="comment-item"
          >
            <article class="comment" :class="{ 'is-reply': comment.depth > 0 }">
              <header class="status-header">
                <a :href="comment.account.url" class="author-link">
                  <img :src="comment.account.avatar" alt="" class="avatar" decoding="async" loading="lazy" />
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

        <p v-else-if="discussionState === 'not_syndicated'" class="empty-state">
          No Mastodon discussion is connected yet.
        </p>
        <p v-else-if="discussionState === 'available'" class="empty-state">No comments yet.</p>

        <a v-if="remoteUrl" class="mastodon-reply-link" :href="remoteUrl" target="_blank" rel="noopener noreferrer">
          Reply on Mastodon <span aria-hidden="true">↗</span>
        </a>
      </div>
    </section>
  </div>
</template>

<style scoped>
.photo-comments {
  align-self: start;
  grid-column: 2;
  min-width: 0;
  position: sticky;
  top: 8rem;
  z-index: 10;
}

.comments-dock {
  display: none;
}

.comments-backdrop {
  display: none;
}

.comments-section {
  background: var(--photos-panel);
  border: 1px solid var(--photos-border);
  border-radius: 12px;
  box-shadow: var(--photos-card-shadow);
  box-sizing: border-box;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  max-height: calc(100dvh - 9rem - var(--photos-gutter));
  min-height: 0;
  overflow: hidden;
  width: 100%;
}

.comments-panel-header {
  align-items: center;
  background: color-mix(in srgb, var(--photos-panel) 95%, transparent);
  border-bottom: 1px solid var(--photos-border);
  display: grid;
  gap: 0.65rem;
  grid-template-columns: minmax(0, 1fr) auto auto;
  padding: 0.75rem 0.85rem;
  position: relative;
  z-index: 3;
}

.comments-panel-header > div:first-child {
  display: grid;
  gap: 0.1rem;
}

.comments-panel-header h1 {
  font-size: 1.05rem;
  font-weight: 800;
}

.comments-panel-header > div:first-child > span {
  color: var(--photos-muted);
  font-family: 'Azeret Mono Variable', monospace;
  font-size: 0.68rem;
}

.comments-panel-scroll {
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior-y: contain;
  padding: 0.85rem;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  -webkit-overflow-scrolling: touch;
}

.comments-context {
  border-bottom: 1px solid var(--photos-border);
  margin-bottom: 0.85rem;
  padding-bottom: 0.75rem;
}

.comments-context > summary,
.comments-context > h2 {
  color: var(--photos-accent);
  font-family: 'Azeret Mono Variable', monospace;
  font-size: 0.72rem;
  font-weight: 700;
  min-height: 44px;
  align-items: center;
  display: flex;
}

.comments-context > summary {
  cursor: pointer;
  justify-content: space-between;
  list-style: none;
}

.comments-context > summary::-webkit-details-marker {
  display: none;
}

.comments-context > summary::after {
  content: '+';
  font-size: 1rem;
  font-weight: 500;
}

.comments-context[open] > summary::after {
  content: '−';
}

.comments-context > h2 {
  margin: 0;
}

.comments-context-content {
  display: grid;
  gap: 0.5rem;
  padding-top: 0.3rem;
}

.post-meta-header,
.status-header {
  align-items: center;
  display: flex;
  gap: 0.75rem;
  justify-content: space-between;
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
.status-content :deep(a):hover {
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
.timestamp {
  overflow-wrap: anywhere;
}

.author-text strong {
  font-size: 0.9rem;
  font-weight: 750;
}

.author-text span,
.timestamp,
.comment-stats {
  color: var(--photos-muted);
  font-size: 0.7rem;
  line-height: 1.35;
}

.timestamp {
  flex: 0 0 auto;
  font-family: 'Azeret Mono Variable', monospace;
  text-decoration: none;
}

.comments-post-text {
  font-size: 0.85rem;
  line-height: 1.45;
}

.comments-post-text :deep(p + p) {
  margin-top: 0.65rem;
}

.comments-post-text :deep(.local-post-overlay) {
  display: grid;
  gap: 0.65rem;
}

.comments-post-text :deep(.local-post-overlay p) {
  display: block;
  margin: 0;
}

.comments-post-text :deep(.local-post-title) {
  font-size: 1.05rem;
  font-style: italic;
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

.comment-list {
  display: grid;
  gap: 0.75rem;
  padding: 0.15rem;
}

.comments-notice {
  background: var(--photos-accent-soft);
  border-radius: 0.45rem;
  color: var(--photos-text);
  font-size: 0.75rem;
  line-height: 1.45;
  margin-bottom: 0.75rem;
  padding: 0.7rem 0.75rem;
}

.comment-item {
  margin-left: calc(var(--reply-depth) * 1rem);
}

.comment,
.empty-state {
  background: var(--photos-panel);
  border: 1px solid var(--photos-border);
  border-radius: 8px;
}

.comment {
  border: 0.5px solid var(--photos-card-border);
  box-shadow: var(--photos-card-shadow);
  display: grid;
  gap: 0.65rem;
  padding: 0.75rem;
}

.empty-state {
  color: var(--photos-muted);
  padding: 1.25rem;
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
  font-size: 0.85rem;
  font-weight: 320;
  line-height: 1.55;
}

.status-content :deep(p + p) {
  margin-top: 0.85rem;
}

.status-content :deep(a) {
  color: var(--photos-accent);
  font-weight: 520;
  text-decoration: none;
}

.comment-stats {
  border-top: 1px solid var(--photos-border);
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  padding-top: 0.9rem;
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
  min-height: 44px;
  padding: 0 0.8rem;
  text-decoration: none;
}

.mastodon-reply-link:hover {
  background: var(--photos-accent-soft);
  border-color: var(--photos-accent);
}

.comments-close,
.comments-dock-clear {
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
  padding: 0;
  width: 44px;
}

.comments-close:hover,
.comments-dock-clear:hover {
  background: var(--photos-control-hover);
  border-color: var(--photos-accent);
}

.comments-close svg,
.comments-dock-clear svg {
  fill: none;
  height: 1rem;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-width: 2;
  width: 1rem;
}

.photo-share-menu {
  position: static;
}

.photo-share-button {
  align-items: center;
  background: var(--photos-accent);
  border: 1px solid var(--photos-accent);
  border-radius: 999px;
  box-sizing: border-box;
  color: var(--photos-panel);
  cursor: pointer;
  display: inline-flex;
  font-family: 'Azeret Mono Variable', monospace;
  font-size: 0.72rem;
  font-weight: 700;
  gap: 0.4rem;
  list-style: none;
  min-height: 44px;
  padding: 0.55rem 0.75rem;
}

button.photo-share-button {
  font-family: inherit;
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

.comments-close:focus-visible,
.comments-dock-trigger:focus-visible,
.comments-dock-clear:focus-visible,
.comments-context > summary:focus-visible,
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
  box-sizing: border-box;
  display: grid;
  gap: 0.12rem;
  min-width: min(18rem, calc(100vw - 2rem));
  padding: 0.55rem;
  position: absolute;
  right: 0;
  top: calc(100% + 0.45rem);
  z-index: 5;
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
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 0.35rem;
  box-sizing: border-box;
  color: var(--photos-text);
  cursor: pointer;
  display: flex;
  font: inherit;
  min-height: 44px;
  padding: 0.5rem 0.45rem;
  text-align: left;
  text-decoration: none;
  width: 100%;
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

.photo-qr-panel p {
  color: var(--photos-muted);
  font-size: 0.68rem;
}

.photo-qr-panel a {
  color: var(--photos-accent);
  font-size: 0.7rem;
}

@media (max-width: 64rem), (max-height: 36rem) {
  .photo-comments {
    bottom: 0;
    grid-column: 1;
    left: 0;
    pointer-events: none;
    position: fixed;
    right: 0;
    top: auto;
    z-index: 40;
  }

  .comments-dock {
    align-items: stretch;
    background: color-mix(in srgb, var(--photos-panel) 96%, transparent);
    border: 1px solid var(--photos-border);
    border-bottom: 0;
    border-radius: 1rem 1rem 0 0;
    box-shadow: var(--photos-card-shadow);
    display: grid;
    gap: 0.5rem;
    grid-template-columns: minmax(0, 1fr) 44px;
    margin-inline: max(0.35rem, env(safe-area-inset-left, 0px)) max(0.35rem, env(safe-area-inset-right, 0px));
    padding: 0.55rem 0.65rem max(0.55rem, env(safe-area-inset-bottom, 0px));
    pointer-events: auto;
    touch-action: none;
    transform: translateY(var(--dock-drag-y, 0));
    transition: opacity 140ms ease, transform 180ms ease;
    user-select: none;
  }

  .comments-backdrop {
    background: color-mix(in srgb, var(--photos-text) 42%, transparent);
    border: 0;
    display: block;
    inset: 0;
    opacity: var(--comments-backdrop-opacity, 1);
    padding: 0;
    pointer-events: auto;
    position: fixed;
    transition: opacity 180ms ease;
  }

  .comments-dock-trigger {
    align-items: center;
    background: transparent;
    border: 0;
    color: var(--photos-text);
    cursor: pointer;
    display: flex;
    font: inherit;
    justify-content: space-between;
    min-height: 44px;
    padding: 0 0.45rem;
    text-align: left;
  }

  .comments-dock-trigger > span {
    font-size: 0.9rem;
    font-weight: 800;
  }

  .comments-dock-trigger > strong {
    color: var(--photos-accent);
    font-family: 'Azeret Mono Variable', monospace;
    font-size: 0.68rem;
  }

  .comments-section.is-modal-sheet {
    border: 0;
    border-radius: 0;
    bottom: 0;
    box-shadow: none;
    height: 100dvh;
    left: 0;
    max-height: none;
    opacity: 1;
    pointer-events: auto;
    position: fixed;
    right: 0;
    top: 0;
    width: auto;
  }

  .comments-section.is-modal-sheet.is-portrait-sheet {
    border: 1px solid var(--photos-border);
    border-bottom: 0;
    border-radius: 1rem 1rem 0 0;
    box-shadow: 0 -0.75rem 2.5rem color-mix(in srgb, var(--photos-text) 18%, transparent);
    height: min(88dvh, calc(100dvh - max(3.5rem, env(safe-area-inset-top, 0px))));
    top: auto;
    transform: translateY(var(--sheet-drag-y, 0));
    transition: transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .comments-section.is-modal-sheet.is-portrait-sheet.is-dragging {
    transition: none;
  }

  .comments-panel-header {
    background: var(--photos-panel);
    padding-left: max(0.75rem, env(safe-area-inset-left, 0px));
    padding-right: max(0.75rem, env(safe-area-inset-right, 0px));
    padding-top: max(0.65rem, env(safe-area-inset-top, 0px));
  }

  .comments-section.is-portrait-sheet .comments-panel-header {
    cursor: grab;
    padding-top: 1.05rem;
    touch-action: none;
    user-select: none;
  }

  .comments-section.is-portrait-sheet .comments-panel-header::before {
    background: color-mix(in srgb, var(--photos-muted) 52%, transparent);
    border-radius: 999px;
    content: '';
    height: 4px;
    left: 50%;
    position: absolute;
    top: 0.38rem;
    transform: translateX(-50%);
    width: 2.5rem;
  }

  .comments-panel-header > div:first-child {
    align-items: baseline;
    display: flex;
    gap: 0.5rem;
  }

  .photo-share-button {
    border-radius: 50%;
    font-size: 0;
    height: 44px;
    justify-content: center;
    padding: 0;
    width: 44px;
  }

  .photo-share-button svg {
    display: block;
    height: 1.05rem;
    width: 1.05rem;
  }

  .comments-panel-scroll {
    padding: 0.35rem max(0.75rem, env(safe-area-inset-right, 0px)) max(1rem, env(safe-area-inset-bottom, 0px)) max(0.75rem, env(safe-area-inset-left, 0px));
    scrollbar-gutter: auto;
    touch-action: pan-y;
  }

  .comments-context {
    margin-bottom: 0.65rem;
    padding-bottom: 0;
  }

  .comments-context > summary {
    color: var(--photos-muted);
    font-size: 0.68rem;
  }

  .comment-list {
    gap: 0.65rem;
    padding: 0;
  }

  .comment {
    box-shadow: none;
  }

  .mastodon-reply-link {
    margin-top: 0.65rem;
  }
}

@media (max-width: 36rem) {
  .comments-panel-header {
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 0.45rem;
    padding-inline: 0.65rem;
  }

  .comment-item {
    margin-left: calc(var(--reply-depth) * 0.45rem);
  }

  .status-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.65rem;
  }

  .timestamp {
    margin-left: calc(2rem + 0.6rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .comments-dock,
  .comments-backdrop,
  .comments-section,
  .comments-section.is-modal-sheet.is-portrait-sheet {
    transition: none;
  }
}
</style>
