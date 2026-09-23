<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { AdminApiError, adminRequest, createAdminSession, deleteAdminSession, jsonRequest } from '@/admin/api'
import { loadAdminPostDraft, saveAdminPostDraft, type AdminPostDraft } from '@/admin/draft-storage'
import { formatEditorialDateTime } from '@/posts/editorial-date-time'
import type { PostMedia } from '@/posts/types'

type AdminPost = {
  canonicalUrl: string
  title: string | null
  location: string | null
  date: number | null
  time: string | null
  bodyHtml: string
  bodyMarkdown: string
  createdAt: string
  heroMediaId: string | null
  id: string
  media: PostMedia[]
  publishedAt: string | null
  slug: string
  shareUrl: string
  status: 'draft' | 'published' | 'archived'
  syndications: SyndicationSummary[]
  teaser: string
  updatedAt: string
  revision?: number
}
type SyndicationDestination = 'facebook' | 'mastodon'
type SyndicationState = 'pending' | 'published' | 'failed' | 'uncertain'
type SyndicationSummary = {
  destination: SyndicationDestination
  remoteUrl: string | null
  state: SyndicationState
}
type RevisionPhoto = { id: string; title: string | null; altText: string; caption: string | null; displayOrder: number; focalX: number | null; focalY: number | null; width: number | null; height: number | null; isHero: boolean }
type RevisionSyndication = { publicationRevision: number; destination?: string; state: string; remoteUrl: string | null; remoteStatusId: string | null; updatedAt: string }
type PublishedRevision = { revision: number; slug: string; title: string | null; createdAt: string; media: RevisionPhoto[] }
function formatHistoryDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

type Syndication = {
  attemptCount: number
  destination: SyndicationDestination
  lastError: string | null
  remoteUrl: string | null
  state: SyndicationState
}

const tokenInput = ref('')
const authenticated = ref(false)
const checkingSession = ref(true)
const posts = ref<AdminPost[]>([])
const postQuery = ref('')
const postStatus = ref<'all' | 'unarchived' | AdminPost['status']>('unarchived')
const selectedId = ref<string | null>(null)
const notice = ref('')
const error = ref('')
const busy = ref(false)
const previewHtml = ref('')
const previewBusy = ref(false)
type UploadQueueItem = {
  altText: string
  error: string
  file: File
  id: string
  previewUrl: string
  progress: number
  status: 'cancelled' | 'failed' | 'queued' | 'uploading' | 'uploaded'
  xhr: XMLHttpRequest | null
}
const uploadQueue = ref<UploadQueueItem[]>([])
const uploadRunning = ref(false)
const mediaDrafts = reactive<Record<string, { altText: string; caption: string; title: string; location: string; date: string; time: string }>>({})
const mediaSavingId = ref<string | null>(null)
const mediaRegeneratingId = ref<string | null>(null)
const allMediaRegenerating = ref(false)
const mediaPipelineNotice = ref('')
const mediaPipelineFailed = ref(false)
const mediaDialog = ref<HTMLDialogElement | null>(null)
const editingMediaId = ref<string | null>(null)
const orderSaving = ref(false)
const draggedMediaId = ref<string | null>(null)
const syndication = ref<Syndication | null>(null)
const facebookSyndication = ref<Syndication | null>(null)
const facebookCandidates = ref<Array<{ id: string; url: string }>>([])
const revisionHistory = ref<PublishedRevision[]>([])
const revisionSyndications = ref<RevisionSyndication[]>([])
let previewTimer: ReturnType<typeof setTimeout> | null = null
let autosaveTimer: ReturnType<typeof setTimeout> | null = null
let saveWorker: Promise<void> | null = null
let observedDraft = ''
const pendingServerDrafts = new Map<string, AdminPostDraft>()
const serverContentDrafts = new Map<string, string>()
const serverUpdatedAt = new Map<string, string>()
type AutosaveState = 'idle' | 'browser' | 'saving' | 'saved' | 'error'
const autosaveState = ref<AutosaveState>('idle')
const autosaveProblem = ref('')
const autosaveLabel = computed(() => {
  if (autosaveState.value === 'saving') return 'Saving…'
  if (autosaveState.value === 'saved') return 'Saved to browser and server'
  if (autosaveState.value === 'error') return autosaveProblem.value || 'Saved in browser · server retry needed'
  if (autosaveState.value === 'browser') return 'Saved in this browser'
  return ''
})
const allowedMinutes = ['00', '10', '15', '20', '30', '40', '45', '50']
const hourOptions = Array.from({ length: 24 }, (_, hour) => hour.toString().padStart(2, '0'))

const form = reactive({
  title: '',
  slug: '',
  location: '',
  date: '',
  time: '',
  bodyMarkdown: '',
})

function postDraft(post: AdminPost): AdminPostDraft {
  return {
    bodyMarkdown: post.bodyMarkdown,
    date: dateInputValue(post.date),
    location: post.location ?? '',
    slug: post.slug,
    time: post.time ?? '',
    title: post.title ?? '',
  }
}

function currentDraft(): AdminPostDraft {
  return {
    bodyMarkdown: form.bodyMarkdown,
    date: form.date,
    location: form.location,
    slug: form.slug,
    time: form.time,
    title: form.title,
  }
}

function draftJson(draft: AdminPostDraft): string {
  return JSON.stringify(draft)
}

function draftContentJson(draft: AdminPostDraft): string {
  const { slug: _slug, ...content } = draft
  return JSON.stringify(content)
}

function applyDraft(draft: AdminPostDraft) {
  form.bodyMarkdown = draft.bodyMarkdown
  form.date = draft.date
  form.location = draft.location
  form.slug = draft.slug
  form.time = draft.time
  form.title = draft.title
}

const selected = computed(() => posts.value.find((post) => post.id === selectedId.value) ?? null)
const editingMedia = computed(() => selected.value?.media.find((item) => item.id === editingMediaId.value) ?? null)
const filteredPosts = computed(() => {
  const query = postQuery.value.trim().toLocaleLowerCase()
  return posts.value.filter((post) => {
    if (postStatus.value === 'unarchived') {
      if (post.status === 'archived') return false
    } else if (postStatus.value !== 'all' && post.status !== postStatus.value) return false
    if (!query) return true
    return [post.title, post.slug, post.location, post.date?.toString(), post.time, post.bodyMarkdown]
      .some((value) => value?.toLocaleLowerCase().includes(query))
  })
})
const canPublish = computed(() => selected.value?.status === 'draft')
const canSyndicate = computed(() => selected.value?.status === 'published')
const previewMedia = computed(() => {
  const media = selected.value?.media ?? []
  const hero = media.find((item) => item.id === selected.value?.heroMediaId)
  return hero ? [hero, ...media.filter((item) => item.id !== hero.id)] : media
})
const previewDateAndTime = computed(() => formatEditorialDateTime(storedDate(form.date), form.time || null))
const mastodonTeaser = computed(() => {
  const dateAndTime = formatEditorialDateTime(storedDate(form.date), form.time || null)
  return [form.title.trim(), form.location.trim(), dateAndTime].filter(Boolean).join('\n')
})
const syndicationButtonLabel = computed(() => {
  if (!syndication.value) return 'Publish link on Mastodon'
  if (syndication.value.state === 'published') return 'Update Mastodon teaser'
  if (syndication.value.state === 'pending') return 'Mastodon publication pending'
  return 'Retry required'
})

function postThumbnail(post: AdminPost): PostMedia {
  const hero = post.media.find((item) => item.id === post.heroMediaId)
  return hero ?? post.media[0]!
}

function mediaThumbnailUrl(item: PostMedia): string {
  const separator = item.urls.thumbnail.includes('?') ? '&' : '?'
  return `${item.urls.thumbnail}${separator}admin=${encodeURIComponent(item.updatedAt)}`
}

function postLabel(post: AdminPost): string {
  return post.title || post.location || post.slug
}

function postTeaserFirstLine(post: AdminPost): string {
  return post.teaser.split(/\r?\n/).find((line) => line.trim())?.trim() || postLabel(post)
}

function syndicationLabel(item: SyndicationSummary): string {
  const destination = item.destination === 'facebook' ? 'Facebook' : 'Mastodon'
  return `${destination}: ${item.state}`
}

function replacePostSyndication(postId: string, item: SyndicationSummary) {
  const index = posts.value.findIndex((post) => post.id === postId)
  const post = posts.value[index]
  if (!post) return
  posts.value.splice(index, 1, {
    ...post,
    syndications: [
      ...post.syndications.filter(({ destination }) => destination !== item.destination),
      item,
    ],
  })
}

function postDate(date: number | null): string {
  if (!date) return 'No date'
  const value = date.toString()
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
}

function dateInputValue(date: number | null): string {
  if (!date) return ''
  const value = date.toString()
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
}

function storedDate(date: string): number | null {
  return date ? Number(date.replaceAll('-', '')) : null
}

type DateTimeDraft = { date: string; time: string }

