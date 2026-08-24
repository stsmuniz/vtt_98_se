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
  img {
    width: 3rem;
    height: 3rem;
  }
  span {
    font-size: 1rem;
  }
}
.icon:hover .icon-name {
  color: white;
  background-color: darkblue;
}
</style>