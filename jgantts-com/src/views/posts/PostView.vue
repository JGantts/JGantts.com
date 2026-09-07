<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import QRCode from 'qrcode'
import { formatEditorialDateTime, machineEditorialDateTime } from '@/posts/editorial-date-time'
import { canonicalPostPath, postPath } from '@/posts/post-url'
import type {
  CanonicalPost,
  MastodonCommentNode,
  MastodonCommentsResponse,
} from '@/posts/types'
import MastodonComment from './MastodonComment.vue'

const props = defineProps<{ slug: string }>()
const router = useRouter()
const post = ref<CanonicalPost | null>(null)
const loading = ref(true)
const error = ref('')
const comments = ref<MastodonCommentsResponse | null>(null)
const commentTree = ref<MastodonCommentNode[]>([])
const commentsLoading = ref(false)
const qrCodeUrl = ref('')
const copyStatus = ref('')
const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' })

function currentShareUrl(value: CanonicalPost) {
  return new URL(postPath(value), window.location.origin).toString()
}

function shareTitle(value: CanonicalPost) {
  return value.title || value.location || 'Post by Jacob Gantt'
}

function socialShareUrl(network: 'facebook' | 'x' | 'linkedin', value: CanonicalPost) {
  const url = encodeURIComponent(currentShareUrl(value))
  const title = encodeURIComponent(shareTitle(value))
  if (network === 'facebook') return `https://www.facebook.com/sharer/sharer.php?u=${url}`
  if (network === 'linkedin') return `https://www.linkedin.com/sharing/share-offsite/?url=${url}`
  return `https://twitter.com/intent/tweet?url=${url}&text=${title}`
}

function emailShareUrl(value: CanonicalPost) {
  const subject = encodeURIComponent(shareTitle(value))
  const body = encodeURIComponent(`I thought you might enjoy this:\n\n${currentShareUrl(value)}`)
  return `mailto:?subject=${subject}&body=${body}`
}

async function prepareQrCode(value: CanonicalPost) {
  try {
    qrCodeUrl.value = await QRCode.toDataURL(currentShareUrl(value), {
      errorCorrectionLevel: 'M', margin: 2, width: 512,
    })
  } catch {
    qrCodeUrl.value = ''
  }
}

async function copyShareLink(value: CanonicalPost) {
  try {
    await navigator.clipboard.writeText(currentShareUrl(value))
    copyStatus.value = 'Link copied!'
  } catch {
    copyStatus.value = 'Could not copy the link.'
  }
  window.setTimeout(() => { copyStatus.value = '' }, 2500)
}

function initialPost(): CanonicalPost | null {
  const element = document.querySelector<HTMLScriptElement>('#__POST_DATA__')
  if (!element?.textContent) return null
  try {
    const candidate = JSON.parse(element.textContent) as CanonicalPost
    return candidate.slug === props.slug ? candidate : null
  } catch {
    return null
  }
}

function updateDocumentMeta(value: CanonicalPost) {
  const title = value.title || value.location || 'Post by Jacob Gantt'
  const firstLine = (text: string | null) => text?.split(/\r?\n/, 1)[0]?.trim() || ''
  const description = [
    firstLine(value.title),
    firstLine(value.bodyMarkdown),
    firstLine(value.location),
    formatEditorialDateTime(value.date, value.time) || '',
  ].filter(Boolean).join('\n') || 'A post from Jacob Gantt on JGantts.com.'
  const image = (value.media.find((item) => item.id === value.heroMediaId) ?? value.media[0])?.urls.large
  const canonicalUrl = new URL(canonicalPostPath(value), window.location.origin).toString()
  const shareUrl = new URL(postPath(value), window.location.origin).toString()
  const setMeta = (attribute: 'name' | 'property', key: string, content: string) => {
    let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
    if (!element) {
      element = document.createElement('meta')
      element.setAttribute(attribute, key)
      document.head.appendChild(element)
    }
    element.content = content
  }
  document.title = `${title} | JGantts`
  setMeta('name', 'description', description)
  setMeta('property', 'og:title', title)
  setMeta('property', 'og:description', description)
  setMeta('property', 'og:type', 'article')
  setMeta('property', 'og:url', shareUrl)
  setMeta('property', 'og:image', new URL(image || '/social-media.png', window.location.origin).toString())
  setMeta('property', 'article:published_time', value.publishedAt)
  setMeta('property', 'article:modified_time', value.updatedAt)
  setMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary')
  setMeta('name', 'twitter:title', title)
  setMeta('name', 'twitter:description', description)
  setMeta('name', 'twitter:image', new URL(image || '/social-media.png', window.location.origin).toString())

  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.rel = 'canonical'
    document.head.appendChild(canonical)
  }
  canonical.href = canonicalUrl

  const oldJsonLd = document.head.querySelector('#__POST_JSON_LD__')
  oldJsonLd?.remove()
  const jsonLd = document.createElement('script')
  jsonLd.id = '__POST_JSON_LD__'
  jsonLd.type = 'application/ld+json'
  jsonLd.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    datePublished: value.publishedAt,
    dateModified: value.updatedAt,
    mainEntityOfPage: canonicalUrl,
    image: value.media.map((item) => new URL(item.urls.original, window.location.origin).toString()),
    author: { '@type': 'Person', name: 'Jacob Gantt', url: window.location.origin },
  }).replace(/</g, '\\u003c')
  document.head.appendChild(jsonLd)
}

