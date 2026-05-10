<script setup lang="ts">
import { computed, getCurrentInstance, onMounted, ref } from "vue";
import { useSettings } from "../../common/Settings";
import type { GuiLeaf, GuiNode } from "./types/gui"
import TreeLeafCheckbox from "./TreeLeafCheckbox.vue";

const getNodeHash = (node: GuiNode) => {
    let ancestors: GuiNode[] = []
    let curr: GuiNode | null = node
    while (curr) {
        ancestors.push(curr)
        curr = curr.parent
    }
    return ancestors.map(x => x.id).join(",")
}

const expanded = ref(false)

const props = defineProps<{
  node: GuiNode
}>()

//const settings = useSettings()

const hasChildren = computed(() => {
    console.log(props)
    return Object.keys(props.node.children).length > 0
})

const isLeaf = () => {
    return "enabled" in props.node
}

const toggleExpanded = () => {
    expanded.value = !expanded.value
}

const getLeaf = () => {
  if (isLeaf()) {
    return props.node as GuiLeaf
  } else {
    throw { mess: "Tried to get Leaf when already known as not Leaf." }
  }
}

onMounted(() => {
    console.log("here")
})
</script>

<template>
    <div class="tree-node">
  
      <!-- ROW -->
      <div class="tree-row">
  
        <div
          v-if="isLeaf()"
          class="leaf-checkbox-holder"
        >
            <TreeLeafCheckbox :node="getLeaf()" />
        </div>

        <!-- expand/collapse -->
        <button
          v-else
          class="expand"
          @click="toggleExpanded"
        >
          {{ expanded ? "▾" : "▸" }}
        </button>
  
        <!-- label -->
        <span class="label">
          {{ node.title }}
        </span>
      </div>
      <div
        v-if="hasChildren && expanded"
        class="children"
      >
        <TreeNodeView
          v-for="child in node.children"
          :key="child.id"
          :node="child"
        />
      </div>
    </div>
  </template>

<style scoped>
.children {
  margin-left: 0.75em;
}

.leaf-checkbox-holder {
  margin-left: 1em;
}

</style>