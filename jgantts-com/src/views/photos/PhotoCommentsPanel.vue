<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  DrawerContent,
  DrawerOverlay,
  DrawerPortal,
  DrawerRoot,
  DrawerTitle,
  DrawerTrigger,
} from 'reka-ui'
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
const shareMenuOpen = ref(false)
const qrShareOpen = ref(false)
const closeButtonRef = ref<HTMLButtonElement | null>(null)
let sheetQuery: MediaQueryList | null = null
let portraitSheetQuery: MediaQueryList | null = null
let ownsHistoryEntry = false
let dockPointerId: number | null = null
let dockStartX = 0
let dockStartY = 0
let dockAxis: 'horizontal' | 'pending' | 'vertical' = 'pending'
let suppressDockClickUntil = 0

const modalOpen = computed(() => isSheet.value && props.open)
const drawerOpen = computed(() => !isSheet.value || props.open)
const replyLabel = computed(() => `${props.replyCount} ${props.replyCount === 1 ? 'reply' : 'replies'}`)
const panelSummaryLabel = computed(() => `Photo details · ${replyLabel.value}`)
const panelTitle = computed(() => postTitleSnippet(props.post.content))

const formatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})
const numberFormatter = new Intl.NumberFormat()

function displayName(account: PhotoCommentsStatus['account']): string {
  return account.display_name.trim() || account.username
}