function buildCommentTree(response: MastodonCommentsResponse): MastodonCommentNode[] {
  const nodes = new Map(response.comments.map((comment) => [
    comment.id,
    { ...comment, children: [] } as MastodonCommentNode,
  ]))
  const roots: MastodonCommentNode[] = []
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : null
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return roots
}

async function loadComments(slug: string) {
  commentsLoading.value = true
  comments.value = null
  commentTree.value = []
  try {
    const response = await fetch(`/api/posts/${encodeURIComponent(slug)}/comments/mastodon`)
    if (!response.ok) throw new Error(`Comments request failed (${response.status})`)
    const loaded = await response.json() as MastodonCommentsResponse
    comments.value = loaded
    commentTree.value = buildCommentTree(loaded)
  } catch {
    comments.value = {
      comments: [],
      fetchedAt: null,
      remoteUrl: null,
      stale: false,
      state: 'unavailable',
      truncated: false,
    }
  } finally {
    commentsLoading.value = false
  }
}

async function loadPost() {
  loading.value = true
  error.value = ''
  const embedded = initialPost()
  if (embedded) {
    post.value = embedded
    updateDocumentMeta(embedded)
    void prepareQrCode(embedded)
    loading.value = false
    void loadComments(embedded.slug)
    return
  }

  try {
    const response = await fetch(`/api/posts/${encodeURIComponent(props.slug)}`)
    if (response.status === 404) {
      error.value = 'This post could not be found.'
      post.value = null
      return
    }
    if (!response.ok) throw new Error(`Post request failed (${response.status})`)
    const loaded = await response.json() as CanonicalPost
    post.value = loaded
    updateDocumentMeta(loaded)
    void prepareQrCode(loaded)
    void loadComments(loaded.slug)
    if (loaded.slug !== props.slug) await router.replace(`/photos/${loaded.slug}`)
  } catch (loadError) {
    error.value = loadError instanceof Error ? loadError.message : 'The post could not be loaded.'
    post.value = null
  } finally {
    loading.value = false
  }
}

onMounted(loadPost)
watch(() => props.slug, loadPost)
</script>