function todayInputValue(now = new Date()): string {
  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const day = now.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

function currentTimeInputValue(now = new Date()): string {
  const hour = now.getHours().toString().padStart(2, '0')
  const minute = allowedMinutes.reduce((closest, candidate) => (
    Math.abs(Number(candidate) - now.getMinutes()) < Math.abs(Number(closest) - now.getMinutes()) ? candidate : closest
  ))
  return `${hour}:${minute}`
}

function timePart(time: string, part: 'hour' | 'minute'): string {
  const [hour = '', minute = ''] = time.split(':')
  return part === 'hour' ? hour : minute
}

function updateTimePart(draft: DateTimeDraft, part: 'hour' | 'minute', value: string) {
  if (!value) {
    draft.time = ''
    return
  }
  let hour = timePart(draft.time, 'hour') || '00'
  let minute = timePart(draft.time, 'minute') || '00'
  if (part === 'hour') hour = value
  if (part === 'minute') minute = value
  draft.time = `${hour}:${minute}`
}

function useToday(draft: DateTimeDraft) {
  draft.date = todayInputValue()
}

function useNow(draft: DateTimeDraft) {
  draft.time = currentTimeInputValue()
}

function clearDateTime(draft: DateTimeDraft) {
  draft.date = ''
  draft.time = ''
}

function usePostDateTime(draft: DateTimeDraft) {
  draft.date = form.date
  draft.time = form.time
}

function openMediaDetails(item: PostMedia) {
  editingMediaId.value = item.id
  mediaPipelineNotice.value = ''
  mediaPipelineFailed.value = false
  requestAnimationFrame(() => mediaDialog.value?.showModal())
}

function closeMediaDetails() {
  mediaDialog.value?.close()
  editingMediaId.value = null
}

function closeMediaDialogBackdrop(event: MouseEvent) {
  if (event.target === event.currentTarget) closeMediaDetails()
}

function message(value: unknown): string {
  if (value instanceof AdminApiError && value.status === 401) {
    authenticated.value = false
    return 'Your admin session is not valid. Sign in again.'
  }
  return value instanceof Error ? value.message : 'The request could not be completed.'
}

function copyToForm(post: AdminPost) {
  if (selectedId.value && selectedId.value !== post.id) queueCurrentDraftForServer()
  selectedId.value = post.id
  const fromServer = postDraft(post)
  const fromBrowser = loadAdminPostDraft(post.id)
  const serverTime = Date.parse(post.updatedAt)
  const browserIsNewer = fromBrowser
    && draftJson(fromBrowser.draft) !== draftJson(fromServer)
    && (fromBrowser.serverUpdatedAt === post.updatedAt || !Number.isFinite(serverTime) || fromBrowser.savedAt > serverTime)
  const restored = browserIsNewer ? fromBrowser.draft : fromServer
  serverContentDrafts.set(post.id, draftContentJson(fromServer))
  serverUpdatedAt.set(post.id, post.updatedAt)
  applyDraft(restored)
  observedDraft = draftJson(restored)
  previewHtml.value = browserIsNewer ? '' : post.bodyHtml
  if (!browserIsNewer) saveAdminPostDraft(post.id, fromServer, post.updatedAt)
  notice.value = ''
  error.value = ''
  autosaveProblem.value = ''
  autosaveState.value = browserIsNewer ? 'browser' : 'saved'
  syndication.value = null
  facebookSyndication.value = null
  facebookCandidates.value = []
  revisionHistory.value = []
  revisionSyndications.value = []
  post.media.forEach((item) => {
    mediaDrafts[item.id] = { altText: item.altText, caption: item.caption ?? '', title: item.title ?? '', location: item.location ?? '', date: dateInputValue(item.date), time: item.time ?? '' }
  })
  if (browserIsNewer) {
    notice.value = 'Recovered newer edits saved in this browser.'
    scheduleServerSave(post.id, restored)
    void refreshPreview()
  }
  if (post.status === 'published') { void loadSyndication(post.id); void loadFacebookSyndication(post.id); void loadHistory(post.id) }
}

async function loadFacebookSyndication(postId: string) {
  try {
    facebookSyndication.value = await adminRequest<Syndication>(`/api/admin/posts/${postId}/syndications/facebook`)
    replacePostSyndication(postId, facebookSyndication.value)
  }
  catch (loadError) { if (!(loadError instanceof AdminApiError && loadError.status === 404)) error.value = message(loadError) }
}

async function syndicateFacebook() {
  if (!selectedId.value || !window.confirm('Create the public Facebook Page link post now?')) return
  const saved = await save(); if (!saved) return
  try {
    facebookSyndication.value = await adminRequest<Syndication>(`/api/admin/posts/${saved.id}/syndications/facebook`, jsonRequest('POST'))
    replacePostSyndication(saved.id, facebookSyndication.value)
    notice.value = 'Facebook publication queued.'
  }
  catch (publishError) { error.value = message(publishError) }
}

async function retryFacebookSyndication() {
  if (!selectedId.value) return
  try {
    facebookSyndication.value = await adminRequest<Syndication>(`/api/admin/posts/${selectedId.value}/syndications/facebook/retry`, jsonRequest('POST'))
    replacePostSyndication(selectedId.value, facebookSyndication.value)
    notice.value = 'Facebook publication queued again.'
  }
  catch (retryError) { error.value = message(retryError) }
}

async function reconcileFacebookSyndication() {
  if (!selectedId.value) return
  try {
    const result = await adminRequest<{ syndication: Syndication; candidates: Array<{ id: string; url: string }> }>(`/api/admin/posts/${selectedId.value}/syndications/facebook/reconcile`, jsonRequest('POST'))
    facebookSyndication.value = result.syndication
    replacePostSyndication(selectedId.value, result.syndication)
    facebookCandidates.value = result.candidates
    notice.value = result.candidates.length === 1 ? 'Facebook publication attached.' : 'No single Facebook match was found; review candidates before resolving.'
  } catch (reconcileError) { error.value = message(reconcileError) }
}

async function resolveFacebookCandidate(candidate: { id: string; url: string }) {
  if (!selectedId.value || !window.confirm('Attach this Facebook post to the local publication?')) return
  try {
    facebookSyndication.value = await adminRequest<Syndication>(`/api/admin/posts/${selectedId.value}/syndications/facebook/resolve`, jsonRequest('POST', candidate))
    replacePostSyndication(selectedId.value, facebookSyndication.value)
    facebookCandidates.value = []
    notice.value = 'Facebook publication resolved.'
  }
  catch (resolveError) { error.value = message(resolveError) }
}

async function newDraft() {
  if (!authenticated.value || busy.value) return
  error.value = ''
  notice.value = ''
  busy.value = true
  try {
    const post = await adminRequest<AdminPost>('/api/admin/posts/empty', jsonRequest('POST'))
    replacePost(post)
    notice.value = 'Empty draft created. Add photos first, then optional writing.'
  } catch (draftError) {
    error.value = message(draftError)
  } finally {
    busy.value = false
  }
}

async function login() {
  error.value = ''
  busy.value = true
  try {
    await createAdminSession(tokenInput.value.trim())
    await loadPosts()
    authenticated.value = true
    tokenInput.value = ''
    if (posts.value[0]) copyToForm(posts.value[0])
    else await newDraft()
  } catch (loginError) {
    error.value = message(loginError)
  } finally {
    busy.value = false
  }
}

async function signOut() {
  queueCurrentDraftForServer()
  if (saveWorker) await saveWorker
  try {
    await deleteAdminSession()
  } catch {
    // Clear the local editor regardless; the server cookie will expire naturally.
  }
  authenticated.value = false
  posts.value = []
  selectedId.value = null
  tokenInput.value = ''
  form.location = ''
  form.title = ''
  form.slug = ''
  form.date = ''
  form.time = ''
  form.bodyMarkdown = ''
  previewHtml.value = ''
}

async function restoreSession() {
  try {
    await loadPosts()
    authenticated.value = true
    if (posts.value[0]) copyToForm(posts.value[0])
    else await newDraft()
  } catch (sessionError) {
    if (!(sessionError instanceof AdminApiError && sessionError.status === 401)) {
      error.value = message(sessionError)
    }
  } finally {
    checkingSession.value = false
  }
}

async function loadPosts() {
  const result = await adminRequest<{ items: AdminPost[] }>('/api/admin/posts')
  posts.value = result.items
}

function authorBody(draft = currentDraft(), existingId = selectedId.value, includeSlug = true) {
  const fields = {
    location: draft.location.trim() || null,
    title: draft.title.trim() || null,
    date: storedDate(draft.date),
    time: draft.time || null,
    ...(includeSlug ? { slug: draft.slug.trim() } : {}),
  }

  // New photo-only posts do not need to send a body at all. Existing posts still
  // send the field so clearing a previously saved body remains possible.
  return existingId || draft.bodyMarkdown
    ? { ...fields, bodyMarkdown: draft.bodyMarkdown }
    : fields
}

function slugifyTitle() {
  form.slug = form.title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 100)
    .replace(/-+$/g, '')
}

function useRandomUuidSlug() {
  form.slug = crypto.randomUUID()
}

