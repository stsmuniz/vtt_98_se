<script setup lang="ts">
/** Quem está na sala agora (Ferramentas > Participantes). Só leitura: o mestre remove em Configurações de Sala. */
const open = defineModel<boolean>('open', { default: false })
defineProps<{ participants: { id: string; name: string; role: 'gm' | 'player' }[]; selfId?: string }>()
</script>

<template>
  <DesktopInlineWindow id="participantes" v-model:open="open" title="Participantes" icon="users" :width="320" :height="320">
    <div class="sunken-panel participants-panel">
      <table class="interactive participants-table" data-test="participants-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Papel</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="participant in participants" :key="participant.id">
            <td>{{ participant.name }}<span v-if="participant.id === selfId" class="self"> (você)</span></td>
            <td>{{ participant.role === 'gm' ? 'Mestre' : 'Jogador' }}</td>
          </tr>
          <tr v-if="!participants.length">
            <td colspan="2" class="empty">Ninguém conectado.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </DesktopInlineWindow>
</template>

<style scoped>
.participants-panel {
  flex: 1 1 auto;
  min-height: 0;
}
.participants-table {
  width: 100%;
}
.self,
.empty {
  color: var(--c-text-disabled);
}
</style>