<template>
  <main class="post-page">
    <p v-if="loading" class="post-state" role="status">Loading post…</p>
    <section v-else-if="error" class="post-state" role="alert">
      <h1>Post unavailable</h1>
      <p>{{ error }}</p>
      <RouterLink to="/photos">Browse photos</RouterLink>
    </section>
    <article v-else-if="post" class="post">
      <header class="post-header">
        <RouterLink class="back-link" to="/photos">← All photos</RouterLink>
        <h1>{{ post.title || 'Post by Jacob Gantt' }}</h1>
        <dl v-if="post.location || post.date || post.time" class="post-metadata">
          <div v-if="post.location"><dt>Location</dt><dd>{{ post.location }}</dd></div>
          <div v-if="post.date || post.time">
            <dt>Date and time</dt>
            <dd><time :datetime="machineEditorialDateTime(post.date, post.time)">{{ formatEditorialDateTime(post.date, post.time) }}</time></dd>
          </div>
        </dl>
        <p class="published-date">Published <time :datetime="post.publishedAt">{{ dateFormatter.format(new Date(post.publishedAt)) }}</time></p>
        <details class="share-menu">
          <summary class="share-button" aria-label="Share this post">
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M18 16a3 3 0 0 0-2.4 1.2l-6.7-3.9a3.4 3.4 0 0 0 0-2.6l6.7-3.9A3 3 0 1 0 15 5a3 3 0 0 0 .1.7L8.4 9.6a3 3 0 1 0 0 4.8l6.7 3.9A3 3 0 1 0 18 16Z"/></svg>
            Share
          </summary>
          <div class="share-popover">
            <p class="share-heading">Share this post</p>
            <a :href="socialShareUrl('facebook', post)" target="_blank" rel="noopener noreferrer">Share on Facebook <span aria-hidden="true">↗</span></a>
            <a :href="socialShareUrl('x', post)" target="_blank" rel="noopener noreferrer">Share on X <span aria-hidden="true">↗</span></a>
            <a :href="socialShareUrl('linkedin', post)" target="_blank" rel="noopener noreferrer">Share on LinkedIn <span aria-hidden="true">↗</span></a>
            <a :href="emailShareUrl(post)">Share by email</a>
            <button type="button" @click="copyShareLink(post)">Copy link</button>
            <p class="copy-status" role="status" aria-live="polite">{{ copyStatus }}</p>
            <details class="qr-share">
              <summary>Share as QR code</summary>
              <div class="qr-code-panel">
                <img v-if="qrCodeUrl" :src="qrCodeUrl" alt="QR code for this post">
                <p v-else>QR code unavailable.</p>
                <p>Scan to open this post</p>
                <a v-if="qrCodeUrl" :href="qrCodeUrl" :download="`${post.slug}-qr-code.png`">Download QR code</a>
              </div>
            </details>
          </div>
        </details>
      </header>


      <div v-if="post.media.length" class="post-media">
        <figure
          v-for="item in post.media"
          :key="item.id"
          class="post-photo"
        >
          <a :href="item.urls.original" class="post-image-link">
            <img
              :alt="item.altText"
              :height="item.height || undefined"
              loading="eager"
              :src="item.urls.large"
              :width="item.width || undefined"
            >
          </a>
          <figcaption v-if="item.title || item.caption || item.location || item.date || item.time" class="photo-metadata">
            <strong v-if="item.title">{{ item.title }}</strong>
            <p v-if="item.caption">{{ item.caption }}</p>
            <dl v-if="item.location || item.date || item.time">
              <div v-if="item.location"><dt>Location</dt><dd>{{ item.location }}</dd></div>
              <div v-if="item.date || item.time">
                <dt>Date and time</dt>
                <dd><time :datetime="machineEditorialDateTime(item.date, item.time)">{{ formatEditorialDateTime(item.date, item.time) }}</time></dd>
              </div>
            </dl>
          </figcaption>
        </figure>
      </div>

      <div class="post-body" v-html="post.bodyHtml"></div>

      <section class="mastodon-comments" aria-labelledby="mastodon-comments-title">
        <div class="comments-heading">
          <div>
            <h2 id="mastodon-comments-title">Replies on Mastodon</h2>
            <p>Mastodon remains the source of truth. Replies unavailable to this server may not appear here.</p>
          </div>
          <a
            v-if="comments?.remoteUrl"
            class="mastodon-comment-button"
            :href="comments.remoteUrl"
            rel="nofollow noopener noreferrer"
            target="_blank"
          >Comment on Mastodon <span aria-hidden="true">↗</span></a>
        </div>
        <p v-if="commentsLoading" class="comments-state" role="status">Loading replies…</p>
        <p v-else-if="comments?.state === 'not_syndicated'" class="comments-state">
          This post has not been shared to Mastodon.
        </p>
        <p v-else-if="comments?.state === 'unavailable'" class="comments-state" role="status">
          Mastodon replies are temporarily unavailable.
        </p>
        <template v-else-if="comments?.state === 'available'">
          <p v-if="comments.stale" class="comments-notice">Showing cached replies while Mastodon is unavailable.</p>
          <p v-if="comments.truncated" class="comments-notice">
            This is a partial thread. Open Mastodon to see the rest.
          </p>
          <p v-if="commentTree.length === 0" class="comments-state">No replies yet.</p>
          <ol v-else class="comment-list">
            <MastodonComment
              v-for="comment in commentTree"
              :key="comment.id"
              :comment="comment"
            />
          </ol>
        </template>
      </section>
    </article>
  </main>