function replacePost(post: AdminPost) {
  const index = posts.value.findIndex((item) => item.id === post.id)
  if (index === -1) posts.value.unshift(post)
  else posts.value.splice(index, 1, post)
  if (post.id !== selectedId.value) copyToForm(post)
}

function replaceMedia(updated: PostMedia) {
  const post = selected.value
  if (!post) return
  const media = post.media.map((item) => item.id === updated.id ? updated : item)
  const index = posts.value.findIndex(({ id }) => id === post.id)
  if (index !== -1) posts.value.splice(index, 1, { ...post, media })
  mediaDrafts[updated.id] = { altText: updated.altText, caption: updated.caption ?? '', title: updated.title ?? '', location: updated.location ?? '', date: dateInputValue(updated.date), time: updated.time ?? '' }
}

async function saveMedia(item: PostMedia) {
  const draft = mediaDrafts[item.id]
  if (!draft) return
  mediaSavingId.value = item.id
  error.value = ''
  try {
    const updated = await adminRequest<PostMedia>(
      `/api/admin/media/${item.id}`,
      jsonRequest('PATCH', { altText: draft.altText, caption: draft.caption.trim() || null, title: draft.title.trim() || null, location: draft.location.trim() || null, date: storedDate(draft.date), time: draft.time || null, focalX: item.focalX, focalY: item.focalY }),
    )
    replaceMedia(updated)
    notice.value = 'Photo details saved.'
    closeMediaDetails()
  } catch (mediaError) {
    error.value = message(mediaError)
  } finally {
    mediaSavingId.value = null
  }
}

async function rerunPhotoPipeline(item: PostMedia) {
  if (mediaRegeneratingId.value) return
  const draft = { ...mediaDrafts[item.id] }
  mediaRegeneratingId.value = item.id
  mediaPipelineNotice.value = ''
  mediaPipelineFailed.value = false
  error.value = ''
  notice.value = ''
  try {
    const updated = await adminRequest<PostMedia>(
      `/api/admin/media/${item.id}/regenerate`,
      { method: 'POST' },
    )
    replaceMedia(updated)
    Object.assign(mediaDrafts[item.id], draft)
    notice.value = `Photo pipeline v${updated.pipelineVersion} completed.`
    mediaPipelineNotice.value = notice.value
  } catch (pipelineError) {
    error.value = message(pipelineError)
    mediaPipelineNotice.value = error.value
    mediaPipelineFailed.value = true
  } finally {
    mediaRegeneratingId.value = null
  }
}

type BulkPhotoPipelineResult = {
  failed: number
  pipelineVersion: number
  regenerated: number
  total: number
}

async function rerunAllPhotoPipelines() {
  if (allMediaRegenerating.value) return
  if (!window.confirm('Rerun the photo pipeline for every uploaded photo? This may take a while.')) return
  allMediaRegenerating.value = true
  error.value = ''
  notice.value = ''
  try {
    const result = await adminRequest<BulkPhotoPipelineResult>(
      '/api/admin/media/regenerate-all',
      { method: 'POST' },
    )
    await loadPosts()
    if (result.total === 0) {
      notice.value = 'There are no photos to rerun.'
    } else if (result.failed > 0) {
      notice.value = `Photo pipeline v${result.pipelineVersion} reran ${result.regenerated} of ${result.total} photos; ${result.failed} failed.`
    } else {
      notice.value = `Photo pipeline v${result.pipelineVersion} reran all ${result.regenerated} photos.`
    }
  } catch (pipelineError) {
    error.value = message(pipelineError)
  } finally {
    allMediaRegenerating.value = false
  }
}

async function selectHero(item: PostMedia) {
  if (!selectedId.value) return
  try {
    const updated = await adminRequest<AdminPost>(`/api/admin/posts/${selectedId.value}/media/hero`, jsonRequest('PUT', { mediaId: item.id }))
    replacePost(updated)
    notice.value = 'Hero photo selected.'
  } catch (heroError) { error.value = message(heroError) }
}

async function setFocalPoint(item: PostMedia, event: MouseEvent) {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const focalX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
  const focalY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
  try {
    const updated = await adminRequest<PostMedia>(`/api/admin/media/${item.id}`, jsonRequest('PATCH', { focalX, focalY }))
    replaceMedia(updated)
    notice.value = 'Focal point saved.'
  } catch (focalError) { error.value = message(focalError) }
}

async function removeMedia(item: PostMedia) {
  if (!window.confirm('Remove this photo from the draft? This cannot be undone.')) return
  try {
    await adminRequest(`/api/admin/media/${item.id}`, { method: 'DELETE' })
    const post = selected.value
    if (post) updateSelectedMedia(post.media.filter(({ id }) => id !== item.id))
    notice.value = 'Photo removed.'
  } catch (removeError) { error.value = message(removeError) }
}

function updateSelectedMedia(media: PostMedia[]) {
  const post = selected.value
  if (!post) return
  const index = posts.value.findIndex(({ id }) => id === post.id)
  if (index !== -1) posts.value.splice(index, 1, { ...post, media })
}

async function saveMediaOrder(media: PostMedia[]) {
  if (!selectedId.value || orderSaving.value) return
  orderSaving.value = true
  error.value = ''
  try {
    const result = await adminRequest<{ media: PostMedia[] }>(
      `/api/admin/posts/${selectedId.value}/media/order`,
      jsonRequest('PUT', { mediaIds: media.map(({ id }) => id) }),
    )
    updateSelectedMedia(result.media)
    notice.value = 'Photo order saved.'
  } catch (orderError) {
    error.value = message(orderError)
  } finally {
    orderSaving.value = false
  }
}

async function moveMedia(index: number, offset: -1 | 1) {
  const media = [...(selected.value?.media ?? [])]
  const target = index + offset
  if (!media[index] || target < 0 || target >= media.length) return
  ;[media[index], media[target]] = [media[target], media[index]]
  await saveMediaOrder(media)
}

function startMediaDrag(item: PostMedia, event: DragEvent) {
  draggedMediaId.value = item.id
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', item.id)
  }
}

async function dropMedia(targetId: string) {
  const sourceId = draggedMediaId.value
  draggedMediaId.value = null
  if (!sourceId || sourceId === targetId) return
  const media = [...(selected.value?.media ?? [])]
  const sourceIndex = media.findIndex(({ id }) => id === sourceId)
  const targetIndex = media.findIndex(({ id }) => id === targetId)
  if (sourceIndex < 0 || targetIndex < 0) return
  const [moved] = media.splice(sourceIndex, 1)
  media.splice(targetIndex, 0, moved)
  await saveMediaOrder(media)
}

function canSaveDraftToServer(draft: AdminPostDraft): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug.trim())
}

function canAutosavePostToServer(postId: string): boolean {
  return posts.value.find((post) => post.id === postId)?.status === 'draft'
}

function storeDraftInBrowser(postId: string, draft: AdminPostDraft): boolean {
  const stored = saveAdminPostDraft(postId, draft, serverUpdatedAt.get(postId) ?? '')
  if (!stored && postId === selectedId.value) {
    autosaveProblem.value = 'Browser storage is unavailable'
    autosaveState.value = 'error'
  }
  return stored
}

function scheduleServerSave(postId: string, draft: AdminPostDraft) {
  if (autosaveTimer) clearTimeout(autosaveTimer)
  if (!canAutosavePostToServer(postId)) {
    return
  }
  autosaveTimer = setTimeout(() => {
    autosaveTimer = null
    pendingServerDrafts.set(postId, { ...draft })
    void runSaveWorker()
  }, 700)
}

function queueCurrentDraftForServer() {
  if (autosaveTimer) {
    clearTimeout(autosaveTimer)
    autosaveTimer = null
  }
  const postId = selectedId.value
  if (!postId) return
  const draft = currentDraft()
  if (!canAutosavePostToServer(postId) || serverContentDrafts.get(postId) === draftContentJson(draft)) return
  pendingServerDrafts.set(postId, draft)
  void runSaveWorker()
}

function mergeServerDraft(post: AdminPost, submitted: AdminPostDraft, autosave = false) {
  const index = posts.value.findIndex((item) => item.id === post.id)
  if (index === -1) posts.value.unshift(post)
  else posts.value.splice(index, 1, post)

  const saved = postDraft(post)
  serverContentDrafts.set(post.id, draftContentJson(saved))
  serverUpdatedAt.set(post.id, post.updatedAt)

  if (selectedId.value !== post.id) {
    const local = loadAdminPostDraft(post.id)
    if (!local || draftJson(local.draft) === draftJson(submitted)) {
      saveAdminPostDraft(post.id, saved, post.updatedAt)
    }
    return
  }

  const latest = currentDraft()
  const merged: AdminPostDraft = { ...latest }
  for (const field of Object.keys(saved) as Array<keyof AdminPostDraft>) {
    if (autosave && field === 'slug') continue
    if (latest[field] === submitted[field]) merged[field] = saved[field]
  }
  applyDraft(merged)
  observedDraft = draftJson(merged)
  storeDraftInBrowser(post.id, merged)

  const serverHasLatest = autosave
    ? draftContentJson(merged) === draftContentJson(saved)
    : draftJson(merged) === draftJson(saved)
  if (serverHasLatest) {
    autosaveProblem.value = ''
    autosaveState.value = draftJson(merged) === draftJson(saved) ? 'saved' : 'browser'
  } else {
    autosaveState.value = 'browser'
    scheduleServerSave(post.id, merged)
  }
}

