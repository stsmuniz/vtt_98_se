<script setup lang="ts">
/**
 * Árvore (sumário do manual, futuros seletores de pasta). Nós com filhos usam
 * <details>, como o 98.css espera; o nó selecionado fica destacado.
 */
import type { IconName } from '~/utils/icons'

export interface TreeNode {
  id: string
  label: string
  icon?: IconName
  children?: TreeNode[]
  /** Começa expandido. */
  open?: boolean
}

defineOptions({ name: 'UiTreeView' })

const props = withDefaults(defineProps<{ nodes: TreeNode[]; nested?: boolean }>(), { nested: false })
const selected = defineModel<string | null>('selected', { default: null })

const emit = defineEmits<{ activate: [node: TreeNode] }>()

function choose(node: TreeNode) {
  selected.value = node.id
  emit('activate', node)
}
</script>

<template>
  <ul :class="props.nested ? 'ui-tree-children' : 'tree-view ui-tree'" :role="props.nested ? 'group' : 'tree'">
    <li v-for="node in nodes" :key="node.id" role="treeitem" :aria-selected="selected === node.id">
      <details v-if="node.children?.length" :open="node.open">
        <summary>
          <button type="button" class="ui-tree-label" :class="{ selected: selected === node.id }" @click.prevent="choose(node)">
            <UiIcon v-if="node.icon" :name="node.icon" :size="16" />{{ node.label }}
          </button>
        </summary>
        <UiTreeView v-model:selected="selected" :nodes="node.children" nested @activate="emit('activate', $event)" />
      </details>
      <button v-else type="button" class="ui-tree-label" :class="{ selected: selected === node.id }" @click="choose(node)">
        <UiIcon v-if="node.icon" :name="node.icon" :size="16" />{{ node.label }}
      </button>
    </li>
  </ul>
</template>

<style scoped>
.ui-tree {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--fs-1);
}
.ui-tree-children {
  margin: 0;
}
.ui-tree-label {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  min-width: 0;
  min-height: 0;
  padding: 0 var(--sp-1);
  border: none;
  background: transparent;
  box-shadow: none;
  font: inherit;
  color: inherit;
  text-align: left;
}
.ui-tree-label.selected {
  background: var(--c-selection);
  color: var(--c-selection-text);
}
.ui-tree-label:focus {
  outline: 1px dotted var(--c-text);
}
</style>
