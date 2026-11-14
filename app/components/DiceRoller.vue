<script setup lang="ts">
import { dieText, rollSummaryParts, type DiceGroup, type DiceType, type ModSignal, type RollType } from "~~/lib/rollDice";
import { useDiceSession } from "~~/composables/useDiceSession";
import { useDialog } from "~~/composables/useDialog";
import { useWindow } from "~~/composables/useWindow";
import { saveLocalPopupMode } from "~~/composables/useDiceSession";
import type { MenuDef } from "~/utils/menu";

const props = withDefaults(defineProps<{ scope?: 'local' | 'room' }>(), { scope: 'local' })
const session = useDiceSession(props.scope)
const quantity = ref(1)
const dice = ref('4')
const mod = ref(0)
const modSignal = ref<ModSignal>('+')
const rollType = ref<RollType>('s')
const hidden = ref(false)
// d2 como cara-ou-coroa: a escolha vai junto com a rolagem, então todos na sala veem igual.
const coin = ref(false)
const validDice = ['2', '4', '6', '8', '10', '12', '20', '100']
const diceGroups = ref<DiceGroup[]>([])
const rolling = ref(false)

const isRoom = props.scope === 'room'

// Fora da sala o próprio usuário escolhe como o resultado aparece (na sala é config. do mestre).
if (!isRoom) {
  const win = useWindow()
  const POPUPS = [
    { value: 'window', label: '&Janela de resultado' },
    { value: 'joey', label: '&Joey (mascote)' },
    { value: 'off', label: '&Nenhum' },
  ] as const
  const menus = computed<MenuDef[]>(() => [
    {
      id: 'configuracoes',
      label: '&Configurações',
      items: POPUPS.map(option => ({
        id: `popup-${option.value}`,
        type: 'radio' as const,
        label: option.label,
        checked: session.popupMode.value === option.value,
        action: () => { session.popupMode.value = option.value; saveLocalPopupMode(option.value) },
      })),
    },
  ])
  win.setMenus(menus.value)
  watch(menus, m => win.setMenus(m))
}

function addDice() {
  diceGroups.value.push({ quantity: Number(quantity.value), faces: Number(dice.value) as DiceType })
}

function removeDice(index: number) {
  diceGroups.value.splice(index, 1)
}

async function rollDice() {
  if (rolling.value || !session.canRoll.value) return
  const groups = diceGroups.value.length > 0
      ? diceGroups.value
      : [{ quantity: Number(quantity.value), faces: Number(dice.value) as DiceType }]
  rolling.value = true
  try {
    await session.roll(groups, rollType.value, Math.abs(Number(mod.value) || 0), modSignal.value, session.isOwner.value && hidden.value, coin.value)
  } catch (error) {
    await useDialog().alert((error as Error).message)
  } finally {
    rolling.value = false
  }
}

async function clearHistory() {
  try {
    if (isRoom) {
      if (!await useDialog().confirm('Apagar o histórico de rolagens da sala para todos?')) return
      await session.clearRoomHistory()
    } else {
      session.clearLocal()
    }
  } catch (error) {
    await useDialog().alert((error as Error).message)
  }
}

function showRoll(roll: typeof session.rolls.value[number]) {
  session.latest.value = roll
  session.openResult()
}

function rollTypeLabel(type: RollType) {
  return type === 's' ? 'Soma' : type === 'h' ? 'Maior' : type === 'l' ? 'Menor' : 'Separado'
}