function runSaveWorker(): Promise<void> {
  if (saveWorker) return saveWorker
  const work = async () => {
    while (pendingServerDrafts.size) {
      const entry = pendingServerDrafts.entries().next().value as [string, AdminPostDraft] | undefined
      if (!entry) break
      const [postId, draft] = entry
      pendingServerDrafts.delete(postId)
      if (serverContentDrafts.get(postId) === draftContentJson(draft)) continue
      if (postId === selectedId.value) {
        autosaveProblem.value = ''
        autosaveState.value = 'saving'
      }
      try {
        const post = await adminRequest<AdminPost>(
          `/api/admin/posts/${postId}/autosave`,
          jsonRequest('PATCH', authorBody(draft, postId, false)),
        )
        mergeServerDraft(post, draft, true)
      } catch (saveError) {
        const saveMessage = message(saveError)
        if (postId === selectedId.value) {
          autosaveProblem.value = `Saved in browser · ${saveMessage}`
          autosaveState.value = 'error'
        }
      }
    }
  }
  saveWorker = work().finally(() => {
    saveWorker = null
    if (pendingServerDrafts.size) void runSaveWorker()
  })
  return saveWorker
}

async function save(): Promise<AdminPost | null> {
  error.value = ''
  notice.value = ''
  busy.value = true
  try {
    if (selectedId.value) {
      const postId = selectedId.value
      if (autosaveTimer) {
        clearTimeout(autosaveTimer)
        autosaveTimer = null
      }
      if (saveWorker) await saveWorker
      const draft = currentDraft()
      storeDraftInBrowser(postId, draft)
      if (!canSaveDraftToServer(draft)) throw new Error('Fix the slug before saving to the server.')
      const post = await adminRequest<AdminPost>(
        `/api/admin/posts/${postId}`,
        jsonRequest('PATCH', authorBody(draft, postId)),
      )
      mergeServerDraft(post, draft)
      notice.value = 'Saved.'
      return post
    }
    const post = await adminRequest<AdminPost>('/api/admin/posts', jsonRequest('POST', authorBody()))
    replacePost(post)
    notice.value = 'Saved.'
    return post
  } catch (saveError) {
    error.value = message(saveError)
    return null
  } finally {
    busy.value = false
  }
}

async function publish() {
  if (!selectedId.value || !window.confirm('Publish this post on JGantts.com now?')) return
  const saved = await save()
  if (!saved) return
  error.value = ''
  busy.value = true
  try {
    const post = await adminRequest<AdminPost>(
      `/api/admin/posts/${saved.id}/publish`,
      jsonRequest('POST'),
    )
    replacePost(post)
    notice.value = 'Published on JGantts.com.'
  } catch (publishError) {
    error.value = message(publishError)
  } finally {
    busy.value = false
  }
}

async function archive() {
  if (!selectedId.value || !window.confirm('Archive this post? Its canonical page will return Gone.')) return
  error.value = ''
  busy.value = true
  try {
    const post = await adminRequest<AdminPost>(
      `/api/admin/posts/${selectedId.value}/archive`,
      jsonRequest('POST'),
    )
    replacePost(post)
    notice.value = 'Post archived.'
  } catch (archiveError) {
    error.value = message(archiveError)
  } finally {
    busy.value = false
  }
}

async function unpublish() {
  if (!selectedId.value || !window.confirm('Unpublish this post? Its public page will no longer be available.')) return
  error.value = ''
  busy.value = true
  try {
    const post = await adminRequest<AdminPost>(`/api/admin/posts/${selectedId.value}/unpublish`, jsonRequest('POST'))
    replacePost(post)
    notice.value = 'Post unpublished and returned to draft.'
  } catch (unpublishError) {
    error.value = message(unpublishError)
  } finally {
    busy.value = false
  }
}

async function loadSyndication(postId: string) {
  try {
    syndication.value = await adminRequest<Syndication>(
      `/api/admin/posts/${postId}/syndications/mastodon`,
    )
    replacePostSyndication(postId, syndication.value)
  } catch (loadError) {
    if (!(loadError instanceof AdminApiError && loadError.status === 404)) error.value = message(loadError)
  }
}

async function loadHistory(postId: string) {
  try {
    const result = await adminRequest<{ revisions: PublishedRevision[]; syndications: RevisionSyndication[]; publicationHistory: RevisionSyndication[] }>(`/api/admin/posts/${postId}/history`)
    revisionHistory.value = result.revisions
    revisionSyndications.value = result.publicationHistory
  } catch { revisionHistory.value = []; revisionSyndications.value = [] }
}

async function syndicate() {
  const editing = syndication.value?.state === 'published'
  const confirmation = editing
    ? 'Update the existing public Mastodon teaser now?'
    : 'Create the public Mastodon link post now?'
  if (!selectedId.value || !window.confirm(confirmation)) return
  const saved = await save()
  if (!saved) return
  error.value = ''
  busy.value = true
  try {
    syndication.value = await adminRequest<Syndication>(
      `/api/admin/posts/${saved.id}/syndications/mastodon`,
      jsonRequest(editing ? 'PATCH' : 'POST'),
    )
    replacePostSyndication(saved.id, syndication.value)
    notice.value = editing ? 'Mastodon teaser update queued.' : 'Mastodon publication queued.'
  } catch (syndicationError) {
    error.value = message(syndicationError)
  } finally {
    busy.value = false
  }
}

async function retrySyndication() {
  if (!selectedId.value) return
  try {
    syndication.value = await adminRequest<Syndication>(
      `/api/admin/posts/${selectedId.value}/syndications/mastodon/retry`,
      jsonRequest('POST'),
    )
    replacePostSyndication(selectedId.value, syndication.value)
    notice.value = 'Mastodon publication queued again.'
  } catch (retryError) {
    error.value = message(retryError)
  }
}

function addFiles(files: File[]) {
  for (const file of files) {
    uploadQueue.value.push({
      altText: '', error: '', file,
      id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
      previewUrl: URL.createObjectURL(file), progress: 0, status: 'queued', xhr: null,
    })
  }
}

function chooseFiles(event: Event) {
  const input = event.target as HTMLInputElement
  addFiles(Array.from(input.files ?? []))
  input.value = ''
}

function dropFiles(event: DragEvent) {
  addFiles(Array.from(event.dataTransfer?.files ?? []).filter((file) => file.type.startsWith('image/')))
}

function removeUpload(item: UploadQueueItem) {
  item.xhr?.abort()
  URL.revokeObjectURL(item.previewUrl)
  uploadQueue.value = uploadQueue.value.filter(({ id }) => id !== item.id)
}

function cancelUpload(item: UploadQueueItem) {
  if (item.status === 'uploading') item.xhr?.abort()
  else item.status = 'cancelled'
}

function uploadOne(item: UploadQueueItem): Promise<PostMedia> {
  if (!selectedId.value) return Promise.reject(new Error('Create a draft before uploading.'))
  const body = new FormData()
  body.set('postId', selectedId.value)
  body.set('altText', item.altText.trim())
  body.set('file', item.file)
  item.status = 'uploading'
  item.error = ''
  item.progress = 0
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    item.xhr = xhr
    xhr.open('POST', '/api/admin/media')
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) item.progress = Math.round((event.loaded / event.total) * 100)
    }
    xhr.onabort = () => {
      item.status = 'cancelled'
      item.xhr = null
      reject(new Error('Upload cancelled.'))
    }
    xhr.onerror = () => reject(new Error('Network error while uploading.'))
    xhr.onload = () => {
      item.xhr = null
      let response: unknown
      try { response = JSON.parse(xhr.responseText) } catch { response = null }
      if (xhr.status >= 200 && xhr.status < 300) resolve(response as PostMedia)
      else reject(new Error((response as { error?: { message?: string } })?.error?.message || `Upload failed (${xhr.status}).`))
    }
    xhr.send(body)
  })
}

async function uploadQueued() {
  const pending = uploadQueue.value.filter((item) =>
    ['queued', 'failed'].includes(item.status))
  if (!pending.length || uploadRunning.value) return
  uploadRunning.value = true
  error.value = ''
  let cursor = 0
  const worker = async () => {
    while (cursor < pending.length) {
      const item = pending[cursor++]
      try {
        const uploaded = await uploadOne(item)
        item.status = 'uploaded'
        item.progress = 100
        const current = selected.value
        if (current) replacePost({ ...current, media: [...current.media, uploaded] })
      } catch (uploadError) {
        if (item.status !== 'cancelled') item.status = 'failed'
        item.error = message(uploadError)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(2, pending.length) }, worker))
  uploadRunning.value = false
  notice.value = `${pending.filter(({ status }) => status === 'uploaded').length} photo(s) uploaded.`
}

async function retryUpload(item: UploadQueueItem) {
  item.status = 'queued'
  await uploadQueued()
}

