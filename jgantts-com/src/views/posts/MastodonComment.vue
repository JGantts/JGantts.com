<script setup lang="ts">
import type { MastodonCommentNode } from '@/posts/types'

defineProps<{ comment: MastodonCommentNode }>()
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})
</script>

<template>
  <li class="comment">
    <article>
      <header>
        <a :href="comment.account.url" rel="nofollow noopener noreferrer" target="_blank">
          <img
            v-if="comment.account.avatarUrl"
            alt=""
            height="40"
            loading="lazy"
            referrerpolicy="no-referrer"
            :src="comment.account.avatarUrl"
            width="40"
          >
          <span>
            <strong>{{ comment.account.displayName }}</strong>
            <small>{{ comment.account.handle }}</small>
          </span>
        </a>
        <a class="comment-date" :href="comment.url" rel="nofollow noopener noreferrer" target="_blank">
          <time :datetime="comment.createdAt">{{ dateFormatter.format(new Date(comment.createdAt)) }}</time>
        </a>
      </header>
      <p v-if="comment.orphaned" class="context-note">Earlier reply context is unavailable.</p>
      <div class="comment-content" v-html="comment.contentHtml"></div>
      <div v-if="comment.attachments.length" class="comment-media">
        <a
          v-for="attachment in comment.attachments"
          :key="attachment.url"
          :href="attachment.url"
          rel="nofollow noopener noreferrer"
          target="_blank"
        >
          <img
            :alt="attachment.description || 'Image attached to this Mastodon reply'"
            loading="lazy"
            referrerpolicy="no-referrer"
            :src="attachment.previewUrl"
          >
        </a>
      </div>
    </article>
    <ol v-if="comment.children.length" class="comment-children">
      <MastodonComment
        v-for="child in comment.children"
        :key="child.id"
        :comment="child"
      />
    </ol>
  </li>
</template>

<style scoped>
.comment {
  min-width: 0;
}

.comment article {
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 1rem;
}

.comment header,
.comment header > a,
.comment header span {
  align-items: center;
  display: flex;
}

.comment header {
  gap: 0.75rem;
  justify-content: space-between;
}

.comment header > a:first-child {
  color: inherit;
  gap: 0.65rem;
  min-width: 0;
  text-decoration: none;
}

.comment header img {
  border-radius: 50%;
  flex: 0 0 auto;
}

.comment header span {
  align-items: flex-start;
  flex-direction: column;
  min-width: 0;
}

.comment header strong,
.comment header small {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comment header strong {
  font-weight: 650;
}

.comment header small,
.comment-date,
.context-note {
  color: var(--muted);
  font-family: 'Azeret Mono Variable', monospace;
  font-size: 0.7rem;
}

.comment-date {
  flex: 0 0 auto;
}

.context-note {
  margin-top: 0.75rem;
}

.comment-content {
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.comment-content :deep(p) {
  margin-top: 0.75rem;
}

.comment-content :deep(a) {
  color: var(--accent);
}

.comment-media {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(auto-fit, minmax(min(12rem, 100%), 1fr));
  margin-top: 0.75rem;
}

.comment-media img {
  border-radius: 0.5rem;
  display: block;
  height: auto;
  max-height: 22rem;
  object-fit: contain;
  width: 100%;
}

.comment-children {
  border-left: 1px solid var(--border);
  display: grid;
  gap: 0.75rem;
  margin: 0.75rem 0 0 clamp(0.5rem, 3vw, 1.5rem);
  padding-left: clamp(0.5rem, 3vw, 1.5rem);
}

@media (max-width: 34rem) {
  .comment header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
