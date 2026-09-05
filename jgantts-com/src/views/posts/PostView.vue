<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { CanonicalPost } from '@/posts/types'

const props = defineProps<{ slug: string }>()
const router = useRouter()
const post = ref<CanonicalPost | null>(null)
const loading = ref(true)
const error = ref('')
const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' })

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
  const title = value.title || 'Post by Jacob Gantt'
  const description = value.excerpt || 'A post from Jacob Gantt on JGantts.com.'
  const image = value.media[0]?.urls.large
  const canonicalUrl = new URL(`/posts/${value.slug}`, window.location.origin).toString()
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
  setMeta('property', 'og:url', canonicalUrl)
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

async function loadPost() {
  loading.value = true
  error.value = ''
  const embedded = initialPost()
  if (embedded) {
    post.value = embedded
    updateDocumentMeta(embedded)
    loading.value = false
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
    if (loaded.slug !== props.slug) await router.replace(`/posts/${loaded.slug}`)
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
      <RouterLink to="/posts">Browse posts</RouterLink>
    </section>
    <article v-else-if="post" class="post">
      <header class="post-header">
        <RouterLink class="back-link" to="/posts">← All posts</RouterLink>
        <h1>{{ post.title || 'Post by Jacob Gantt' }}</h1>
        <p v-if="post.excerpt" class="post-excerpt">{{ post.excerpt }}</p>
        <time :datetime="post.publishedAt">{{ dateFormatter.format(new Date(post.publishedAt)) }}</time>
      </header>

      <p v-if="post.contentWarning" class="content-warning">
        <strong>Content note:</strong> {{ post.contentWarning }}
      </p>

      <div v-if="post.media.length" class="post-media">
        <a
          v-for="item in post.media"
          :key="item.id"
          :href="item.urls.original"
          class="post-image-link"
        >
          <img
            :alt="item.altText"
            :height="item.height || undefined"
            loading="eager"
            :src="item.urls.large"
            :width="item.width || undefined"
          >
        </a>
      </div>

      <div class="post-body" v-html="post.bodyHtml"></div>
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

.post-header time,
.back-link {
  color: var(--muted);
  font-family: 'Azeret Mono Variable', monospace;
  font-size: 0.75rem;
}

.back-link {
  justify-self: start;
}

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

.post-state {
  display: grid;
  gap: 1rem;
  text-align: center;
}
</style>