async function refreshPreview() {
  if (!authenticated.value || !form.bodyMarkdown.trim()) {
    previewHtml.value = ''
    return
  }
  previewBusy.value = true
  try {
    const result = await adminRequest<{ bodyHtml: string }>(
      '/api/admin/posts/preview',
      jsonRequest('POST', { bodyMarkdown: form.bodyMarkdown }),
    )
    previewHtml.value = result.bodyHtml
  } catch (previewError) {
    error.value = message(previewError)
  } finally {
    previewBusy.value = false
  }
}

watch(() => form.bodyMarkdown, () => {
  if (previewTimer) clearTimeout(previewTimer)
  previewTimer = setTimeout(() => { void refreshPreview() }, 350)
})

watch(
  () => [form.bodyMarkdown, form.date, form.location, form.slug, form.time, form.title],
  () => {
    const draft = currentDraft()
    const serialized = draftJson(draft)
    if (serialized === observedDraft) return
    observedDraft = serialized
    const postId = selectedId.value
    if (!postId) return
    autosaveProblem.value = ''
    autosaveState.value = storeDraftInBrowser(postId, draft) ? 'browser' : 'error'
    scheduleServerSave(postId, draft)
  },
)

onMounted(() => { void restoreSession() })

onBeforeUnmount(() => {
  if (previewTimer) clearTimeout(previewTimer)
  queueCurrentDraftForServer()
  uploadQueue.value.forEach((item) => {
    item.xhr?.abort()
    URL.revokeObjectURL(item.previewUrl)
  })
})
</script>

