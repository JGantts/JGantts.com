<script setup lang="ts">

import type { GuiNode, GuiLeaf, GuiParent, GuiChild, GuiTreeIdentifiable } from "./types/gui"

const props = defineProps<{
  node: GuiLeaf
}>()
</script>

<template>
  <div class="tree-node">
    <label v-if="'enabled' in node">
      <input
        type="checkbox"
        :checked="node.enabled"
      />
    </label>
  </div>
</template>