<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { AdminApiError, adminRequest, createAdminSession, deleteAdminSession, jsonRequest } from '@/admin/api'
import { formatEditorialDateTime } from '@/posts/editorial-date-time'
import type { PostMedia } from '@/posts/types'

type AdminPost = {
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
  status: 'draft' | 'published' | 'archived'
  updatedAt: string
  revision?: number
}
type RevisionPhoto = { id: string; title: string | null; altText: string; caption: string | null; displayOrder: number; focalX: number | null; focalY: number | null; width: number | null; height: number | null; isHero: boolean }
type RevisionSyndication = { publicationRevision: number; destination?: string; state: string; remoteUrl: string | null; remoteStatusId: string | null; updatedAt: string }
type PublishedRevision = { revision: number; slug: string; title: string | null; createdAt: string; media: RevisionPhoto[] }
function formatHistoryDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

type Syndication = {
  attemptCount: number
  lastError: string | null
  remoteUrl: string | null
  state: 'pending' | 'published' | 'failed' | 'uncertain'
}

const tokenInput = ref('')
const authenticated = ref(false)
const checkingSession = ref(true)
const posts = ref<AdminPost[]>([])
const postQuery = ref('')
const postStatus = ref<'all' | AdminPost['status']>('all')
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
const allowedMinutes = ['00', '15', '20', '30', '40', '45']
const yearOptions = Array.from(
  { length: new Date().getFullYear() + 10 - 1900 + 1 },
  (_, index) => new Date().getFullYear() + 10 - index,
)
const monthOptions = [
  ['01', 'January'], ['02', 'February'], ['03', 'March'], ['04', 'April'],
  ['05', 'May'], ['06', 'June'], ['07', 'July'], ['08', 'August'],
  ['09', 'September'], ['10', 'October'], ['11', 'November'], ['12', 'December'],
]
const hourOptions = Array.from({ length: 24 }, (_, hour) => hour.toString().padStart(2, '0'))

const form = reactive({
  title: '',
  slug: '',
  location: '',
  date: '',
  time: '',
  bodyMarkdown: '',
})

const selected = computed(() => posts.value.find((post) => post.id === selectedId.value) ?? null)
const editingMedia = computed(() => selected.value?.media.find((item) => item.id === editingMediaId.value) ?? null)
const filteredPosts = computed(() => {
  const query = postQuery.value.trim().toLocaleLowerCase()
  return posts.value.filter((post) => {
    if (postStatus.value !== 'all' && post.status !== postStatus.value) return false
    if (!query) return true
    return [post.title, post.slug, post.location, post.date?.toString(), post.time, post.bodyMarkdown]
      .some((value) => value?.toLocaleLowerCase().includes(query))
  })
})
const canPublish = computed(() => selected.value?.status === 'draft')
const canSyndicate = computed(() => selected.value?.status === 'published')
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

function postThumbnails(post: AdminPost): PostMedia[] {
  const hero = post.media.find((item) => item.id === post.heroMediaId)
  return hero ? [hero, ...post.media.filter((item) => item.id !== hero.id)].slice(0, 3) : post.media.slice(0, 3)
}