<template>
  <main class="admin-page">
    <section v-if="checkingSession" class="login-card" aria-live="polite">
      <p>Checking admin session…</p>
    </section>
    <section v-else-if="!authenticated" class="login-card">
      <p class="eyebrow">Private authoring</p>
      <h1>Post editor</h1>
      <p>Your sign-in is kept in a secure browser cookie until you log out.</p>
      <form @submit.prevent="login">
        <label for="admin-token">Admin token</label>
        <input id="admin-token" v-model="tokenInput" autocomplete="off" type="password">
        <button :disabled="busy || !tokenInput.trim()" type="submit">{{ busy ? 'Checking…' : 'Unlock editor' }}</button>
      </form>
      <p v-if="error" class="message message--error" role="alert">{{ error }}</p>
    </section>

    <template v-else>
      <header class="admin-toolbar">
        <div>
          <p class="eyebrow">Private authoring</p>
          <h1>Post editor</h1>
        </div>
        <div class="toolbar-actions">
          <button class="button-quiet" :disabled="allMediaRegenerating" type="button" @click="rerunAllPhotoPipelines">
            {{ allMediaRegenerating ? 'Rerunning all photos…' : 'Rerun all photos' }}
          </button>
          <button class="button-secondary" :disabled="busy" type="button" @click="newDraft">New draft</button>
          <button class="button-quiet" type="button" @click="signOut">Log out</button>
        </div>
      </header>

      <div class="admin-workspace">
        <aside class="post-list" aria-label="Posts">
          <div class="post-list-controls">
            <label>
              <span>Find posts</span>
              <input v-model="postQuery" type="search" placeholder="Search text, place, or date">
            </label>
            <label>
              <span>Status</span>
              <select v-model="postStatus">
                <option value="unarchived">Unarchived</option>
                <option value="all">All statuses</option>
                <option value="draft">Drafts</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <span class="post-count">{{ filteredPosts.length }} of {{ posts.length }}</span>
          </div>
          <button
            v-for="post in filteredPosts"
            :key="post.id"
            :class="{ active: post.id === selectedId }"
            type="button"
            @click="copyToForm(post)"
          >
            <span v-if="post.media.length" class="post-thumbnail" aria-hidden="true">
              <img
                alt=""
                decoding="async"
                loading="lazy"
                :src="mediaThumbnailUrl(postThumbnail(post))"
              >
              <span v-if="post.media.length > 1" class="photo-count">+{{ post.media.length - 1 }}</span>
            </span>
            <span v-else class="post-thumbnail-empty" aria-hidden="true">No photo</span>
            <span class="post-list-copy">
              <strong :title="post.teaser">{{ postTeaserFirstLine(post) }}</strong>
              <span class="post-list-meta">
                <span>{{ postDate(post.date) }} · {{ post.status }}</span>
                <span v-if="post.syndications.length" class="post-syndications">
                  <span
                    v-for="item in post.syndications"
                    :key="item.destination"
                    class="syndication-icon"
                    :class="[`is-${item.destination}`, `is-${item.state}`]"
                    role="img"
                    :aria-label="syndicationLabel(item)"
                    :title="syndicationLabel(item)"
                  >
                    <span aria-hidden="true">{{ item.destination === 'facebook' ? 'f' : 'M' }}</span>
                  </span>
                </span>
              </span>
            </span>
          </button>
          <p v-if="!posts.length">No saved posts yet.</p>
          <p v-else-if="!filteredPosts.length">No posts match these filters.</p>
        </aside>

        <section class="editor-card">
          <section class="post-preview" aria-labelledby="post-preview-title">
            <div class="section-heading">
              <h2 id="post-preview-title">Post preview</h2>
              <span v-if="previewBusy">Updating…</span>
              <span v-else>Live preview</span>
            </div>
            <article class="post-preview-card">
              <div v-if="previewMedia.length" class="post-preview-media">
                <img
                  v-for="item in previewMedia"
                  :key="item.id"
                  :alt="item.altText"
                  :class="{ 'post-preview-hero': item.id === selected?.heroMediaId }"
                  :src="mediaThumbnailUrl(item)"
                >
              </div>
              <div class="post-preview-copy">
                <h3 v-if="form.title.trim()">{{ form.title }}</h3>
                <p v-if="form.location.trim() || previewDateAndTime" class="post-preview-meta">
                  <span v-if="form.location.trim()">{{ form.location }}</span>
                  <span v-if="previewDateAndTime">{{ previewDateAndTime }}</span>
                </p>
                <div v-if="previewHtml" class="preview-body" v-html="previewHtml"></div>
                <p v-else-if="!previewMedia.length" class="empty-state">Add photos or text to preview the post.</p>
                <p v-else-if="!form.location.trim() && !form.date && !form.time" class="empty-state">Photo-only post</p>
              </div>
            </article>
          </section>

          <section v-if="selectedId" class="media-panel media-panel--primary" aria-labelledby="media-title">
            <div class="section-heading"><h2 id="media-title">Start with photos</h2><span>JPEG, PNG, WebP, AVIF, HEIC, or HEIF · 100 MB per photo</span></div>
            <div v-if="selected?.media.length" class="media-grid">
              <figure
                v-for="(item, index) in selected.media"
                :key="item.id"
                :class="{ 'is-dragging': draggedMediaId === item.id }"
                draggable="true"
                @dragend="draggedMediaId = null"
                @dragover.prevent
                @dragstart="startMediaDrag(item, $event)"
                @drop.prevent="dropMedia(item.id)"
              >
                <button class="media-preview" type="button" :aria-label="`Set focal point for photo ${index + 1}`" @click="setFocalPoint(item, $event)">
                  <img :alt="item.altText" :src="mediaThumbnailUrl(item)">
                  <span class="focal-marker" :style="{ left: `${(item.focalX ?? 0.5) * 100}%`, top: `${(item.focalY ?? 0.5) * 100}%` }"></span>
                </button>
                <figcaption>
                  <div class="media-order-actions">
                    <button class="button-secondary" :class="{ 'is-selected': selected?.heroMediaId === item.id }" type="button" @click="selectHero(item)">{{ selected?.heroMediaId === item.id ? 'Hero photo' : 'Set as hero' }}</button>
                    <button class="button-quiet" type="button" @click="removeMedia(item)">Remove photo</button>
                  </div>
                  <div class="media-order-actions" aria-label="Change photo position">
                    <button class="button-secondary" :disabled="orderSaving || index === 0" type="button" @click="moveMedia(index, -1)">Move earlier</button>
                    <button class="button-secondary" :disabled="orderSaving || index === selected.media.length - 1" type="button" @click="moveMedia(index, 1)">Move later</button>
                  </div>
                  <button class="button-secondary" type="button" @click="openMediaDetails(item)">Edit photo details</button>
                </figcaption>
              </figure>
            </div>
            <p v-else class="empty-state">Choose the first photograph for this draft.</p>
            <label class="photo-dropzone" @dragover.prevent @drop.prevent="dropFiles">
              <strong>Choose or drop photos</strong>
              <span>Select multiple JPEG, PNG, WebP, AVIF, HEIC, or HEIF files.</span>
              <input accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,.heic,.heif" multiple type="file" @change="chooseFiles">
            </label>
            <div v-if="uploadQueue.length" class="upload-queue">
              <article v-for="item in uploadQueue" :key="item.id" class="upload-item">
                <img alt="" :src="item.previewUrl">
                <div>
                  <strong>{{ item.file.name }}</strong>
                  <label>Alt text (optional) <input v-model="item.altText" maxlength="2000"></label>
                  <progress v-if="item.status === 'uploading'" max="100" :value="item.progress">{{ item.progress }}%</progress>
                  <p v-if="item.error" class="message message--error">{{ item.error }}</p>
                  <span class="upload-status">{{ item.status }}<template v-if="item.status === 'uploading'"> · {{ item.progress }}%</template></span>
                </div>
                <div class="upload-item-actions">
                  <button v-if="item.status === 'failed' || item.status === 'cancelled'" class="button-secondary" type="button" @click="retryUpload(item)">Retry</button>
                  <button v-if="item.status === 'uploading' || item.status === 'queued'" class="button-quiet" type="button" @click="cancelUpload(item)">Cancel</button>
                  <button v-else class="button-quiet" type="button" @click="removeUpload(item)">Remove</button>
                </div>
              </article>
              <button :disabled="uploadRunning || !uploadQueue.some((item) => ['queued', 'failed'].includes(item.status))" type="button" @click="uploadQueued">
                {{ uploadRunning ? 'Uploading…' : 'Upload ready photos' }}
              </button>
            </div>
          </section>

          <form class="editor-form" @submit.prevent="save" @keydown.meta.s.prevent="save" @keydown.ctrl.s.prevent="save">
            <div class="status-row">
              <span class="status-chip">{{ selected?.status || 'unsaved' }}</span>
              <span v-if="autosaveLabel" class="autosave-status" :class="{ 'autosave-status--error': autosaveState === 'error' }" role="status">{{ autosaveLabel }}</span>
              <a v-if="selected?.status === 'published'" :href="selected.shareUrl" target="_blank">View post ↗</a>
            </div>
            <label>Title <input v-model="form.title" maxlength="200"></label>
            <label>
              Slug
              <span class="slug-input-row">
                <input
                  v-model="form.slug"
                  maxlength="100"
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  required
                  title="Use lowercase letters, numbers, and single hyphens."
                >
                <button class="button-secondary" type="button" @click="slugifyTitle">Use title</button>
                <button class="button-secondary" type="button" @click="useRandomUuidSlug">Random UUID slug</button>
              </span>
              <small>URL-safe text: lowercase letters, numbers, and single hyphens. Changing it keeps the old URL working.</small>
            </label>
            <label>Location <input v-model="form.location" maxlength="500"></label>
            <fieldset class="date-time-editor">
              <legend>Date and time <span class="optional-field">Optional</span></legend>
              <div class="date-time-inputs">
                <label>Date <input v-model="form.date" type="date"></label>
                <div class="time-editor">
                  <span>Time</span>
                  <div class="restricted-time-inputs">
                    <label><span class="visually-hidden">Hour</span>
                      <select aria-label="Hour" :value="timePart(form.time, 'hour')" @change="updateTimePart(form, 'hour', ($event.target as HTMLSelectElement).value)">
                        <option value="">Hour</option>
                        <option v-for="hour in hourOptions" :key="hour" :value="hour">{{ hour }}</option>
                      </select>
                    </label>
                    <span aria-hidden="true">:</span>
                    <label><span class="visually-hidden">Minute</span>
                      <select aria-label="Minute" :value="timePart(form.time, 'minute')" @change="updateTimePart(form, 'minute', ($event.target as HTMLSelectElement).value)">
                        <option value="">Minute</option>
                        <option v-for="minute in allowedMinutes" :key="minute" :value="minute">{{ minute }}</option>
                      </select>
                    </label>
                  </div>
                </div>
              </div>
              <div class="date-time-actions" aria-label="Date and time shortcuts">
                <button class="button-secondary" type="button" @click="useToday(form)">Today</button>
                <button class="button-secondary" type="button" @click="useNow(form)">Now</button>
                <button class="button-quiet" :disabled="!form.date && !form.time" type="button" @click="clearDateTime(form)">Clear</button>
              </div>
              <small>Type a value, use the picker, or use a shortcut.</small>
            </fieldset>
            <label>Body (Markdown) <span class="optional-field">Optional</span> <textarea v-model="form.bodyMarkdown" class="markdown-editor" maxlength="100000"></textarea></label>
            <div class="editor-actions">
              <button :disabled="busy" type="submit">{{ busy ? 'Working…' : selectedId ? 'Save now' : 'Create draft' }}</button>
              <button v-if="canPublish" class="button-secondary" :disabled="busy" type="button" @click="publish">Publish locally</button>
              <button v-if="selected?.status === 'published'" class="button-secondary" :disabled="busy" type="button" @click="unpublish">Unpublish</button>
              <button v-if="selected && selected.status !== 'archived'" class="button-quiet" :disabled="busy" type="button" @click="archive">Archive</button>
            </div>
          </form>

          <section v-if="canSyndicate" class="mastodon-panel" aria-labelledby="syndication-title">
            <div class="section-heading"><h2 id="syndication-title">Mastodon</h2><span>Explicit syndication only</span></div>
            <label>Teaser <textarea :value="mastodonTeaser" readonly rows="3"></textarea></label>
            <small>Generated automatically from the post title, location, date, and time.</small>
            <div class="editor-actions">
              <button :disabled="busy || syndication?.state === 'pending' || syndication?.state === 'failed'" type="button" @click="syndicate">
                {{ syndicationButtonLabel }}
              </button>
              <button v-if="syndication?.state === 'failed'" class="button-secondary" type="button" @click="retrySyndication">Retry</button>
              <a v-if="syndication?.remoteUrl" :href="syndication.remoteUrl" target="_blank">Open on Mastodon ↗</a>
            </div>
            <p v-if="syndication" class="syndication-state">State: {{ syndication.state }} · attempts: {{ syndication.attemptCount }}</p>
            <p v-if="syndication?.lastError" class="message message--error">{{ syndication.lastError }}</p>
          </section>

          <section v-if="canSyndicate" class="mastodon-panel" aria-labelledby="facebook-syndication-title">
            <div class="section-heading"><h2 id="facebook-syndication-title">Facebook Page</h2><span>Explicit syndication only</span></div>
            <p>Creates an immutable link post pointing to this exact published revision.</p>
            <div class="editor-actions">
              <button :disabled="busy || facebookSyndication?.state === 'pending' || facebookSyndication?.state === 'uncertain'" type="button" @click="syndicateFacebook">
                {{ facebookSyndication?.state === 'pending' ? 'Facebook publication pending' : 'Publish link on Facebook' }}
              </button>
              <button v-if="facebookSyndication?.state === 'failed' || (facebookSyndication?.state === 'uncertain' && facebookSyndication.lastError?.startsWith('Reconciliation found no matching'))" class="button-secondary" type="button" @click="retryFacebookSyndication">Retry</button>
              <button v-if="facebookSyndication?.state === 'uncertain'" class="button-secondary" type="button" @click="reconcileFacebookSyndication">Reconcile</button>
              <a v-if="facebookSyndication?.remoteUrl" :href="facebookSyndication.remoteUrl" target="_blank">Open on Facebook ↗</a>
            </div>
            <p v-if="facebookSyndication" class="syndication-state">State: {{ facebookSyndication.state }} · attempts: {{ facebookSyndication.attemptCount }}</p>
            <p v-if="facebookSyndication?.state === 'uncertain'" class="message message--error">Delivery is uncertain. Reconcile before retrying.</p>
            <ul v-if="facebookCandidates.length"><li v-for="candidate in facebookCandidates" :key="candidate.id"><a :href="candidate.url" target="_blank">{{ candidate.url }}</a> <button class="button-quiet" type="button" @click="resolveFacebookCandidate(candidate)">Attach</button></li></ul>
            <p v-if="facebookSyndication?.lastError" class="message message--error">{{ facebookSyndication.lastError }}</p>
          </section>

          <section v-if="selected && revisionHistory.length" class="mastodon-panel" aria-labelledby="history-title">
            <div class="section-heading"><h2 id="history-title">Published revisions</h2><span>{{ revisionHistory.length }}</span></div>
            <ul>
              <li v-for="item in revisionHistory" :key="item.revision">
                <a :href="`/photos/${encodeURIComponent(item.slug)}${revisionHistory.length > 1 ? `?rev=${item.revision}` : ''}`" target="_blank">Revision {{ item.revision }}</a>
                · {{ formatHistoryDate(item.createdAt) }}
                <span v-if="item.title"> · {{ item.title }}</span>
                <ul v-if="item.media.length">
                  <li v-for="photo in item.media" :key="photo.id">
                    <img class="revision-photo-thumb" :src="`/media/${encodeURIComponent(photo.id)}/thumbnail`" alt="">
                    Photo {{ photo.displayOrder + 1 }}<span v-if="photo.isHero"> · hero</span>
                    · {{ photo.altText }}<span v-if="photo.caption"> · “{{ photo.caption }}”</span>
                  </li>
                </ul>
              </li>
            </ul>
            <p v-if="revisionSyndications.length" class="syndication-state">
              <span v-for="item in revisionSyndications" :key="`${item.publicationRevision}-${item.remoteUrl ?? item.state}`">{{ item.destination === 'facebook' ? 'Facebook' : 'Mastodon' }}: r{{ item.publicationRevision }} {{ item.state }}<a v-if="item.remoteUrl" :href="item.remoteUrl" target="_blank"> ↗</a>{{ ' ' }}</span>
            </p>
          </section>

          <p v-if="notice" class="message" role="status">{{ notice }}</p>
          <p v-if="error" class="message message--error" role="alert">{{ error }}</p>
        </section>
      </div>

      <dialog ref="mediaDialog" class="media-dialog" @click="closeMediaDialogBackdrop" @close="editingMediaId = null">
        <form v-if="editingMedia" class="media-details-form" @submit.prevent="saveMedia(editingMedia)">
          <header>
            <div>
              <p class="eyebrow">Photo details</p>
              <h2>Edit photo</h2>
            </div>
            <button class="button-quiet dialog-close" type="button" aria-label="Close photo details" @click="closeMediaDetails">×</button>
          </header>
          <img :alt="editingMedia.altText" :src="mediaThumbnailUrl(editingMedia)">
          <div class="photo-pipeline-status">
            <p class="photo-technical">
              {{ editingMedia.width }} × {{ editingMedia.height }} · {{ editingMedia.processingState }} ·
              pipeline {{ editingMedia.pipelineVersion === null ? 'legacy/unversioned' : `v${editingMedia.pipelineVersion}` }}
            </p>
            <button
              class="button-secondary"
              :disabled="mediaRegeneratingId === editingMedia.id || mediaSavingId === editingMedia.id"
              type="button"
              @click="rerunPhotoPipeline(editingMedia)"
            >
              {{ mediaRegeneratingId === editingMedia.id ? 'Running pipeline…' : 'Rerun photo pipeline' }}
            </button>
          </div>
          <p
            v-if="mediaPipelineNotice"
            class="message"
            :class="{ 'message--error': mediaPipelineFailed }"
            role="status"
          >{{ mediaPipelineNotice }}</p>
          <label>Title <input v-model="mediaDrafts[editingMedia.id].title" maxlength="200"></label>
          <label>Alt text (optional) <textarea v-model="mediaDrafts[editingMedia.id].altText" maxlength="2000" rows="3"></textarea></label>
          <label>Caption <textarea v-model="mediaDrafts[editingMedia.id].caption" maxlength="5000" rows="3"></textarea></label>
          <label>Location <input v-model="mediaDrafts[editingMedia.id].location" maxlength="500"></label>
          <fieldset class="date-time-editor">
            <legend>Date and time <span class="optional-field">Optional</span></legend>
            <div class="date-time-inputs">
              <label>Date <input v-model="mediaDrafts[editingMedia.id].date" type="date"></label>
              <div class="time-editor">
                <span>Time</span>
                <div class="restricted-time-inputs">
                  <label><span class="visually-hidden">Hour</span>
                    <select aria-label="Hour" :value="timePart(mediaDrafts[editingMedia.id].time, 'hour')" @change="updateTimePart(mediaDrafts[editingMedia.id], 'hour', ($event.target as HTMLSelectElement).value)">
                      <option value="">Hour</option>
                      <option v-for="hour in hourOptions" :key="hour" :value="hour">{{ hour }}</option>
                    </select>
                  </label>
                  <span aria-hidden="true">:</span>
                  <label><span class="visually-hidden">Minute</span>
                    <select aria-label="Minute" :value="timePart(mediaDrafts[editingMedia.id].time, 'minute')" @change="updateTimePart(mediaDrafts[editingMedia.id], 'minute', ($event.target as HTMLSelectElement).value)">
                      <option value="">Minute</option>
                      <option v-for="minute in allowedMinutes" :key="minute" :value="minute">{{ minute }}</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>
            <div class="date-time-actions" aria-label="Photo date and time shortcuts">
              <button class="button-secondary" type="button" @click="useToday(mediaDrafts[editingMedia.id])">Today</button>
              <button class="button-secondary" type="button" @click="useNow(mediaDrafts[editingMedia.id])">Now</button>
              <button class="button-secondary" :disabled="!form.date && !form.time" type="button" @click="usePostDateTime(mediaDrafts[editingMedia.id])">Use post date/time</button>
              <button class="button-quiet" :disabled="!mediaDrafts[editingMedia.id].date && !mediaDrafts[editingMedia.id].time" type="button" @click="clearDateTime(mediaDrafts[editingMedia.id])">Clear</button>
            </div>
          </fieldset>
          <div class="editor-actions">
            <button :disabled="mediaSavingId === editingMedia.id || mediaRegeneratingId === editingMedia.id" type="submit">
              {{ mediaSavingId === editingMedia.id ? 'Saving…' : 'Save photo details' }}
            </button>
            <button class="button-secondary" type="button" @click="closeMediaDetails">Cancel</button>
          </div>
        </form>
      </dialog>
    </template>
  </main>
