<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { AdminApiError, adminRequest, adminToken, jsonRequest } from '@/admin/api'
import type { PostMedia } from '@/posts/types'

type AdminPost = {
  bodyHtml: string
  bodyMarkdown: string
  contentWarning: string | null
  createdAt: string
  excerpt: string | null
  id: string
  media: PostMedia[]
  publishedAt: string | null
  slug: string
  status: 'draft' | 'published' | 'archived'
  title: string | null
  updatedAt: string
}

type Syndication = {
  attemptCount: number
  lastError: string | null
  remoteUrl: string | null
  state: 'pending' | 'published' | 'failed'
}

const tokenInput = ref('')
const authenticated = ref(false)
const posts = ref<AdminPost[]>([])
const selectedId = ref<string | null>(null)
const notice = ref('')
const error = ref('')
const busy = ref(false)
const previewHtml = ref('')
const previewBusy = ref(false)
const uploadFile = ref<File | null>(null)
const uploadAlt = ref('')
const syndication = ref<Syndication | null>(null)
const teaser = ref('')
let previewTimer: ReturnType<typeof setTimeout> | null = null

const form = reactive({
  bodyMarkdown: '',
  contentWarning: '',
  excerpt: '',
  slug: '',
  title: '',
})

const selected = computed(() => posts.value.find((post) => post.id === selectedId.value) ?? null)
const canPublish = computed(() => selected.value?.status === 'draft')
const canSyndicate = computed(() => selected.value?.status === 'published')
const syndicationButtonLabel = computed(() => {
  if (!syndication.value) return 'Publish link on Mastodon'
  if (syndication.value.state === 'published') return 'Update Mastodon teaser'
  if (syndication.value.state === 'pending') return 'Mastodon publication pending'
  return 'Retry required'
})

function message(value: unknown): string {
  if (value instanceof AdminApiError && value.status === 401) {
    authenticated.value = false
    adminToken.value = ''
    return 'That admin token was not accepted.'
  }
  return value instanceof Error ? value.message : 'The request could not be completed.'
}

function copyToForm(post: AdminPost) {
  selectedId.value = post.id
  form.title = post.title ?? ''
  form.slug = post.slug
  form.excerpt = post.excerpt ?? ''
  form.contentWarning = post.contentWarning ?? ''
  form.bodyMarkdown = post.bodyMarkdown
  previewHtml.value = post.bodyHtml
  teaser.value = post.excerpt ?? post.title ?? ''
  notice.value = ''
  error.value = ''
  syndication.value = null
  if (post.status === 'published') void loadSyndication(post.id)
}

function newDraft() {
  selectedId.value = null
  form.title = ''
  form.slug = ''
  form.excerpt = ''
  form.contentWarning = ''
  form.bodyMarkdown = ''
  previewHtml.value = ''
  teaser.value = ''
  syndication.value = null
  notice.value = 'New unsaved draft'
  error.value = ''
}

async function login() {
  error.value = ''
  busy.value = true
  adminToken.value = tokenInput.value.trim()
  try {
    await loadPosts()
    authenticated.value = true
    tokenInput.value = ''
    if (posts.value[0]) copyToForm(posts.value[0])
    else newDraft()
  } catch (loginError) {
    adminToken.value = ''
    error.value = message(loginError)
  } finally {
    busy.value = false
  }
}

function signOut() {
  adminToken.value = ''
  authenticated.value = false
  posts.value = []
  selectedId.value = null
  tokenInput.value = ''
  newDraft()
}

async function loadPosts() {
  const result = await adminRequest<{ items: AdminPost[] }>('/api/admin/posts')
  posts.value = result.items
}

function authorBody() {
  return {
    bodyMarkdown: form.bodyMarkdown,
    contentWarning: form.contentWarning.trim() || null,
    excerpt: form.excerpt.trim() || null,
    slug: form.slug.trim(),
    title: form.title.trim() || null,
  }
}