</template>

<style scoped>
.post-page {
  box-sizing: border-box;
  margin: 1.5rem auto 4rem;
  max-width: 54rem;
  padding: 0 1.25rem;
  width: 100%;
}

.post,
.post-state {
  background: color-mix(in srgb, var(--bg) 82%, transparent);
  border: 1px solid var(--border);
  border-radius: 1rem;
  box-shadow: 0 1rem 3rem color-mix(in srgb, var(--text) 8%, transparent);
  padding: clamp(1.25rem, 4vw, 3rem);
}

.post-header {
  display: grid;
  gap: 0.75rem;
  margin-bottom: 1.75rem;
}

.post-header h1,
.post-state h1 {
  font-size: clamp(1.8rem, 5vw, 3.2rem);
  font-weight: 700;
  line-height: 1.08;
}

.post-excerpt {
  color: var(--muted);
  font-size: 1.15em;
  line-height: 1.45;
}

.published-date,
.back-link {
  color: var(--muted);
  font-family: 'Azeret Mono Variable', monospace;
  font-size: 0.75rem;
}

.post-metadata,
.photo-metadata dl {
  display: grid;
  gap: 0.4rem 1rem;
}

.post-metadata > div,
.photo-metadata dl > div {
  display: grid;
  grid-template-columns: 5.5rem minmax(0, 1fr);
}

.post-metadata dt,
.photo-metadata dt {
  color: var(--muted);
  font-family: 'Azeret Mono Variable', monospace;
  font-size: 0.72rem;
}

.back-link {
  justify-self: start;
}

.share-menu { justify-self: start; position: relative; }
.share-button {
  align-items: center; background: var(--accent); border: 1px solid var(--accent);
  border-radius: 999px; color: var(--bg); cursor: pointer; display: inline-flex;
  box-sizing: border-box;
  font-family: 'Azeret Mono Variable', monospace; font-size: 0.78rem; font-weight: 650;
  gap: 0.45rem; list-style: none; min-height: 44px; padding: 0.65rem 0.9rem;
}
.share-button::-webkit-details-marker,
.qr-share > summary::-webkit-details-marker { display: none; }
.share-button svg { fill: currentColor; height: 1rem; width: 1rem; }
.share-button:hover { filter: brightness(1.1); }
.share-button:focus-visible,
.share-popover a:focus-visible,
.share-popover button:focus-visible,
.qr-share > summary:focus-visible {
  outline: 0.2rem solid color-mix(in srgb, var(--accent) 45%, transparent);
  outline-offset: 0.2rem;
}
.share-popover {
  background: var(--bg); border: 1px solid var(--border); border-radius: 0.75rem;
  box-shadow: 0 0.75rem 2rem color-mix(in srgb, var(--text) 16%, transparent);
  box-sizing: border-box; display: grid; font-size: 0.9rem; gap: 0.15rem; left: 0;
  min-width: min(15rem, calc(100vw - 2.5rem));
  padding: 0.65rem; position: absolute; top: calc(100% + 0.5rem); z-index: 5;
}
.share-heading {
  color: var(--muted); font-family: 'Azeret Mono Variable', monospace;
  font-size: 0.7rem; padding: 0.35rem 0.55rem; text-transform: uppercase;
}
.share-popover > a,
.share-popover > button,
.qr-share > summary {
  align-items: center; border-radius: 0.4rem; box-sizing: border-box; color: var(--text);
  cursor: pointer; display: flex; min-height: 44px;
  padding: 0.55rem; text-align: left; text-decoration: none;
}
.share-popover > a:hover,
.share-popover > button:hover,
.qr-share > summary:hover { background: color-mix(in srgb, var(--accent) 10%, transparent); }
.copy-status { color: var(--muted); font-size: 0.75rem; min-height: 1em; padding: 0 0.55rem; }
.qr-share { border-top: 1px solid var(--border); margin-top: 0.25rem; padding-top: 0.25rem; }
.qr-share > summary { list-style: none; }
.qr-code-panel { display: grid; gap: 0.5rem; justify-items: center; padding: 0.6rem 0.55rem 0.35rem; text-align: center; }
.qr-code-panel img { background: white; border-radius: 0.35rem; height: 10rem; width: 10rem; }
.qr-code-panel p { color: var(--muted); font-size: 0.75rem; }
.qr-code-panel a { color: var(--accent); font-size: 0.78rem; }