function postLabel(post: AdminPost): string {
  return post.title || post.location || post.slug
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
type DatePart = 'year' | 'month' | 'day'

function datePart(date: string, part: DatePart): string {
  const [year = '', month = '', day = ''] = date.split('-')
  return { year, month, day }[part]
}

function timePart(time: string, part: 'hour' | 'minute'): string {
  const [hour = '', minute = ''] = time.split(':')
  return part === 'hour' ? hour : minute
}

function daysFor(date: string): string[] {
  const year = Number(datePart(date, 'year')) || new Date().getFullYear()
  const month = Number(datePart(date, 'month')) || 1
  const count = new Date(year, month, 0).getDate()
  return Array.from({ length: count }, (_, index) => (index + 1).toString().padStart(2, '0'))
}

function updateDatePart(draft: DateTimeDraft, part: DatePart, value: string) {
  if (!value) {
    draft.date = ''
    return
  }
  let year = datePart(draft.date, 'year') || new Date().getFullYear().toString()
  let month = datePart(draft.date, 'month') || '01'
  let day = datePart(draft.date, 'day') || '01'
  if (part === 'year') year = value
  if (part === 'month') month = value
  if (part === 'day') day = value
  const maximumDay = new Date(Number(year), Number(month), 0).getDate()
  day = Math.min(Number(day), maximumDay).toString().padStart(2, '0')
  draft.date = `${year}-${month}-${day}`
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

function openMediaDetails(item: PostMedia) {
  editingMediaId.value = item.id
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
  selectedId.value = post.id
  form.location = post.location ?? ''
  form.title = post.title ?? ''
  form.slug = post.slug
  form.date = dateInputValue(post.date)
  form.time = post.time ?? ''
  form.bodyMarkdown = post.bodyMarkdown
  previewHtml.value = post.bodyHtml
  notice.value = ''
  error.value = ''
  syndication.value = null
  facebookSyndication.value = null
  facebookCandidates.value = []
  revisionHistory.value = []
  revisionSyndications.value = []
  post.media.forEach((item) => {
    mediaDrafts[item.id] = { altText: item.altText, caption: item.caption ?? '', title: item.title ?? '', location: item.location ?? '', date: dateInputValue(item.date), time: item.time ?? '' }
  })
  if (post.status === 'published') { void loadSyndication(post.id); void loadFacebookSyndication(post.id); void loadHistory(post.id) }
}

async function loadFacebookSyndication(postId: string) {
  try { facebookSyndication.value = await adminRequest<Syndication>(`/api/admin/posts/${postId}/syndications/facebook`) }
  catch (loadError) { if (!(loadError instanceof AdminApiError && loadError.status === 404)) error.value = message(loadError) }
}

async function syndicateFacebook() {
  if (!selectedId.value || !window.confirm('Create the public Facebook Page link post now?')) return
  const saved = await save(); if (!saved) return
  try { facebookSyndication.value = await adminRequest<Syndication>(`/api/admin/posts/${saved.id}/syndications/facebook`, jsonRequest('POST')); notice.value = 'Facebook publication queued.' }
  catch (publishError) { error.value = message(publishError) }
}

async function retryFacebookSyndication() {
  if (!selectedId.value) return
  try { facebookSyndication.value = await adminRequest<Syndication>(`/api/admin/posts/${selectedId.value}/syndications/facebook/retry`, jsonRequest('POST')); notice.value = 'Facebook publication queued again.' }
  catch (retryError) { error.value = message(retryError) }
}

async function reconcileFacebookSyndication() {
  if (!selectedId.value) return
  try {
    const result = await adminRequest<{ syndication: Syndication; candidates: Array<{ id: string; url: string }> }>(`/api/admin/posts/${selectedId.value}/syndications/facebook/reconcile`, jsonRequest('POST'))
    facebookSyndication.value = result.syndication
    facebookCandidates.value = result.candidates
    notice.value = result.candidates.length === 1 ? 'Facebook publication attached.' : 'No single Facebook match was found; review candidates before resolving.'
  } catch (reconcileError) { error.value = message(reconcileError) }
}

async function resolveFacebookCandidate(candidate: { id: string; url: string }) {
  if (!selectedId.value || !window.confirm('Attach this Facebook post to the local publication?')) return
  try { facebookSyndication.value = await adminRequest<Syndication>(`/api/admin/posts/${selectedId.value}/syndications/facebook/resolve`, jsonRequest('POST', candidate)); facebookCandidates.value = []; notice.value = 'Facebook publication resolved.' }
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

function authorBody() {
  return {
    location: form.location.trim() || null,
    title: form.title.trim() || null,
    slug: form.slug.trim(),
    date: storedDate(form.date),
    time: form.time || null,
    bodyMarkdown: form.bodyMarkdown,
  }
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

function replacePost(post: AdminPost) {
  const index = posts.value.findIndex((item) => item.id === post.id)
  if (index === -1) posts.value.unshift(post)
  else posts.value.splice(index, 1, post)
  copyToForm(post)
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
  if (!draft?.altText.trim()) return
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

async function save(): Promise<AdminPost | null> {
  error.value = ''
  notice.value = ''
  busy.value = true
  try {
    const post = selectedId.value
      ? await adminRequest<AdminPost>(`/api/admin/posts/${selectedId.value}`, jsonRequest('PATCH', authorBody()))
      : await adminRequest<AdminPost>('/api/admin/posts', jsonRequest('POST', authorBody()))
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
    ['queued', 'failed'].includes(item.status) && item.altText.trim())
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

onMounted(() => { void restoreSession() })

onBeforeUnmount(() => {
  if (previewTimer) clearTimeout(previewTimer)
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
            <span v-if="post.media.length" class="post-thumbnails" aria-hidden="true">
              <img
                v-for="photo in postThumbnails(post)"
                :key="photo.id"
                alt=""
                decoding="async"
                loading="lazy"
                :src="photo.urls.thumbnail"
              >
              <span v-if="post.media.length > 3" class="photo-count">+{{ post.media.length - 3 }}</span>
            </span>
            <span v-else class="post-thumbnail-empty" aria-hidden="true">No photos</span>
            <span class="post-list-copy">
              <strong>{{ postLabel(post) }}</strong>
              <span>{{ postDate(post.date) }} · {{ post.status }}</span>
            </span>
          </button>
          <p v-if="!posts.length">No saved posts yet.</p>
          <p v-else-if="!filteredPosts.length">No posts match these filters.</p>
        </aside>

        <section class="editor-card">
          <section v-if="selectedId" class="media-panel media-panel--primary" aria-labelledby="media-title">
            <div class="section-heading"><h2 id="media-title">Start with photos</h2><span>JPEG, PNG, WebP, or AVIF · 100 MB per photo</span></div>
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
                  <img :alt="item.altText" :src="item.urls.thumbnail">
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
              <span>Select multiple JPEG, PNG, WebP, or AVIF files.</span>
              <input accept="image/jpeg,image/png,image/webp,image/avif" multiple type="file" @change="chooseFiles">
            </label>
            <div v-if="uploadQueue.length" class="upload-queue">
              <article v-for="item in uploadQueue" :key="item.id" class="upload-item">
                <img alt="" :src="item.previewUrl">
                <div>
                  <strong>{{ item.file.name }}</strong>
                  <label>Alt text <input v-model="item.altText" maxlength="2000" required></label>
                  <progress v-if="item.status === 'uploading'" max="100" :value="item.progress">{{ item.progress }}%</progress>
                  <p v-if="item.error" class="message message--error">{{ item.error }}</p>
                  <span class="upload-status">{{ item.status }}<template v-if="item.status === 'uploading'"> · {{ item.progress }}%</template></span>
                </div>
                <div class="upload-item-actions">
                  <button v-if="item.status === 'failed' || item.status === 'cancelled'" class="button-secondary" :disabled="!item.altText.trim()" type="button" @click="retryUpload(item)">Retry</button>
                  <button v-if="item.status === 'uploading' || item.status === 'queued'" class="button-quiet" type="button" @click="cancelUpload(item)">Cancel</button>
                  <button v-else class="button-quiet" type="button" @click="removeUpload(item)">Remove</button>
                </div>
              </article>
              <button :disabled="uploadRunning || !uploadQueue.some((item) => ['queued', 'failed'].includes(item.status) && item.altText.trim())" type="button" @click="uploadQueued">
                {{ uploadRunning ? 'Uploading…' : 'Upload ready photos' }}
              </button>
            </div>
          </section>

          <form class="editor-form" @submit.prevent="save">
            <div class="status-row">
              <span class="status-chip">{{ selected?.status || 'unsaved' }}</span>
              <a v-if="selected?.status === 'published'" :href="`/photos/${encodeURIComponent(selected.slug)}${selected.revision ? `?rev=${selected.revision}` : ''}`" target="_blank">View post ↗</a>
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
              </span>
              <small>URL-safe text: lowercase letters, numbers, and single hyphens. Changing it keeps the old URL working.</small>
            </label>
            <label>Location <input v-model="form.location" maxlength="500"></label>
            <div class="date-time-selectors">
              <label>Year
                <select :value="datePart(form.date, 'year')" @change="updateDatePart(form, 'year', ($event.target as HTMLSelectElement).value)">
                  <option value="">—</option>
                  <option v-for="year in yearOptions" :key="year" :value="year">{{ year }}</option>
                </select>
              </label>
              <label>Month
                <select :value="datePart(form.date, 'month')" @change="updateDatePart(form, 'month', ($event.target as HTMLSelectElement).value)">
                  <option value="">—</option>
                  <option v-for="([value, label]) in monthOptions" :key="value" :value="value">{{ value }} — {{ label }}</option>
                </select>
              </label>
              <label>Day
                <select :value="datePart(form.date, 'day')" @change="updateDatePart(form, 'day', ($event.target as HTMLSelectElement).value)">
                  <option value="">—</option>
                  <option v-for="day in daysFor(form.date)" :key="day" :value="day">{{ day }}</option>
                </select>
              </label>
              <label>Hour
                <select :value="timePart(form.time, 'hour')" @change="updateTimePart(form, 'hour', ($event.target as HTMLSelectElement).value)">
                  <option value="">—</option>
                  <option v-for="hour in hourOptions" :key="hour" :value="hour">{{ hour }}</option>
                </select>
              </label>
              <label>Minute
                <select :value="timePart(form.time, 'minute')" @change="updateTimePart(form, 'minute', ($event.target as HTMLSelectElement).value)">
                  <option value="">—</option>
                  <option v-for="minute in allowedMinutes" :key="minute" :value="minute">{{ minute }}</option>
                </select>
              </label>
            </div>
            <label>Body (Markdown) <textarea v-model="form.bodyMarkdown" class="markdown-editor" maxlength="100000" required></textarea></label>
            <div class="editor-actions">
              <button :disabled="busy" type="submit">{{ busy ? 'Working…' : selectedId ? 'Save changes' : 'Create draft' }}</button>
              <button v-if="canPublish" class="button-secondary" :disabled="busy" type="button" @click="publish">Publish locally</button>
              <button v-if="selected?.status === 'published'" class="button-secondary" :disabled="busy" type="button" @click="unpublish">Unpublish</button>
              <button v-if="selected && selected.status !== 'archived'" class="button-quiet" :disabled="busy" type="button" @click="archive">Archive</button>
            </div>
          </form>

          <section class="preview" aria-labelledby="preview-title">
            <div class="section-heading"><h2 id="preview-title">Preview</h2><span v-if="previewBusy">Updating…</span></div>
            <div v-if="previewHtml" class="preview-body" v-html="previewHtml"></div>
            <p v-else class="empty-state">Write some Markdown to preview it.</p>
          </section>

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
          <img :alt="editingMedia.altText" :src="editingMedia.urls.thumbnail">
          <p class="photo-technical">{{ editingMedia.width }} × {{ editingMedia.height }} · {{ editingMedia.processingState }}</p>
          <label>Title <input v-model="mediaDrafts[editingMedia.id].title" maxlength="200"></label>
          <label>Alt text <textarea v-model="mediaDrafts[editingMedia.id].altText" maxlength="2000" rows="3" required></textarea></label>
          <label>Caption <textarea v-model="mediaDrafts[editingMedia.id].caption" maxlength="5000" rows="3"></textarea></label>
          <label>Location <input v-model="mediaDrafts[editingMedia.id].location" maxlength="500"></label>
          <div class="date-time-selectors">
            <label>Year
              <select :value="datePart(mediaDrafts[editingMedia.id].date, 'year')" @change="updateDatePart(mediaDrafts[editingMedia.id], 'year', ($event.target as HTMLSelectElement).value)">
                <option value="">—</option>
                <option v-for="year in yearOptions" :key="year" :value="year">{{ year }}</option>
              </select>
            </label>
            <label>Month
              <select :value="datePart(mediaDrafts[editingMedia.id].date, 'month')" @change="updateDatePart(mediaDrafts[editingMedia.id], 'month', ($event.target as HTMLSelectElement).value)">
                <option value="">—</option>
                <option v-for="([value, label]) in monthOptions" :key="value" :value="value">{{ value }} — {{ label }}</option>
              </select>
            </label>
            <label>Day
              <select :value="datePart(mediaDrafts[editingMedia.id].date, 'day')" @change="updateDatePart(mediaDrafts[editingMedia.id], 'day', ($event.target as HTMLSelectElement).value)">
                <option value="">—</option>
                <option v-for="day in daysFor(mediaDrafts[editingMedia.id].date)" :key="day" :value="day">{{ day }}</option>
              </select>
            </label>
            <label>Hour
              <select :value="timePart(mediaDrafts[editingMedia.id].time, 'hour')" @change="updateTimePart(mediaDrafts[editingMedia.id], 'hour', ($event.target as HTMLSelectElement).value)">
                <option value="">—</option>
                <option v-for="hour in hourOptions" :key="hour" :value="hour">{{ hour }}</option>
              </select>
            </label>
            <label>Minute
              <select :value="timePart(mediaDrafts[editingMedia.id].time, 'minute')" @change="updateTimePart(mediaDrafts[editingMedia.id], 'minute', ($event.target as HTMLSelectElement).value)">
                <option value="">—</option>
                <option v-for="minute in allowedMinutes" :key="minute" :value="minute">{{ minute }}</option>
              </select>
            </label>
          </div>
          <div class="editor-actions">
            <button :disabled="mediaSavingId === editingMedia.id || !mediaDrafts[editingMedia.id].altText.trim()" type="submit">
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
.eyebrow, .section-heading span, .post-list-copy > span, .post-count, .post-list-controls label > span, .post-thumbnail-empty, .syndication-state { color: var(--muted); font-family: 'Azeret Mono Variable', monospace; font-size: 0.72rem; }
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
.post-thumbnails { display: grid; grid-template-columns: repeat(3, 1fr); height: 3.4rem; overflow: hidden; position: relative; }
.post-thumbnails img { height: 100%; min-width: 0; object-fit: cover; width: 100%; }
.post-thumbnails img:only-child { grid-column: 1 / -1; }
.photo-count { align-items: center; background: rgba(0, 0, 0, 0.68); bottom: 0; color: white; display: flex; font-size: 0.65rem; padding: 0.15rem 0.25rem; position: absolute; right: 0; }
.post-thumbnail-empty { align-items: center; background: color-mix(in srgb, var(--border) 50%, transparent); display: flex; height: 3.4rem; justify-content: center; }
.editor-card { display: grid; gap: 2rem; padding: clamp(1rem, 3vw, 2rem); }
label { display: grid; font-size: 0.85rem; font-weight: 600; gap: 0.4rem; }
label small { color: var(--muted); font-size: 0.72rem; font-weight: 400; }
input, textarea, select { background: color-mix(in srgb, var(--bg) 90%, white 10%); border: 1px solid var(--border); border-radius: 0.5rem; box-sizing: border-box; color: inherit; font: inherit; padding: 0.7rem 0.8rem; width: 100%; }
.slug-input-row { display: grid; gap: 0.5rem; grid-template-columns: minmax(0, 1fr) auto; }
.slug-input-row button { white-space: nowrap; }
textarea { resize: vertical; }
.markdown-editor { font-family: 'Azeret Mono Variable', monospace; min-height: 22rem; }
button { background: var(--accent); border: 1px solid transparent; border-radius: 0.5rem; color: white; cursor: pointer; font: inherit; font-weight: 650; padding: 0.65rem 0.9rem; }
button:disabled { cursor: not-allowed; opacity: 0.5; }
.button-secondary { background: transparent; border-color: var(--accent); color: var(--accent); }
.button-quiet { background: transparent; color: var(--muted); }
.status-chip { border: 1px solid var(--border); border-radius: 999px; font-family: 'Azeret Mono Variable', monospace; font-size: 0.7rem; padding: 0.25rem 0.55rem; }
.status-row a, .editor-actions a { color: var(--accent); font-size: 0.8rem; }
.preview, .media-panel, .mastodon-panel { border-top: 1px solid var(--border); padding-top: 1.5rem; }
.revision-photo-thumb { width: 3rem; height: 3rem; object-fit: cover; vertical-align: middle; margin-right: .5rem; border-radius: .25rem; background: var(--surface); }
.media-panel--primary { border-top: 0; padding-top: 0; }
.section-heading { align-items: baseline; margin-bottom: 1rem; }
.section-heading h2 { font-size: 1.25rem; font-weight: 650; }
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
.dialog-close { font-size: 1.6rem; line-height: 1; padding: 0.2rem 0.45rem; }
.date-time-selectors { display: grid; gap: 0.5rem; grid-template-columns: 1.05fr 1.6fr 0.8fr 0.8fr 0.8fr; }
.date-time-selectors label { min-width: 0; }
.date-time-selectors select { padding-left: 0.55rem; padding-right: 0.4rem; }
@media (max-width: 48rem) {
  .admin-workspace { grid-template-columns: 1fr; }
  .post-list { max-height: 14rem; position: static; }
  .post-list-controls { top: -0.6rem; }
  .admin-toolbar, .status-row, .section-heading { align-items: flex-start; flex-direction: column; }
  .upload-item { align-items: stretch; grid-template-columns: 4rem minmax(0, 1fr); }
  .upload-item img { width: 4rem; }
  .upload-item-actions { grid-column: 1 / -1; grid-template-columns: repeat(2, 1fr); }
  .editor-actions { align-items: stretch; flex-direction: column; }
  .slug-input-row { grid-template-columns: 1fr; }
  .date-time-selectors { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
