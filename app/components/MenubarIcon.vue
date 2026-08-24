<script setup lang="ts">
defineProps(['icon', 'name'])
</script>
<template>
  <a class="icon">
    <img :src="`/assets/icons/${icon}.png`" :alt="name" />
    <span class="icon-name">{{name}}</span>
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
  padding: 0.2rem;
  border: 1px solid transparent;
  img {
    width: 2rem;
    height: 2rem;
  }
  span {
    font-size: 0.7rem;
  }
}
.icon:hover {
  border: 1px solid;
  border-color: #ffffff #808080 #808080 #ffffff;
}
</style>