function formatTime(at: number) {
  return new Date(at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <section class="dice-roller-container">
    <fieldset class="dice-selector-fieldset">
      <legend>Escolha o dado</legend>
      <button
          v-for="d in validDice"
          :key="d"
          type="button"
          class="dice-selector-button"
          :class="{ selected: dice === d }"
          :aria-pressed="dice === d"
          @click="dice = d"
      >
        <DiceFace :faces="Number(d)" :size="48" />
        <span>D{{ d }}</span>
      </button>
    </fieldset>
    <fieldset class="modifiers-fieldset">
      <legend>Configurações</legend>
      <div class="roll-set">
        <div class="dice-settings-container">
          <div class="attribute-container">
            <label :for="`dice-quantity-${props.scope}`">Qtde</label>
            <input class="attribute-item" v-model="quantity" type="number" :id="`dice-quantity-${props.scope}`" name="quantity" min="1" />
          </div>
          <div class="attribute-container">
            <label :for="`dice-mod-${props.scope}`">Mod</label>
            <div class="value-modifier">
              <div class="signal-mod-container">
                <div class="signal-mod">
                  <input type="radio" v-model="modSignal" value="-" :name="`signal-mod-${props.scope}`" :id="`signal-minus-${props.scope}`" :disabled="rollType === 'g'">
                  <label :for="`signal-minus-${props.scope}`">-</label>
                </div>
                <div class="signal-mod">
                  <input type="radio" v-model="modSignal" value="+" :name="`signal-mod-${props.scope}`" :id="`signal-plus-${props.scope}`" :disabled="rollType === 'g'">
                  <label :for="`signal-plus-${props.scope}`">+</label>
                </div>
              </div>
              <input class="attribute-item" v-model="mod" type="number" :id="`dice-mod-${props.scope}`" name="dice-mod" min="0" :disabled="rollType === 'g'" />
            </div>
          </div>
          <div class="attribute-container">
            <label :for="`roll-type-${props.scope}`">Rolagem</label>
            <select v-model="rollType" name="roll-type" :id="`roll-type-${props.scope}`">
              <option value="s">Soma</option>
              <option value="h">Maior</option>
              <option value="l">Menor</option>
              <option value="g">Separado</option>
            </select>
          </div>
        </div>
        <div class="dice-pool" v-if="diceGroups.length">
          <div class="dice-pool-item" v-for="(group, index) in diceGroups" :key="index">
            <span>{{group.quantity}}d{{group.faces}}</span>
            <button type="button" class="dice-pool-remove" title="Remover dado" @click.prevent="removeDice(index)">&times;</button>
          </div>
        </div>
        <div class="hidden-roll">
          <input :id="`dice-coin-${props.scope}`" type="checkbox" v-model="coin">
          <label :for="`dice-coin-${props.scope}`">d2 como cara ou coroa</label>
        </div>
        <div v-if="session.isOwner.value" class="hidden-roll">
          <input :id="`dice-hidden-${props.scope}`" type="checkbox" v-model="hidden">
          <label :for="`dice-hidden-${props.scope}`">Rolagem escondida (só o mestre vê)</label>
        </div>
        <div class="roll-buttons">
          <button type="button" class="roll-button" @click.prevent="addDice">Adicionar dado</button>
          <button type="button" class="roll-button" :disabled="rolling || !session.canRoll.value" @click.prevent="rollDice">Rolar</button>
        </div>
        <p v-if="!session.canRoll.value" class="roll-blocked">{{ session.inRoom.value ? 'O mestre desativou as rolagens dos jogadores nesta sala.' : 'Você saiu da sala: este rolador não está mais conectado.' }}</p>
      </div>
    </fieldset>
    <fieldset class="history-fieldset">
      <legend>Histórico{{ isRoom ? ' da sala' : '' }}</legend>
      <div class="history-container">
        <div class="last-rolls">
          <p v-if="!session.rolls.value.length" class="empty">Nenhuma rolagem ainda.</p>
          <div class="roll-result" v-for="roll in session.rolls.value" :key="roll.id" @click="showRoll(roll)">
            <div class="roll-head">
              <span v-if="rollSummaryParts(roll).length === 1" class="roll-total">{{ rollSummaryParts(roll)[0] }}</span>
              <span v-else class="roll-parts"><span v-for="part in rollSummaryParts(roll)" :key="part">{{ part }}</span></span>
              <span class="roll-meta">
                {{ roll.by }} · {{ roll.input }}<template v-if="roll.type !== 's'"> ({{ rollTypeLabel(roll.type) }})</template>
                · {{ formatTime(roll.at) }}<strong v-if="roll.hidden"> · escondida</strong>
              </span>
            </div>
            <div class="roll-dice">
              <span v-for="(value, i) in roll.rolls" :key="i" class="roll-die" :class="{ dropped: roll.dropped[i] }">
                <DiceFace :faces="roll.faces[i]!" :size="24" :dropped="roll.dropped[i]" />
                <span>{{ dieText(roll, roll.faces[i]!, value) }}</span>
              </span>
            </div>
          </div>
        </div>
        <button v-if="!isRoom || session.isOwner.value" type="button" @click.prevent="clearHistory">Limpar Histórico</button>
      </div>
    </fieldset>
  </section>
</template>

<style lang="css" scoped>
.dice-roller-container {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  width: 100%;
  height: 100%;
  min-height: 0;
}
fieldset { margin: 0; }
.dice-selector-fieldset {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--sp-2);
}
.dice-selector-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2);
  min-width: 0;
}
.dice-selector-button.selected { box-shadow: var(--bevel-sunken); }
.roll-set { display: flex; flex-direction: column; gap: var(--sp-3); }
.dice-settings-container {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  gap: var(--sp-3);
}
.attribute-container { display: flex; flex-direction: column; gap: var(--sp-2); align-items: center; }
.value-modifier { display: flex; align-items: center; gap: var(--sp-2); }
.attribute-item { width: 3.5rem; text-align: center; height: 2rem; padding: var(--sp-2); }
select { height: 2rem; }
.roll-buttons { display: flex; gap: var(--sp-3); }
.roll-button { flex: 1; height: 2rem; }
.dice-pool { display: flex; flex-wrap: wrap; gap: var(--sp-3); }
.dice-pool-item {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-3);
  background-color: var(--c-surface-light);
  box-shadow: var(--bevel-thin-raised);
}
.dice-pool-remove { min-width: auto; min-height: auto; width: 1.25rem; height: 1.25rem; padding: 0; line-height: 1; }
.roll-blocked { margin: 0; color: var(--c-text-disabled); }
.hidden-roll { display: flex; align-items: center; gap: var(--sp-3); }
.history-fieldset { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.history-container { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: var(--sp-2); }
.last-rolls {
  flex: 1;
  min-height: 6rem;
  overflow-y: auto;
  background-color: var(--c-window);
  box-shadow: var(--bevel-sunken);
  padding: var(--sp-2);
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
.empty { margin: 0; color: var(--c-text-disabled); text-align: center; }
.roll-result {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding: var(--sp-2);
  background-color: var(--c-tooltip);
  box-shadow: var(--bevel-thin-sunken);
  cursor: pointer;
}
.roll-head { display: flex; align-items: baseline; gap: var(--sp-3); }
.roll-total { font-size: var(--fs-2); line-height: var(--lh-heading); min-width: 2ch; }
.roll-meta { color: var(--c-text); }
.roll-parts { display: flex; flex-direction: column; font-weight: bold; }
.roll-dice { display: flex; flex-wrap: wrap; gap: var(--sp-3); }
.roll-die { display: inline-flex; align-items: center; gap: var(--sp-2); }
.roll-die.dropped { color: var(--c-text-disabled); }
</style>
