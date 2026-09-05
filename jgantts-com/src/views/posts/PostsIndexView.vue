<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { CanonicalPost, PostPage } from '@/posts/types'

const posts = ref<CanonicalPost[]>([])
const nextCursor = ref<string | null>(null)
const loading = ref(true)
const error = ref('')
const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' })

async function loadPosts(cursor?: string) {
  loading.value = true
  error.value = ''
  try {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
    const response = await fetch(`/api/posts${query}`)
    if (!response.ok) throw new Error(`Posts request failed (${response.status})`)
    const page = await response.json() as PostPage
    posts.value.push(...page.items)
    nextCursor.value = page.nextCursor
  } catch (loadError) {
    error.value = loadError instanceof Error ? loadError.message : 'Posts could not be loaded.'
  } finally {
    loading.value = false
  }
}

onMounted(() => loadPosts())
</script>

<template>
  <main class="posts-page">
    <header class="posts-heading">
      <h1>Posts</h1>
      <p>Writing and photographs, published here first.</p>
    </header>

    <p v-if="error" class="posts-state" role="alert">{{ error }}</p>
    <p v-else-if="loading && !posts.length" class="posts-state" role="status">Loading posts…</p>
    <p v-else-if="!posts.length" class="posts-state">No posts have been published yet.</p>

    <section v-else class="post-list" aria-label="Published posts">
      <RouterLink
        v-for="post in posts"
        :key="post.id"
        class="post-card"
        :to="`/posts/${post.slug}`"
      >
        <img
          v-if="post.media[0]"
          :alt="post.media[0].altText"
          loading="lazy"
          :src="post.media[0].urls.thumbnail"
        >
        <span class="post-card-copy">
          <strong>{{ post.title || post.excerpt || 'Post by Jacob Gantt' }}</strong>
          <span v-if="post.title && post.excerpt">{{ post.excerpt }}</span>
          <time :datetime="post.publishedAt">{{ formatter.format(new Date(post.publishedAt)) }}</time>
        </span>
      </RouterLink>
    </section>

    <button
      v-if="nextCursor"
      class="load-more"
      :disabled="loading"
      type="button"
      @click="loadPosts(nextCursor)"
    >
      {{ loading ? 'Loading…' : 'Load more' }}
    </button>
  </main>
</template>

<style scoped>
.posts-page {
  margin: 1.5rem auto 4rem;
  max-width: 64rem;
  padding: 0 1.25rem;
  width: calc(100% - 2.5rem);
}

.posts-heading {
  margin-bottom: 2rem;
  text-align: center;
}

.posts-heading h1 {
  font-size: clamp(2rem, 6vw, 4rem);
  font-weight: 750;
}

.posts-heading p,
.posts-state {
  color: var(--muted);
  line-height: 1.5;
  margin-top: 0.5rem;
  text-align: center;
}

.post-list {
  display: grid;
  gap: 1rem;
}

.post-card {
  align-items: center;
  background: color-mix(in srgb, var(--bg) 82%, transparent);
  border: 1px solid var(--border);
  border-radius: 0.85rem;
  color: var(--text);
  display: grid;
  gap: 1rem;
  grid-template-columns: 7rem 1fr;
  overflow: hidden;
  padding: 0.75rem;
  text-decoration: none;
}

.post-card:not(:has(img)) {
  grid-template-columns: 1fr;
}

.post-card:hover {
  border-color: var(--accent);
}

.post-card img {
  aspect-ratio: 1;
  border-radius: 0.55rem;
  height: 7rem;
  object-fit: cover;
  width: 7rem;
}

.post-card-copy {
  display: grid;
  gap: 0.4rem;
}

.post-card-copy strong {
  font-size: 1.25em;
  font-weight: 650;
}

.post-card-copy span,
.post-card-copy time {
  color: var(--muted);
}

.post-card-copy time {
  font-family: 'Azeret Mono Variable', monospace;
  font-size: 0.7rem;
}

.load-more {
  border: 1px solid var(--accent);
  border-radius: 999px;
  color: var(--accent);
  display: block;
  margin: 2rem auto 0;
  padding: 0.7rem 1.2rem;
}

@media (max-width: 36rem) {
  .post-card { grid-template-columns: 5rem 1fr; }
  .post-card img { height: 5rem; width: 5rem; }
}
</style>