</template>

<style scoped>
.admin-page { box-sizing: border-box; margin: 1.5rem auto 4rem; max-width: 86rem; padding: 0 1.25rem; width: 100%; }
.login-card, .editor-card, .post-list { background: color-mix(in srgb, var(--bg) 82%, transparent); border: 1px solid var(--border); border-radius: 1rem; }
.login-card { display: grid; gap: 1rem; margin: 5rem auto; max-width: 30rem; padding: clamp(1.5rem, 5vw, 3rem); }
.login-card h1, .admin-toolbar h1 { font-size: clamp(2rem, 5vw, 3.2rem); font-weight: 700; line-height: 1; }
.login-card form, .editor-form, .upload-form, .mastodon-panel { display: grid; gap: 1rem; }
.eyebrow, .section-heading span, .post-list-meta, .post-count, .post-list-controls label > span, .post-thumbnail-empty, .syndication-state { color: var(--muted); font-family: 'Azeret Mono Variable', monospace; font-size: 0.72rem; }
.admin-toolbar, .toolbar-actions, .editor-actions, .status-row, .section-heading { align-items: center; display: flex; gap: 0.75rem; justify-content: space-between; }
.admin-toolbar { margin-bottom: 1.25rem; }
.admin-workspace { align-items: start; display: grid; gap: 1rem; grid-template-columns: minmax(17rem, 22rem) minmax(0, 1fr); }
.post-list { display: grid; gap: 0.35rem; max-height: calc(100vh - 2rem); overflow-y: auto; padding: 0.6rem; position: sticky; top: 1rem; }
.post-list-controls { background: color-mix(in srgb, var(--bg) 94%, transparent); border-bottom: 1px solid var(--border); display: grid; gap: 0.55rem; margin: -0.6rem -0.6rem 0; padding: 0.75rem; position: sticky; top: -0.6rem; z-index: 2; }
.post-list-controls label { gap: 0.25rem; }
.post-list-controls input, .post-list-controls select { font-size: 0.78rem; padding: 0.5rem 0.6rem; }
.post-count { justify-self: end; }
.post-list button { align-items: center; background: transparent; border: 0; border-radius: 0.65rem; color: inherit; display: grid; gap: 0.65rem; grid-template-columns: 5.4rem minmax(0, 1fr); padding: 0.55rem; text-align: left; }
.post-list button:hover, .post-list button.active { background: color-mix(in srgb, var(--accent) 12%, transparent); }
.post-list strong { font-weight: 650; overflow-wrap: anywhere; }
.post-list-copy { display: grid; gap: 0.3rem; min-width: 0; }
.post-list-copy strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.post-list-meta { align-items: center; display: flex; gap: 0.45rem; justify-content: space-between; min-width: 0; }
.post-list-meta > span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.post-thumbnail { border-radius: 0.4rem; height: 3.8rem; overflow: hidden; position: relative; }
.post-thumbnail img { height: 100%; object-fit: cover; width: 100%; }
.photo-count { align-items: center; background: rgba(0, 0, 0, 0.68); bottom: 0; color: white; display: flex; font-size: 0.65rem; padding: 0.15rem 0.25rem; position: absolute; right: 0; }
.post-thumbnail-empty { align-items: center; background: color-mix(in srgb, var(--border) 50%, transparent); border-radius: 0.4rem; display: flex; height: 3.8rem; justify-content: center; }
.post-syndications { display: flex; flex: 0 0 auto; gap: 0.25rem; }
.syndication-icon { align-items: center; border: 1px solid color-mix(in srgb, currentColor 45%, transparent); border-radius: 50%; box-sizing: border-box; color: white; display: inline-flex; font-family: Arial, sans-serif; font-size: 0.68rem; font-weight: 800; height: 1.15rem; justify-content: center; line-height: 1; width: 1.15rem; }
.syndication-icon.is-mastodon { background: #6364ff; }
.syndication-icon.is-facebook { background: #1877f2; font-size: 0.82rem; }
.syndication-icon:not(.is-published) { filter: grayscale(0.75); opacity: 0.55; }
.syndication-icon.is-failed, .syndication-icon.is-uncertain { box-shadow: 0 0 0 2px #e5484d; }
.editor-card { display: grid; gap: 2rem; padding: clamp(1rem, 3vw, 2rem); }
label { display: grid; font-size: 0.85rem; font-weight: 600; gap: 0.4rem; }
label small { color: var(--muted); font-size: 0.72rem; font-weight: 400; }
input, textarea, select { background: color-mix(in srgb, var(--bg) 90%, white 10%); border: 1px solid var(--border); border-radius: 0.5rem; box-sizing: border-box; color: inherit; font: inherit; padding: 0.7rem 0.8rem; width: 100%; }
.slug-input-row { display: grid; gap: 0.5rem; grid-template-columns: minmax(0, 1fr) auto auto; }
.slug-input-row button { white-space: nowrap; }
textarea { resize: vertical; }
.markdown-editor { font-family: 'Azeret Mono Variable', monospace; min-height: 22rem; }
button { background: var(--accent); border: 1px solid transparent; border-radius: 0.5rem; color: white; cursor: pointer; font: inherit; font-weight: 650; padding: 0.65rem 0.9rem; }
button:disabled { cursor: not-allowed; opacity: 0.5; }
.button-secondary { background: transparent; border-color: var(--accent); color: var(--accent); }
.button-quiet { background: transparent; color: var(--muted); }
.status-chip { border: 1px solid var(--border); border-radius: 999px; font-family: 'Azeret Mono Variable', monospace; font-size: 0.7rem; padding: 0.25rem 0.55rem; }
.autosave-status { color: var(--muted); flex: 1; font-family: 'Azeret Mono Variable', monospace; font-size: 0.7rem; }
.autosave-status--error { color: #e5484d; }
.status-row a, .editor-actions a { color: var(--accent); font-size: 0.8rem; }
.media-panel, .mastodon-panel { border-top: 1px solid var(--border); padding-top: 1.5rem; }
.revision-photo-thumb { width: 3rem; height: 3rem; object-fit: cover; vertical-align: middle; margin-right: .5rem; border-radius: .25rem; background: var(--surface); }
.section-heading { align-items: baseline; margin-bottom: 1rem; }
.section-heading h2 { font-size: 1.25rem; font-weight: 650; }
.post-preview-card { background: color-mix(in srgb, var(--bg) 92%, white 8%); border: 1px solid var(--border); border-radius: 0.75rem; display: grid; gap: 1rem; grid-template-columns: minmax(10rem, 0.75fr) minmax(0, 1.25fr); max-height: 24rem; overflow: auto; padding: 0.75rem; }
.post-preview-media { align-content: start; display: grid; gap: 0.35rem; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.post-preview-media img { aspect-ratio: 1; border-radius: 0.35rem; object-fit: cover; width: 100%; }
.post-preview-media .post-preview-hero { aspect-ratio: 16 / 9; grid-column: 1 / -1; }
.post-preview-copy { min-width: 0; }
.post-preview-copy h3 { font-size: clamp(1.25rem, 3vw, 2rem); font-weight: 700; line-height: 1.1; margin-bottom: 0.55rem; overflow-wrap: anywhere; }
.post-preview-meta { color: var(--muted); display: flex; flex-wrap: wrap; font-family: 'Azeret Mono Variable', monospace; font-size: 0.7rem; gap: 0.35rem 0.8rem; margin-bottom: 0.8rem; }
.preview-body { line-height: 1.65; }
.preview-body :deep(p), .preview-body :deep(ul), .preview-body :deep(ol), .preview-body :deep(blockquote) { margin: 1em 0; }
.preview-body :deep(h1), .preview-body :deep(h2), .preview-body :deep(h3) { font-weight: 650; margin: 1.4em 0 0.6em; }
.preview-body :deep(a) { color: var(--accent); }
.preview-body :deep(ul) { list-style: disc; padding-left: 1.5rem; }
.preview-body :deep(ol) { list-style: decimal; padding-left: 1.5rem; }
.empty-state { color: var(--muted); }
.media-grid { display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); margin-bottom: 1rem; }
.media-grid img { aspect-ratio: 1; border-radius: 0.5rem; object-fit: cover; width: 100%; }
.media-preview { background: transparent; border: 0; cursor: crosshair; padding: 0; position: relative; width: 100%; }
.media-preview img { display: block; }
.focal-marker { background: var(--accent); border: 2px solid white; border-radius: 50%; box-shadow: 0 0 0 1px black; height: 0.8rem; position: absolute; transform: translate(-50%, -50%); width: 0.8rem; }
.is-selected { background: var(--accent); color: white; }
.media-grid figure { border: 1px solid var(--border); border-radius: 0.65rem; padding: 0.65rem; }
.media-grid figure[draggable="true"] { cursor: grab; }
.media-grid figure.is-dragging { opacity: 0.5; }
.media-grid figcaption { display: grid; gap: 0.65rem; margin-top: 0.5rem; }
.media-grid figcaption > span { color: var(--muted); font-family: 'Azeret Mono Variable', monospace; font-size: 0.7rem; }
.media-order-actions { display: grid; gap: 0.4rem; grid-template-columns: 1fr 1fr; }
.media-order-actions button { font-size: 0.72rem; padding: 0.45rem; }
.photo-dropzone { align-items: center; border: 2px dashed var(--border); border-radius: 0.75rem; cursor: pointer; display: grid; justify-items: center; padding: 1.5rem; text-align: center; }
.photo-dropzone span, .upload-status { color: var(--muted); font-size: 0.75rem; }
.photo-dropzone input { max-width: 28rem; }
.upload-queue { display: grid; gap: 0.75rem; margin-top: 1rem; }
.upload-item { align-items: center; border: 1px solid var(--border); border-radius: 0.65rem; display: grid; gap: 0.75rem; grid-template-columns: 5rem minmax(0, 1fr) auto; padding: 0.75rem; }
.upload-item img { aspect-ratio: 1; border-radius: 0.4rem; object-fit: cover; width: 5rem; }
.upload-item progress { width: 100%; }
.upload-item-actions { display: grid; gap: 0.4rem; }
.message { background: color-mix(in srgb, var(--accent) 10%, transparent); border-radius: 0.5rem; padding: 0.75rem; }
.message--error { color: #e5484d; }
.media-dialog { background: var(--bg); border: 1px solid var(--border); border-radius: 1rem; color: inherit; max-height: calc(100dvh - 2rem); max-width: 34rem; padding: 0; width: calc(100% - 2rem); }
.media-dialog::backdrop { background: rgba(0, 0, 0, 0.68); backdrop-filter: blur(3px); }
.media-details-form { display: grid; gap: 1rem; padding: clamp(1rem, 4vw, 1.5rem); }
.media-details-form header { align-items: start; display: flex; justify-content: space-between; }
.media-details-form h2 { font-size: 1.4rem; font-weight: 650; }
.media-details-form > img { aspect-ratio: 16 / 9; border-radius: 0.65rem; object-fit: cover; width: 100%; }
.photo-technical { color: var(--muted); font-family: 'Azeret Mono Variable', monospace; font-size: 0.72rem; margin-top: -0.5rem; }
.photo-pipeline-status { align-items: center; display: flex; flex-wrap: wrap; gap: 0.75rem; justify-content: space-between; }
.photo-pipeline-status .photo-technical { margin: 0; }
.dialog-close { font-size: 1.6rem; line-height: 1; padding: 0.2rem 0.45rem; }
.date-time-editor { border: 1px solid var(--border); border-radius: 0.65rem; display: grid; gap: 0.75rem; margin: 0; min-width: 0; padding: 0.9rem; }
.date-time-editor legend { font-size: 0.85rem; font-weight: 650; padding: 0 0.3rem; }
.date-time-editor > small { color: var(--muted); font-size: 0.72rem; }
.date-time-inputs { display: grid; gap: 0.75rem; grid-template-columns: minmax(10rem, 1fr) minmax(12rem, 1fr); }
.time-editor { display: grid; font-size: 0.85rem; font-weight: 600; gap: 0.4rem; min-width: 0; }
.restricted-time-inputs { align-items: center; display: grid; gap: 0.35rem; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); }
.restricted-time-inputs label { min-width: 0; }
.restricted-time-inputs select, .date-time-inputs input { min-height: 2.75rem; }
.date-time-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.date-time-actions button { min-height: 2.75rem; }
.visually-hidden { clip: rect(0 0 0 0); clip-path: inset(50%); height: 1px; overflow: hidden; position: absolute; white-space: nowrap; width: 1px; }
@media (max-width: 48rem) {
  .admin-workspace { grid-template-columns: 1fr; }
  .post-list { max-height: 14rem; position: static; }
  .post-list-controls { top: -0.6rem; }
  .admin-toolbar, .status-row, .section-heading { align-items: flex-start; flex-direction: column; }
  .upload-item { align-items: stretch; grid-template-columns: 4rem minmax(0, 1fr); }
  .upload-item img { width: 4rem; }
  .upload-item-actions { grid-column: 1 / -1; grid-template-columns: repeat(2, 1fr); }
  .editor-actions { align-items: stretch; flex-direction: column; }
  .post-preview-card { grid-template-columns: 1fr; max-height: 32rem; }
  .slug-input-row { grid-template-columns: 1fr; }
  .date-time-inputs { grid-template-columns: 1fr; }
  .date-time-actions button { flex: 1 1 auto; }
}
</style>
