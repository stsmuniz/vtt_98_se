<script setup lang="ts">
withDefaults(defineProps<{ icon: string; name?: string; size?: 'sm' | 'lg' }>(), {
  size: 'lg',
})
</script>
<template>
  <a class="icon" :class="`icon--${size}`">
    <img :src="`/assets/icons/${icon}.png`" :alt="name" />
    <span class="icon-name">{{ name }}</span>
  </a>
</template>
<style lang="css" scoped>
.icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  text-decoration: none;
  color: var(--text-color);
}

.icon--lg img {
  width: 3rem;
  height: 3rem;
}
.icon--lg:hover .icon-name {
  color: white;
  background-color: darkblue;
}

.icon--sm {
  padding: 0.2rem;
  border: 1px solid transparent;
}
.icon--sm img {
  width: 2rem;
  height: 2rem;
}
.icon--sm:hover {
  border: 1px solid;
  border-color: #ffffff #808080 #808080 #ffffff;
}
</style>