.content-warning {
  border-left: 0.25rem solid var(--accent);
  margin: 1.5rem 0;
  padding: 0.75rem 1rem;
}

.content-warning strong {
  font-weight: 650;
}

.post-media {
  display: grid;
  gap: 1rem;
  margin: 1.5rem 0 2rem;
}

.post-image-link,
.post-image-link img {
  display: block;
  width: 100%;
}

.post-photo { margin: 0; }
.photo-metadata { display: grid; gap: 0.45rem; padding: 0.75rem 0.25rem 0; }
.photo-metadata strong { font-size: 1.05rem; font-weight: 650; }
.photo-metadata p { color: var(--muted); line-height: 1.5; }

.post-image-link img {
  border-radius: 0.65rem;
  height: auto;
}

.post-body {
  line-height: 1.65;
}

.post-body :deep(h1),
.post-body :deep(h2),
.post-body :deep(h3) {
  font-weight: 650;
  line-height: 1.2;
  margin: 1.75em 0 0.65em;
}

.post-body :deep(h1) { font-size: 1.75em; }
.post-body :deep(h2) { font-size: 1.45em; }
.post-body :deep(h3) { font-size: 1.2em; }
.post-body :deep(p),
.post-body :deep(blockquote),
.post-body :deep(pre),
.post-body :deep(ul),
.post-body :deep(ol) { margin: 1em 0; }
.post-body :deep(ul) { list-style: disc; padding-left: 1.5em; }
.post-body :deep(ol) { list-style: decimal; padding-left: 1.5em; }
.post-body :deep(a),
.post-state a { color: var(--accent); }
.post-body :deep(strong) { font-weight: 650; }
.post-body :deep(em) { font-style: italic; }
.post-body :deep(blockquote) { border-left: 0.2rem solid var(--border); padding-left: 1rem; }
.post-body :deep(code) { font-family: 'Azeret Mono Variable', monospace; font-size: 0.88em; }
.post-body :deep(pre) { overflow-x: auto; }

.mastodon-comments {
  border-top: 1px solid var(--border);
  margin-top: 3rem;
  padding-top: 2rem;
}

.comments-heading {
  align-items: flex-start;
  display: flex;
  gap: 1rem;
  justify-content: space-between;
}

.comments-heading h2 {
  font-size: 1.35rem;
  font-weight: 650;
}

.comments-heading p,
.comments-state,
.comments-notice {
  color: var(--muted);
  line-height: 1.45;
}

.comments-heading p {
  font-size: 0.9rem;
  margin-top: 0.35rem;
}

.mastodon-comment-button {
  background: var(--accent);
  border: 1px solid var(--accent);
  border-radius: 999px;
  color: var(--bg);
  flex: 0 0 auto;
  font-family: 'Azeret Mono Variable', monospace;
  font-size: 0.75rem;
  font-weight: 650;
  padding: 0.7rem 0.9rem;
  text-decoration: none;
  transition: filter 150ms ease, transform 150ms ease;
}

.mastodon-comment-button:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.mastodon-comment-button:focus-visible {
  outline: 0.2rem solid color-mix(in srgb, var(--accent) 45%, transparent);
  outline-offset: 0.2rem;
}

.comments-state,
.comments-notice {
  margin-top: 1.5rem;
}

.comments-notice {
  border-left: 0.2rem solid var(--accent);
  padding-left: 0.75rem;
}

.comment-list {
  display: grid;
  gap: 0.9rem;
  margin-top: 1.5rem;
}

.post-state {
  display: grid;
  gap: 1rem;
  text-align: center;
}

@media (max-width: 34rem) {
  .comments-heading {
    flex-direction: column;
  }

  .post-metadata > div,
  .photo-metadata dl > div {
    gap: 0.2rem;
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
