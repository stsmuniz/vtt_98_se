<script setup>
import { onMounted, onUnmounted } from 'vue';

const props = defineProps({
  show: Boolean,
  x: Number,
  y: Number
});

const emit = defineEmits(['close']);

// Close menu when clicking anywhere else
const closeMenu = () => {
  if (props.show) emit('close');
};

onMounted(() => window.addEventListener('click', closeMenu));
onUnmounted(() => window.removeEventListener('click', closeMenu));
</script>

<template>
  <ul
      v-if="show"
      class="context-menu"
      :style="{ top: `${y}px`, left: `${x}px` }"
  >
    <slot></slot>
  </ul>
</template>

<style scoped>
.context-menu {
  position: fixed;
  background: silver;
  z-index: 999;
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid;
  border-color: white #080808 #080808 white;
  min-width: 150px;
}

/* Style list items via deep selector or global slot styles */
:deep(li) {
  padding: 8px 12px;
  cursor: pointer;
  font-family: "Pixelated MS Sans Serif", sans-serif;
  font-size: 0.75rem;
}

:deep(li:hover) {
  background-color: darkblue;
  color: white;
}
</style>
