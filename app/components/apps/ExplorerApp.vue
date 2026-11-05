<script setup lang="ts">
/**
 * Janela de pasta (Tokens, Cenários, Cenas, Salas). No modo seletor, entrega o
 * registro escolhido a quem chamou useDesktop().pick() e fecha.
 */
import type { ResourceKind, ResourceRecord } from '~/desktop/resources'
import { useWindow } from '~~/composables/useWindow'
import { useWindowManager } from '~~/composables/useWindowManager'

const props = withDefaults(defineProps<{
  resource: ResourceKind
  mode?: 'browse' | 'pick'
  confirmLabel?: string
}>(), {
  mode: 'browse',
  confirmLabel: 'Selecionar',
})

const win = useWindow()
const wm = useWindowManager()

function onPick(raw: ResourceRecord) {
  wm.resolvePick(win.id, raw)
}
</script>

<template>
  <AppsExplorerResourceExplorer
    :resource="resource"
    :mode="mode"
    :confirm-label="confirmLabel"
    @pick="onPick"
    @cancel="win.close()"
  />
</template>
