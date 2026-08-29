@ -1,82 +0,0 @@
<script setup lang="ts">
import { onMounted, ref } from 'vue';

const post = ref(null)
const comments = ref([]);
const loading = ref(true);
const error = ref(null);

let host = "mastodon.social"
let tootId = "117175619119315006"

onMounted(async () => {
  try {
    // The /context endpoint returns ancestors and descendants
    const response = await fetch(`https://${host}/api/v1/statuses/${tootId}`);
    if (!response.ok) throw new Error('Failed to fetch comments');
    
    const data = await response.json();

    console.log(data)

    post.value = data

    // Descendants are the replies to your post
    comments.value = data.descendants || [];
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class=""mastodon-post>
    {{ post.content }}

    <div class="mastodon-comments">
      <div v-if="loading">Loading comments...</div>
      <div v-if="error" class="error">{{ error }}</div>
      
      <div v-for="comment in comments" :key="comment.id" class="comment">
        <div class="comment-header">
          <img :src="comment.account.avatar" alt="" class="avatar" />
          <strong>{{ comment.account.display_name }}</strong>
          <span>@{{ comment.account.acct }}</span>
        </div>
        <!-- Mastodon API returns pre-formatted HTML in the content field -->
        <div class="comment-body" v-html="comment.content"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.comment { border-bottom: 1px solid #eee; padding: 1rem 0; }
.comment-header { display: flex; align-items: center; gap: 0.5rem; }
.avatar { width: 40px; height: 40px; border-radius: 50%; }
</style>