function postTitleSnippet(content: string): string {
  if (typeof document === 'undefined') return 'Photo details'
  const container = document.createElement('div')
  container.innerHTML = content
  const text = (container.querySelector('.local-post-title')?.textContent
    || container.querySelector('p')?.textContent
    || container.textContent
    || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return 'Photo details'
  if (text.length <= 64) return text
  const candidate = text.slice(0, 65)
  const breakAt = candidate.lastIndexOf(' ')
  return `${candidate.slice(0, breakAt >= 40 ? breakAt : 64).trimEnd()}…`
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

function toggleShareMenu() {
  shareMenuOpen.value = !shareMenuOpen.value
  if (!shareMenuOpen.value) qrShareOpen.value = false
}

function toggleQrShare() {
  qrShareOpen.value = !qrShareOpen.value
}

function resetShareMenu() {
  shareMenuOpen.value = false
  qrShareOpen.value = false
}

function closeShareMenu(event: MouseEvent) {
  const target = event.target
  if (target instanceof Element && !target.closest('.photo-share-menu')) resetShareMenu()
}

function requestClose() {
  emit('closeShareMenus')
  if (modalOpen.value && removeHistoryEntry()) return
  emit('update:open', false)
}

function handleDrawerOpenChange(open: boolean) {
  if (!isSheet.value) return
  if (open) {
    emit('update:open', true)
    return
  }
  requestClose()
}

function handleOpenAutoFocus(event: Event) {
  event.preventDefault()
  closeButtonRef.value?.focus()
}

function beginDockSwipe(event: PointerEvent) {
  if (!isPortraitSheet.value || !event.isPrimary || event.button !== 0) return
  const target = event.target
  if (target instanceof Element && target.closest('.comments-dock-clear')) return
  dockPointerId = event.pointerId
  dockStartX = event.clientX
  dockStartY = event.clientY
  dockAxis = 'pending'
}

function moveDockSwipe(event: PointerEvent) {
  if (event.pointerId !== dockPointerId) return
  const deltaX = event.clientX - dockStartX
  const deltaY = event.clientY - dockStartY
  if (dockAxis === 'pending' && Math.max(Math.abs(deltaX), Math.abs(deltaY)) > 6) {
    dockAxis = Math.abs(deltaY) > Math.abs(deltaX) ? 'vertical' : 'horizontal'
    if (dockAxis === 'vertical') {
      try {
        ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
      } catch {
        // Synthetic pointers and older browsers may not expose active capture.
      }
    }
  }
  if (dockAxis === 'vertical' && deltaY < 0) event.preventDefault()
}

function endDockSwipe(event: PointerEvent, cancelled = false) {
  if (event.pointerId !== dockPointerId) return
  try {
    ;(event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId)
  } catch {
    // The pointer may already have released its implicit touch capture.
  }
  const shouldOpen = !cancelled
    && dockAxis === 'vertical'
    && event.clientY - dockStartY <= -40
  dockPointerId = null
  dockAxis = 'pending'
  if (!shouldOpen) return
  suppressDockClickUntil = performance.now() + 350
  emit('update:open', true)
}

function handleDockClick(event: MouseEvent) {
  const target = event.target
  if (target instanceof Element && target.closest('.comments-dock-clear')) return
  if (target instanceof Element && target.closest('.photo-share-menu')) return
  if (performance.now() < suppressDockClickUntil) {
    event.preventDefault()
    event.stopPropagation()
    return
  }
  if (target instanceof Element && target.closest('.comments-dock-trigger')) return
  if (!props.open) emit('update:open', true)
}

function handlePopState() {
  if (!props.open || !isSheet.value) return
  ownsHistoryEntry = false
  emit('update:open', false)
}

watch(modalOpen, (open) => {
  emit('modalChange', open)
  if (open) {
    addHistoryEntry()
  } else {
    discardHistoryEntry()
  }
}, { immediate: true })

watch(() => props.open, (open) => {
  if (!open) resetShareMenu()
})

onMounted(() => {
  sheetQuery = window.matchMedia(sheetQueryText)
  portraitSheetQuery = window.matchMedia(portraitSheetQueryText)
  syncSheetQuery()
  sheetQuery.addEventListener('change', syncSheetQuery)
  portraitSheetQuery.addEventListener('change', syncSheetQuery)
  window.addEventListener('popstate', handlePopState)
  document.addEventListener('click', closeShareMenu)
})

onBeforeUnmount(() => {
  sheetQuery?.removeEventListener('change', syncSheetQuery)
  portraitSheetQuery?.removeEventListener('change', syncSheetQuery)
  window.removeEventListener('popstate', handlePopState)
  document.removeEventListener('click', closeShareMenu)
  discardHistoryEntry()
  emit('modalChange', false)
})
</script>

<template>
  <DrawerRoot
    :open="drawerOpen"
    :modal="isSheet"
    swipe-direction="down"
    @update:open="handleDrawerOpenChange"
  >
    <div class="photo-comments">
      <div
        v-show="isSheet && !open"
        class="comments-dock comments-panel-header"
        @click="handleDockClick"
        @pointerdown="beginDockSwipe"
        @pointermove="moveDockSwipe"
        @pointerup="endDockSwipe"
        @pointercancel="endDockSwipe($event, true)"
      >
        <span class="comments-dock-handle" aria-hidden="true"></span>
        <DrawerTrigger as-child>
          <button
            type="button"
            class="comments-dock-trigger"
          >
            <span>{{ panelTitle }}</span>
            <small>{{ panelSummaryLabel }}</small>
          </button>
        </DrawerTrigger>
        <div class="photo-share-menu">
          <button
            type="button"
            class="photo-share-button"
            aria-label="Share this photo post"
            :aria-expanded="shareMenuOpen"
            @click.stop="toggleShareMenu"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M18 16a3 3 0 0 0-2.4 1.2l-6.7-3.9a3.4 3.4 0 0 0 0-2.6l6.7-3.9A3 3 0 1 0 15 5a3 3 0 0 0 .1.7L8.4 9.6a3 3 0 1 0 0 4.8l6.7 3.9A3 3 0 1 0 18 16Z"/></svg>
            Share
          </button>
          <div v-if="shareMenuOpen" class="photo-share-popover">
            <p>Share this photo post</p>
            <button type="button" @click="shareFromSheet">Share…</button>
            <a :href="facebookShareUrl" target="_blank" rel="noopener noreferrer">Share on Facebook <span aria-hidden="true">↗</span></a>
            <a :href="xShareUrl" target="_blank" rel="noopener noreferrer">Share on X <span aria-hidden="true">↗</span></a>
            <a :href="linkedinShareUrl" target="_blank" rel="noopener noreferrer">Share on LinkedIn <span aria-hidden="true">↗</span></a>
            <a :href="emailShareUrl">Share by email</a>
            <button type="button" @click="emit('copyLink')">Copy link</button>
            <p class="photo-share-status" role="status" aria-live="polite">{{ shareStatus }}</p>
            <div class="photo-qr-share">
              <button
                type="button"
                class="photo-qr-toggle"
                :aria-expanded="qrShareOpen"
                @click="toggleQrShare"
              >Share as QR code</button>
              <div v-if="qrShareOpen" class="photo-qr-panel">
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
            </div>
          </div>
        </div>
        <button
          type="button"
          class="comments-dock-clear"
          aria-label="Close selected photo"
          @click="emit('clearSelection')"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </div>

      <DrawerPortal disabled>
        <DrawerOverlay v-if="isSheet" class="comments-backdrop" />

      <DrawerContent
        as-child
        :force-mount="!isSheet"
        :initial-focus="false"
        @open-auto-focus="handleOpenAutoFocus"
      >
        <section
          id="photo-comments-panel"
          class="comments-section"
          :class="{
            'is-modal-sheet': isSheet,
            'is-open': open,
            'is-portrait-sheet': isPortraitSheet,
          }"
          :role="isSheet ? 'dialog' : 'region'"
          :aria-modal="isSheet && open ? 'true' : undefined"
        >
          <header class="comments-panel-header">
            <div>
              <DrawerTitle as-child>
                <h1>{{ panelTitle }}</h1>
              </DrawerTitle>
              <span>{{ panelSummaryLabel }}</span>
            </div>
        <div class="photo-share-menu">
          <button
            type="button"
            class="photo-share-button"
            aria-label="Share this photo post"
            :aria-expanded="shareMenuOpen"
            @click.stop="toggleShareMenu"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M18 16a3 3 0 0 0-2.4 1.2l-6.7-3.9a3.4 3.4 0 0 0 0-2.6l6.7-3.9A3 3 0 1 0 15 5a3 3 0 0 0 .1.7L8.4 9.6a3 3 0 1 0 0 4.8l6.7 3.9A3 3 0 1 0 18 16Z"/></svg>
            Share
          </button>
          <div v-if="shareMenuOpen" class="photo-share-popover">
            <p>Share this photo post</p>
            <button v-if="isSheet" type="button" @click="shareFromSheet">Share…</button>
            <a :href="facebookShareUrl" target="_blank" rel="noopener noreferrer">Share on Facebook <span aria-hidden="true">↗</span></a>
            <a :href="xShareUrl" target="_blank" rel="noopener noreferrer">Share on X <span aria-hidden="true">↗</span></a>
            <a :href="linkedinShareUrl" target="_blank" rel="noopener noreferrer">Share on LinkedIn <span aria-hidden="true">↗</span></a>
            <a :href="emailShareUrl">Share by email</a>
            <button type="button" @click="emit('copyLink')">Copy link</button>
            <p class="photo-share-status" role="status" aria-live="polite">{{ shareStatus }}</p>
            <div class="photo-qr-share">
              <button
                type="button"
                class="photo-qr-toggle"
                :aria-expanded="qrShareOpen"
                @click="toggleQrShare"
              >Share as QR code</button>
              <div v-if="qrShareOpen" class="photo-qr-panel">
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
            </div>
          </div>
        </div>
        <button
          ref="closeButtonRef"
          type="button"
          class="comments-close"
          :aria-label="isSheet ? 'Close photo details' : 'Close selected photo'"
          @click="isSheet ? requestClose() : emit('clearSelection')"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </header>

      <div class="comments-panel-scroll">
        <article
          class="comments-context"
          aria-labelledby="photo-comments-context-title"
        >
          <h2 id="photo-comments-context-title">Description</h2>
          <div class="comments-context-content">
            <div class="comments-post-text" v-html="post.content"></div>
            <time v-if="!post.id.startsWith('local:')" class="comments-post-date" :datetime="post.created_at">
              {{ formatDate(post.created_at) }}
            </time>
          </div>
        </article>

        <header class="comments-replies-heading">
          <h2>Replies</h2>
          <span>{{ replyLabel }}</span>
        </header>

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
        <p v-else-if="discussionState === 'available'" class="empty-state">No replies yet.</p>

        <a v-if="remoteUrl" class="mastodon-reply-link" :href="remoteUrl" target="_blank" rel="noopener noreferrer">
          Reply on Mastodon <span aria-hidden="true">↗</span>
        </a>
          </div>
        </section>
      </DrawerContent>
      </DrawerPortal>
    </div>
  </DrawerRoot>
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
  background: var(--photos-panel, #f4efe8);
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
  min-width: 0;
}

.comments-panel-header h1 {
  font-size: 1.05rem;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.comments-context > h2 {
  color: var(--photos-accent);
  font-family: 'Azeret Mono Variable', monospace;
  font-size: 0.72rem;
  font-weight: 700;
  min-height: 44px;
  align-items: center;
  display: flex;
}

.comments-context > h2 {
  margin: 0;
}

.comments-replies-heading {
  align-items: baseline;
  display: flex;
  gap: 0.5rem;
  min-height: 44px;
}

.comments-replies-heading h2 {
  color: var(--photos-accent);
  font-family: 'Azeret Mono Variable', monospace;
  font-size: 0.72rem;
  font-weight: 700;
  margin: 0;
}

.comments-replies-heading span {
  color: var(--photos-muted);
  font-family: 'Azeret Mono Variable', monospace;
  font-size: 0.68rem;
}

.comments-context-content {
  display: grid;
  gap: 0.2rem;
  padding-top: 0;
}

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
  gap: 0.1rem;
  padding-bottom: 0.5rem;
}

.comments-post-text :deep(.local-post-overlay p) {
  display: block;
  margin: 0;
}

.comments-post-text :deep(.local-post-title) {
  font-size: 1.05rem;
  font-style: italic;
  line-height: 1.3;
}

.comments-post-text :deep(.local-post-location),
.comments-post-text :deep(.local-post-datetime) {
  color: var(--photos-muted);
  font-family: 'Azeret Mono Variable', monospace;
  font-size: 0.75rem;
  line-height: 1.35;
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
.photo-share-button:focus-visible,
.photo-share-popover a:focus-visible,
.photo-share-popover button:focus-visible,
.photo-qr-toggle:focus-visible {
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
.photo-qr-toggle {
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
.photo-qr-toggle:hover {
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
    align-items: center;
    background: color-mix(in srgb, var(--photos-panel) 96%, transparent);
    border: 1px solid var(--photos-border);
    border-bottom: 0;
    border-radius: 1rem 1rem 0 0;
    box-shadow: var(--photos-card-shadow);
    display: grid;
    gap: 0.65rem;
    grid-template-columns: minmax(0, 1fr) auto 44px;
    margin-inline: max(0.35rem, env(safe-area-inset-left, 0px)) max(0.35rem, env(safe-area-inset-right, 0px));
    padding: 1.05rem max(0.75rem, env(safe-area-inset-right, 0px)) max(0.75rem, env(safe-area-inset-bottom, 0px)) max(0.75rem, env(safe-area-inset-left, 0px));
    pointer-events: auto;
    position: relative;
    touch-action: pan-x;
    user-select: none;
    will-change: transform;
  }

  .comments-dock-handle {
    cursor: grab;
    height: 14px;
    left: 3rem;
    position: absolute;
    right: 3rem;
    top: 0;
  }

  .comments-dock-handle::after {
    background: color-mix(in srgb, var(--photos-muted) 52%, transparent);
    border-radius: 999px;
    content: '';
    height: 4px;
    left: 50%;
    position: absolute;
    top: 4px;
    transform: translateX(-50%);
    width: 2.5rem;
  }

  .comments-backdrop {
    background: color-mix(in srgb, var(--photos-text, #20242a) 42%, transparent);
    border: 0;
    display: block;
    inset: 0;
    opacity: 1;
    padding: 0;
    pointer-events: auto;
    position: fixed;
    z-index: 40;
    will-change: opacity;
  }

  .comments-backdrop[data-state='open'] {
    animation: comments-backdrop-in 300ms ease-out;
  }

  .comments-backdrop[data-state='closed'] {
    animation: comments-backdrop-out 220ms ease-in;
  }

  .comments-dock-trigger {
    align-items: center;
    background: transparent;
    border: 0;
    color: var(--photos-text);
    cursor: pointer;
    display: grid;
    font: inherit;
    gap: 0.1rem;
    justify-content: flex-start;
    min-height: 44px;
    min-width: 0;
    padding: 0;
    text-align: left;
  }

  .comments-dock-trigger > span {
    font-size: 1.05rem;
    font-weight: 800;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .comments-dock-trigger > small {
    color: var(--photos-muted);
    font-family: 'Azeret Mono Variable', monospace;
    font-size: 0.68rem;
  }

  .comments-section.is-modal-sheet {
    background: var(--photos-panel, #f4efe8);
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
    transform: translateY(var(--drawer-swipe-movement-y, 0px));
    transition: transform 450ms cubic-bezier(0.32, 0.72, 0, 1);
    width: auto;
    z-index: 41;
  }

  .comments-section.is-modal-sheet[data-state='open'] {
    animation: comments-sheet-in 450ms cubic-bezier(0.32, 0.72, 0, 1);
  }

  .comments-section.is-modal-sheet[data-state='closed'] {
    animation: comments-sheet-out 300ms ease-in;
  }

  .comments-section.is-modal-sheet[data-swiping] {
    transition-duration: 0ms;
  }

  .comments-section.is-modal-sheet.is-portrait-sheet {
    border: 1px solid var(--photos-border);
    border-bottom: 0;
    border-radius: 1rem 1rem 0 0;
    box-shadow: 0 -0.75rem 2.5rem color-mix(in srgb, var(--photos-text) 18%, transparent);
    height: min(88dvh, calc(100dvh - max(3.5rem, env(safe-area-inset-top, 0px))));
    top: auto;
    will-change: transform;
  }

  .comments-panel-header {
    background: var(--photos-panel, #f4efe8);
    padding-left: max(0.75rem, env(safe-area-inset-left, 0px));
    padding-right: max(0.75rem, env(safe-area-inset-right, 0px));
    padding-top: max(0.65rem, env(safe-area-inset-top, 0px));
  }

  .comments-section.is-portrait-sheet .comments-panel-header {
    cursor: grab;
    padding-top: 1.05rem;
    touch-action: pan-x;
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
    display: grid;
    gap: 0.1rem;
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

@keyframes comments-sheet-in {
  from { translate: 0 100%; }
}

@keyframes comments-sheet-out {
  to { translate: 0 100%; }
}

@keyframes comments-backdrop-in {
  from { opacity: 0; }
}

@keyframes comments-backdrop-out {
  to { opacity: 0; }
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
    animation: none;
    transition: none;
  }
}
</style>
