<script setup lang="ts">
import { iconUrl, type IconName } from '~/utils/icons'
import {rollDiceGroups, type DiceGroup, type DiceType, type ModSignal, type RollResult, type RollType} from "~~/lib/rollDice.ts";

const quantity = ref(1)
const dice = ref('4')
const mod = ref(0)
const modSignal = ref<ModSignal>('+')
const rollType = ref<RollType>('s')
const validDice = ['4', '6', '8', '10', '12', '20']
const diceIcon = (d: string) => iconUrl(`d${d}` as IconName)
const lastRolls = ref<RollResult[]>([])
const rollResult = ref<RollResult | null>(null)
const diceGroups = ref<DiceGroup[]>([])

function addDice() {
  diceGroups.value.push({ quantity: Number(quantity.value), faces: Number(dice.value) as DiceType })
}

function removeDice(index: number) {
  diceGroups.value.splice(index, 1)
}

function clearDiceGroups() {
  diceGroups.value = []
}

function rollDice() {
  const groups = diceGroups.value.length > 0
      ? diceGroups.value
      : [{ quantity: Number(quantity.value), faces: Number(dice.value) as DiceType }]
  const newRoll = rollDiceGroups(groups, rollType.value, Number(mod.value), modSignal.value)
  rollResult.value = newRoll
  lastRolls.value.unshift(newRoll)
}

function clearRollHistory() {
  lastRolls.value = []
  rollResult.value = null
}

function rollTypeLabel(type: RollType) {
  return type === 's' ? 'Soma' : type === 'h' ? 'Maior' : 'Menor'
}
</script>
<template>
  <section class="dice-roller-container">
    <div class="dice-selector">
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
          <img :src="diceIcon(d)" alt="" class="dice-icon">
          <span>D{{ d }}</span>
        </button>
      </fieldset>
    </div>
    <div class="modifiers">
      <fieldset class="modifiers-fieldset">
        <legend>Configurações</legend>
        <div class="roll-set">
          <fieldset class="dice-settings-container">
            <div class="attribute-container">
              <label for="dice-quantity">Qtde</label>
              <div class="value-modifier">
                <input class="attribute-item" v-model="quantity" type="number" id="dice-quantity" name="quantity" min="1" size="2" />
              </div>
            </div>
            <div class="attribute-container">
              <label for="dice-faces">Faces</label>
              <div class="value-modifier">
                <input class="attribute-item" v-model="dice" type="text" disabled id="dice-faces" name="dice-faces" min="1" size="4" />
              </div>
            </div>
            <div class="attribute-container">
              <label for="dice-mod">Mod</label>
              <div class="value-modifier">
                <div class="signal-mod-container">
                  <div class="signal-mod">
                    <input type="radio" v-model="modSignal" value="-" name="signal-mod" id="signal-minus">
                    <label for="signal-minus">-</label>
                  </div>
                  <div class="signal-mod">
                    <input type="radio" v-model="modSignal" value="+" name="signal-mod" id="signal-plus">
                    <label for="signal-plus">+</label>
                  </div>
                </div>
                <input class="attribute-item" v-model="mod" type="number" id="dice-mod" name="dice-mod" min="1" size="4" />
              </div>
            </div>
            <div class="attribute-container">
              <label for="dice-faces">Rolagem</label>
              <div class="value-modifier">
                <select v-model="rollType" name="roll-type" id="roll-type">
                  <option value="s">Soma</option>
                  <option value="h">Maior</option>
                  <option value="l">Menor</option>
                </select>
              </div>
            </div>
          </fieldset>
          <div class="dice-pool" v-if="diceGroups.length">
            <div class="dice-pool-item" v-for="(group, index) in diceGroups" :key="index">
              <span>{{group.quantity}}d{{group.faces}}</span>
              <button type="button" class="dice-pool-remove" title="Remover dado" @click.prevent="removeDice(index)">&times;</button>
            </div>
          </div>
          <button type="button" class="roll-button" @click.prevent="addDice">Adicionar dado</button>
          <button type="button" class="roll-button" @click.prevent="rollDice">Rolar</button>
        </div>
      </fieldset>
      <fieldset>
        <legend>Resultado</legend>
        <div class="result-container">
          <span style="font-size: var(--fs-3)">{{rollResult ? rollResult.result : '—'}}</span>
        </div>
      </fieldset>
      <fieldset>
        <legend>Histórico</legend>
        <div class="history-container">
          <div class="last-rolls">
            <div class="roll-result" v-for="(roll, index) in lastRolls" :key="index">
              <span class="result">Resultado: {{roll.result}}</span>
              <span class="rolls">Dados rolados: {{roll.rolls.join(', ')}}</span>
              <span class="input">Formula: {{roll.input}}</span>
              <span class="roll-type">Tipo: {{rollTypeLabel(roll.type)}}</span>
            </div>
          </div>
          <button @click.prevent="clearRollHistory">Limpar Histórico</button>
        </div>
      </fieldset>
    </div>
  </section>
</template>
<style lang="css" scoped>
.dice-roller-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  .dice-selector{
    display: flex;
    gap: 0.25rem;
    .dice-selector-fieldset {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
    }
    .dice-selector-button {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      padding: 0.5rem;
    }
    .dice-selector-button.selected {
      box-shadow: var(--bevel-sunken);
    }
    .dice-icon {
      width: 48px;
      height: 48px;
    }
  }
  .modifiers {
    width: 100%;
    .modifiers-fieldset {
      .roll-set {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        .dice-settings-container {
          display: flex;
          flex-direction: row;
          justify-content: space-around;
          .attribute-container {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
            align-items: center;
            .value-modifier {
              display: flex;
              .attribute-item {
                width: 3rem;
                text-align: center;
                font-size: var(--fs-2);
                height: 2.5rem;
                padding: 0.25rem;
              }
              select {
                font-size: var(--fs-2);
                height: 2.5rem;
              }
            }
          }
        }
        .roll-button {
          font-size: var(--fs-2);
          height: 2.5rem;
          width: 100%;
        }
        .dice-pool {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          .dice-pool-item {
            display: flex;
            align-items: center;
            gap: 0.35rem;
            padding: 0.25rem 0.5rem;
            font-size: var(--fs-1);
            background-color: #dfdfdf;
            border: 2px solid;
            border-color: #ffffff #808080 #808080 #ffffff;
            .dice-pool-remove {
              min-width: auto;
              min-height: auto;
              width: 1.25rem;
              height: 1.25rem;
              padding: 0;
              line-height: 1;
              font-size: var(--fs-1);
            }
          }
        }
      }
    }
  }
  .result-container {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: var(--fs-3);
  }
  .history-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    .last-rolls {
      overflow-y: scroll;
      width: 100%;
      border: 2px solid;
      border-color: #808080 #dfdfdf #dfdfdf #808080;
      background-color: #efefef;
      min-height: 8rem;
      max-height: 8rem;
      padding: 0.25rem;
      align-items: center;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      .roll-result {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        padding: 0.25rem;
        border: 1px solid #050400;
        background-color: #feffe0;
        border-radius: 0.25rem;
        width: 95%;
      }
    }
  }
}
@media screen and (min-width: 768px) {

}
</style>