@ -1,82 +0,0 @@
<script setup lang="ts">
import { defineComponent, h } from 'vue';

const JgLink = defineComponent({
  name: 'JgLink',

  props: {
    header: {
      type: String,
      required: true,
    },
    href: {
      type: String,
      required: false,
    },
    subtext: {
      type: Array<string>,
      required: true,
    },
  },

  setup(props) {
    return () =>
      h(props.href ? 'a' : 'div',
        {
          href: props.href,
          rel: 'noopener noreferrer',
          class: 'jg-link'
        }, [
        h('p', { class: 'jg-link-header' }, props.header),
        h(
          'div',
          { class: 'jg-link-subtext' },
          props.subtext.map((subtext, index) => {
            return h(
              'p',
              { class: 'jg-link-subtext-item' },
              subtext + (
                props.subtext.length > 1 && index !== props.subtext.length - 1 
                  ? '/' 
                  : props.href
                    ? '->'
                    : ''
              ),
            )
          }),
        ),
      ])
  },
})
</script>

<template>
  <div class="i-am">
    <p class="intro">Hey, I'm <span class="hey-highlight">Jacob Gantt</span>.</p>
    <p class="intro">This is my website. I am</p>
    <JgLink
      :header="'Southern Appalachians'"
      :href="'https://en.wikipedia.org/wiki/Johnson_City,_Tennessee'"
      :subtext="['wikipedia.org', 'Johnson City, TN, USA']"
    />
    <JgLink
      :header="'Professional Programmer'"
      :href="'https://github.com/JGantts'"
      :subtext="['github.com', 'JGantts']"
    />
    <JgLink
      :header="'Amateur Photographer'"
      :subtext="['to do']"
    />
    <JgLink
      :header="'UTC -4/-5'"
      :href="'https://en.wikipedia.org/wiki/Eastern_Time_Zone'"
      :subtext="['wikipedia.org', 'New York Timezone']"
    />
  </div>
</template>

<style>

</style>

<style scoped>
.i-am {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.hey-highlight {
  font-weight: 900;
  font-style: normal;
}

.intro {
  color: var(--text);
  font-size: 1.25em;
  font-weight: 100;
}

.i-am :deep(.jg-link) {
  color: var(--text);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.i-am :deep(.jg-link .jg-link-header) {
  color: var(--text);
  font-weight: 600;
}

.i-am :deep(.jg-link .jg-link-subtext) {
  color: var(--text);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.i-am :deep(a:link)  {
  color: var(--text);
  text-decoration: none;
}

.i-am  :deep(a:visited) {
  color: var(--text);
  text-decoration: none;
}

.i-am :deep(a:hover .jg-link-header) {
  color: var(--accent);
  text-decoration: underline;
}

.i-am :deep(a:active .jg-link-header) {
  color: var(--accent);
  text-decoration: underline;
}

.i-am :deep(.jg-link-subtext) {
  font-family: "Azeret Mono Variable", monospace;
  font-weight: 100;
  font-size: 0.5em;
  font-style: normal;
}

.who {
  max-width: 9rem;
}

.where {
  max-width: 100rem;
}
</style>