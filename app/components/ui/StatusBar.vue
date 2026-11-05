<template>
  <div class="status-bar ui-status-bar" role="status">
    <slot />
  </div>
</template>

<style scoped>
.ui-status-bar {
  margin: 0;
  gap: var(--sp-1);
  padding: var(--sp-1);
  font-family: var(--font-ui);
  font-size: var(--fs-1);
}
</style>
