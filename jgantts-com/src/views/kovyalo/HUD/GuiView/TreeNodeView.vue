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

const isRoot = () => {
  return !props.node.parent
}

const toggleWhatever = () => {
  if (isLeaf()) {
    getLeaf().enabled = !getLeaf().enabled
  } else {
    toggleExpanded()
  }
}
</script>

<template>
    <div class="tree-node">
  
      <!-- ROW -->
      <div
       v-if="!isRoot()"
       class="tree-row"
       @click="toggleWhatever"
      >
  
        <TreeLeafCheckbox v-if="isLeaf()" :node="getLeaf()" />

        <!-- expand/collapse -->
        <button
          v-else
          class="expand"
        >
          {{ expanded ? "▾" : "▸" }}
        </button>
        <div style="width: 0.5em;" />
        <!-- label -->
        <span class="label">
          {{ node.title }}
        </span>
      </div>

      <div
        v-if="isRoot()" 
        class="children-holder"
      >
        <TreeNodeView
          v-for="child in node.children"
          :key="child.id"
          :node="child"
        />
      </div>

      <div
        v-else
        v-if="isRoot() || (hasChildren && expanded)"
        class="children-display children-margin"
      >
        <div
          class="children-gutter"
          @click="toggleExpanded"
        />
        <div class="children-holder">
          <TreeNodeView
            v-for="child in node.children"
            :key="child.id"
            :node="child"
          />
        </div>
      </div>
    </div>
  </template>

<style scoped>
.tree-node {
  font-family: "Garamond", "Goudy Old Style", "Times New Roman", serif;

  /* default = light parchment */
  color: #2a1a0f;
}

/* ROW */
.tree-row {
  cursor: pointer;

  display: flex;
  gap: 0px;
  align-items: center;
  gap: 0;

  padding: 0.3em;
  margin: 0;
  margin-bottom: 0.15em;

  background: linear-gradient(#f3ead6, #efe3c6);
  border: 1px solid #c8b48a;
  border-radius: 4px;

  box-shadow: inset 0 0 0 1px rgba(80, 50, 20, 0.15);

  transition: background 0.15s ease, border-color 0.15s ease;
}

.tree-row:hover {
  background: linear-gradient(#f6efd9, #f1e5c9);
}

.label {
  letter-spacing: 0.02em;
  font-size: 0.95em;
}

/* EXPAND BUTTON */
.expand {
  width: 1.6em;
  height: 1.6em;

  border: 1px solid #8b6f3d;
  border-radius: 2px;

  background: #e9dbb8;
  color: #3b2a16;

  font-weight: bold;
  line-height: 1;

  transition: filter 0.15s ease, background 0.15s ease;
}

.expand:hover {
  background: #e2d1a6;
}

/* CHILD INDENT */
.children-display {
  display: flex;
  gap: 0;
  flex-direction: row;
}

.children-margin {
  margin-left: 0.2em;
  padding-left: 1em;
}

.children-gutter {
  width: 0.5em;
  flex-shrink: 0;
  margin-left: calc(-0.25em - 1em);
  margin-right: 0.6em;
  cursor: pointer;
  border-left: 1px dashed #b79d6a;
}

.children-holder {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

/* ========================= */
/* 🌙 DARK MODE OVERRIDES   */
/* ========================= */

.dark .tree-node {
  color: #e7d8b6;
}

/* ROW becomes “aged ink on dark wood” */
.dark .tree-row {
  background: linear-gradient(#2f2418, #22180f);
  border: 1px solid rgba(200, 160, 90, 0.25);

  box-shadow:
    inset 0 0 0 1px rgba(255, 220, 160, 0.08),
    inset 0 0 12px rgba(0, 0, 0, 0.6);
}

.dark .tree-row:hover {
  background: linear-gradient(#3a2c1c, #241a10);
}

/* label becomes slightly “aged ink glow” */
.dark .label {
  color: #f0e0b8;
}

/* expand button becomes metal/bronze plate */
.dark .expand {
  background: linear-gradient(180deg, #3a2c1c, #241a10);
  color: #f0e0b8;

  border: 1px solid rgba(200, 160, 90, 0.35);

  box-shadow:
    inset 0 0 0 1px rgba(255, 220, 160, 0.1),
    inset 0 0 10px rgba(0, 0, 0, 0.6);
}

.dark .expand:hover {
  filter: brightness(1.1);
}

/* child indentation line becomes faint ink */
.dark .children-gutter {
  border-left: 1px dashed rgba(220, 180, 120, 0.25);
}
</style>