function replacePost(post: AdminPost) {
  const index = posts.value.findIndex((item) => item.id === post.id)
  if (index === -1) posts.value.unshift(post)
  else posts.value.splice(index, 1, post)
  copyToForm(post)
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

async function loadSyndication(postId: string) {
  try {
    syndication.value = await adminRequest<Syndication>(
      `/api/admin/posts/${postId}/syndications/mastodon`,
    )
  } catch (loadError) {
    if (!(loadError instanceof AdminApiError && loadError.status === 404)) error.value = message(loadError)
  }
}

async function syndicate() {
  const editing = syndication.value?.state === 'published'
  const confirmation = editing
    ? 'Update the existing public Mastodon teaser now?'
    : 'Create the public Mastodon link post now?'
  if (!selectedId.value || !window.confirm(confirmation)) return
  const requestedTeaser = teaser.value
  const saved = await save()
  if (!saved) return
  teaser.value = requestedTeaser
  error.value = ''
  busy.value = true
  try {
    syndication.value = await adminRequest<Syndication>(
      `/api/admin/posts/${saved.id}/syndications/mastodon`,
      jsonRequest(editing ? 'PATCH' : 'POST', { teaser: requestedTeaser }),
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

function chooseFile(event: Event) {
  uploadFile.value = (event.target as HTMLInputElement).files?.[0] ?? null
}

async function uploadMedia() {
  if (!selectedId.value || !uploadFile.value) return
  error.value = ''
  busy.value = true
  const body = new FormData()
  body.set('postId', selectedId.value)
  body.set('altText', uploadAlt.value)
  body.set('file', uploadFile.value)
  try {
    const uploaded = await adminRequest<PostMedia>('/api/admin/media', { body, method: 'POST' })
    const current = selected.value
    if (current) replacePost({ ...current, media: [...current.media, uploaded] })
    uploadFile.value = null
    uploadAlt.value = ''
    notice.value = 'Image uploaded.'
  } catch (uploadError) {
    error.value = message(uploadError)
  } finally {
    busy.value = false
  }
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

onBeforeUnmount(() => {
  if (previewTimer) clearTimeout(previewTimer)
  adminToken.value = ''
})
</script>

<template>
  <main class="admin-page">
    <section v-if="!authenticated" class="login-card">
      <p class="eyebrow">Private authoring</p>
      <h1>Post editor</h1>
      <p>The admin token stays in memory and is cleared when this page closes or reloads.</p>
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
          <button class="button-secondary" type="button" @click="newDraft">New draft</button>
          <button class="button-quiet" type="button" @click="signOut">Lock</button>
        </div>
      </header>

      <div class="admin-workspace">
        <aside class="post-list" aria-label="Posts">
          <button
            v-for="post in posts"
            :key="post.id"
            :class="{ active: post.id === selectedId }"
            type="button"
            @click="copyToForm(post)"
          >
            <strong>{{ post.title || post.slug }}</strong>
            <span>{{ post.status }} · {{ post.slug }}</span>
          </button>
          <p v-if="!posts.length">No saved posts yet.</p>
        </aside>

        <section class="editor-card">
          <form class="editor-form" @submit.prevent="save">
            <div class="status-row">
              <span class="status-chip">{{ selected?.status || 'unsaved' }}</span>
              <a v-if="selected?.status === 'published'" :href="`/posts/${selected.slug}`" target="_blank">View post ↗</a>
            </div>
            <label>Title <input v-model="form.title" maxlength="200"></label>
            <label>Slug <input v-model="form.slug" maxlength="100" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required></label>
            <label>Excerpt <textarea v-model="form.excerpt" maxlength="5000" rows="2"></textarea></label>
            <label>Content note <input v-model="form.contentWarning" maxlength="500"></label>
            <label>Body (Markdown) <textarea v-model="form.bodyMarkdown" class="markdown-editor" maxlength="100000" required></textarea></label>
            <div class="editor-actions">
              <button :disabled="busy" type="submit">{{ busy ? 'Working…' : selectedId ? 'Save changes' : 'Create draft' }}</button>
              <button v-if="canPublish" class="button-secondary" :disabled="busy" type="button" @click="publish">Publish locally</button>
              <button v-if="selected && selected.status !== 'archived'" class="button-quiet" :disabled="busy" type="button" @click="archive">Archive</button>
            </div>
          </form>

          <section class="preview" aria-labelledby="preview-title">
            <div class="section-heading"><h2 id="preview-title">Preview</h2><span v-if="previewBusy">Updating…</span></div>
            <div v-if="previewHtml" class="preview-body" v-html="previewHtml"></div>
            <p v-else class="empty-state">Write some Markdown to preview it.</p>
          </section>

          <section v-if="selectedId" class="media-panel" aria-labelledby="media-title">
            <div class="section-heading"><h2 id="media-title">Images</h2><span>JPEG, PNG, WebP, or AVIF · 25 MB max</span></div>
            <div v-if="selected?.media.length" class="media-grid">
              <figure v-for="item in selected.media" :key="item.id">
                <img :alt="item.altText" :src="item.urls.thumbnail">
                <figcaption>{{ item.altText }}</figcaption>
              </figure>
            </div>
            <form class="upload-form" @submit.prevent="uploadMedia">
              <label>Image <input accept="image/jpeg,image/png,image/webp,image/avif" type="file" @change="chooseFile"></label>
              <label>Alt text <input v-model="uploadAlt" maxlength="2000" required></label>
              <button :disabled="busy || !uploadFile || !uploadAlt.trim()" type="submit">Upload image</button>
            </form>
          </section>

          <section v-if="canSyndicate" class="mastodon-panel" aria-labelledby="syndication-title">
            <div class="section-heading"><h2 id="syndication-title">Mastodon</h2><span>Explicit syndication only</span></div>
            <label>Teaser <textarea v-model="teaser" maxlength="5000" rows="3"></textarea></label>
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

          <p v-if="notice" class="message" role="status">{{ notice }}</p>
          <p v-if="error" class="message message--error" role="alert">{{ error }}</p>
        </section>
      </div>
    </template>
  </main>
</template>

<style scoped>
.admin-page { box-sizing: border-box; margin: 1.5rem auto 4rem; max-width: 86rem; padding: 0 1.25rem; width: 100%; }
.login-card, .editor-card, .post-list { background: color-mix(in srgb, var(--bg) 82%, transparent); border: 1px solid var(--border); border-radius: 1rem; }
.login-card { display: grid; gap: 1rem; margin: 5rem auto; max-width: 30rem; padding: clamp(1.5rem, 5vw, 3rem); }
.login-card h1, .admin-toolbar h1 { font-size: clamp(2rem, 5vw, 3.2rem); font-weight: 700; line-height: 1; }
.login-card form, .editor-form, .upload-form, .mastodon-panel { display: grid; gap: 1rem; }
.eyebrow, .section-heading span, .post-list span, .syndication-state { color: var(--muted); font-family: 'Azeret Mono Variable', monospace; font-size: 0.72rem; }
.admin-toolbar, .toolbar-actions, .editor-actions, .status-row, .section-heading { align-items: center; display: flex; gap: 0.75rem; justify-content: space-between; }
.admin-toolbar { margin-bottom: 1.25rem; }
.admin-workspace { align-items: start; display: grid; gap: 1rem; grid-template-columns: minmax(13rem, 18rem) minmax(0, 1fr); }
.post-list { display: grid; gap: 0.35rem; max-height: 75vh; overflow-y: auto; padding: 0.6rem; position: sticky; top: 1rem; }
.post-list button { background: transparent; border: 0; border-radius: 0.65rem; color: inherit; display: grid; gap: 0.3rem; padding: 0.8rem; text-align: left; }
.post-list button:hover, .post-list button.active { background: color-mix(in srgb, var(--accent) 12%, transparent); }
.post-list strong { font-weight: 650; overflow-wrap: anywhere; }
.editor-card { display: grid; gap: 2rem; padding: clamp(1rem, 3vw, 2rem); }
label { display: grid; font-size: 0.85rem; font-weight: 600; gap: 0.4rem; }
input, textarea { background: color-mix(in srgb, var(--bg) 90%, white 10%); border: 1px solid var(--border); border-radius: 0.5rem; box-sizing: border-box; color: inherit; font: inherit; padding: 0.7rem 0.8rem; width: 100%; }
textarea { resize: vertical; }
.markdown-editor { font-family: 'Azeret Mono Variable', monospace; min-height: 22rem; }
button { background: var(--accent); border: 1px solid transparent; border-radius: 0.5rem; color: white; cursor: pointer; font: inherit; font-weight: 650; padding: 0.65rem 0.9rem; }
button:disabled { cursor: not-allowed; opacity: 0.5; }
.button-secondary { background: transparent; border-color: var(--accent); color: var(--accent); }
.button-quiet { background: transparent; color: var(--muted); }
.status-chip { border: 1px solid var(--border); border-radius: 999px; font-family: 'Azeret Mono Variable', monospace; font-size: 0.7rem; padding: 0.25rem 0.55rem; }
.status-row a, .editor-actions a { color: var(--accent); font-size: 0.8rem; }
.preview, .media-panel, .mastodon-panel { border-top: 1px solid var(--border); padding-top: 1.5rem; }
.section-heading { align-items: baseline; margin-bottom: 1rem; }
.section-heading h2 { font-size: 1.25rem; font-weight: 650; }
.preview-body { line-height: 1.65; }
.preview-body :deep(p), .preview-body :deep(ul), .preview-body :deep(ol), .preview-body :deep(blockquote) { margin: 1em 0; }
.preview-body :deep(h1), .preview-body :deep(h2), .preview-body :deep(h3) { font-weight: 650; margin: 1.4em 0 0.6em; }
.preview-body :deep(a) { color: var(--accent); }
.preview-body :deep(ul) { list-style: disc; padding-left: 1.5rem; }
.preview-body :deep(ol) { list-style: decimal; padding-left: 1.5rem; }
.empty-state { color: var(--muted); }
.media-grid { display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr)); margin-bottom: 1rem; }
.media-grid img { aspect-ratio: 1; border-radius: 0.5rem; object-fit: cover; width: 100%; }
.media-grid figcaption { color: var(--muted); font-size: 0.75rem; margin-top: 0.35rem; }
.upload-form { grid-template-columns: 1fr 2fr auto; }
.upload-form button { align-self: end; }
.message { background: color-mix(in srgb, var(--accent) 10%, transparent); border-radius: 0.5rem; padding: 0.75rem; }
.message--error { color: #e5484d; }
@media (max-width: 48rem) {
  .admin-workspace { grid-template-columns: 1fr; }
  .post-list { max-height: 14rem; position: static; }
  .admin-toolbar, .status-row, .section-heading { align-items: flex-start; flex-direction: column; }
  .upload-form { grid-template-columns: 1fr; }
  .editor-actions { align-items: stretch; flex-direction: column; }
}
</style>
